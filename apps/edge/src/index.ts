import { Hono } from "hono";
import { cors } from "hono/cors";
import { sourceConfigSchema, resolverRequestSchema, syncEnvelopeSchema } from "@marstv/contracts";
import { can } from "@marstv/domain";
import type { Env, JobMessage, Variables } from "./env";
import { fetchDetail, probeSource, searchSources } from "./aggregate";
import { PairingCoordinator, RateLimiter, SyncCoordinator } from "./durable";
import {
  authenticatePasskey,
  authenticateRecoveryCode,
  authenticationOptions,
  issueRecoveryCodes,
  registerPasskey,
  registrationOptions
} from "./auth";
import { processJob } from "./jobs";
import { Repository } from "./repository";
import { assertAllowedUrl, guardedFetch, randomToken, redactLog, sha256 } from "./security";

export { PairingCoordinator, RateLimiter, SyncCoordinator };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

function apiError(requestId: string, status: number, code: string, message: string, details?: unknown): Response {
  return Response.json({ error: { code, message, requestId, details } }, { status });
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

app.use("*", async (context, next) => {
  const requestId = context.req.header("x-request-id") ?? crypto.randomUUID();
  context.set("requestId", requestId);
  const repository = new Repository(context.env);
  const token = bearerToken(context.req.raw);
  context.set("session", token ? await repository.sessionFromToken(token) : null);
  const started = performance.now();
  await next();
  context.header("x-request-id", requestId);
  context.header("x-content-type-options", "nosniff");
  context.header("referrer-policy", "no-referrer");
  context.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
  console.log(JSON.stringify(redactLog({
    requestId,
    route: new URL(context.req.url).pathname,
    method: context.req.method,
    status: context.res.status,
    durationMs: Math.round(performance.now() - started)
  })));
});

app.use("/v1/*", cors({
  origin: (origin, context) => origin === context.env.MARSTV_PUBLIC_ORIGIN ? origin : null,
  credentials: true,
  allowHeaders: ["authorization", "content-type", "x-request-id"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  maxAge: 86_400
}));

app.get("/healthz", (context) => context.json({
  status: "ok",
  service: "marstv-edge",
  version: "1.0.0",
  time: new Date().toISOString()
}));

app.get("/v1/health", async (context) => {
  const database = await context.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return context.json({
    status: database?.ok === 1 ? "healthy" : "degraded",
    bindings: {
      d1: database?.ok === 1,
      kv: true,
      queue: true,
      r2: true
    },
    metadata: {
      doubanEnabled: context.env.MARSTV_DOUBAN_ENABLED === "true"
        && Boolean(context.env.MARSTV_DOUBAN_LEGAL_APPROVAL_ID)
    }
  });
});

app.post("/v1/auth/bootstrap", async (context) => {
  const requestId = context.get("requestId");
  const token = context.req.header("x-marstv-bootstrap-token");
  if (!token || token !== context.env.MARSTV_BOOTSTRAP_TOKEN) {
    return apiError(requestId, 403, "BOOTSTRAP_DENIED", "Bootstrap token is invalid.");
  }
  const existing = await context.env.DB.prepare("SELECT id FROM users LIMIT 1").first<{ id: string }>();
  if (existing) return apiError(requestId, 409, "BOOTSTRAP_COMPLETE", "The instance already has an owner.");

  const body: { displayName?: string } = await context.req
    .json<{ displayName?: string }>()
    .catch(() => ({} as { displayName?: string }));
  const householdId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "INSERT INTO households (id, name, created_at) VALUES (?1, ?2, ?3)"
    ).bind(householdId, "MarsTV Home", now),
    context.env.DB.prepare(`
      INSERT INTO users (id, household_id, display_name, role, created_at)
      VALUES (?1, ?2, ?3, 'owner', ?4)
    `).bind(userId, householdId, body.displayName?.trim() || "Owner", now)
  ]);
  const session = await new Repository(context.env).createSession({
    userId,
    householdId,
    role: "owner"
  });
  return context.json({ userId, householdId, ...session }, 201);
});

app.post("/v1/auth/passkeys/register/options", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  try {
    return context.json(await registrationOptions(context.env, session));
  } catch (error) {
    return apiError(context.get("requestId"), 400, "PASSKEY_OPTIONS_FAILED", error instanceof Error ? error.message : "Unable to create passkey options.");
  }
});

app.post("/v1/auth/passkeys/register/verify", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  try {
    const body = await context.req.json<{ response: Parameters<typeof registerPasskey>[2] }>();
    return context.json(await registerPasskey(context.env, session, body.response), 201);
  } catch (error) {
    return apiError(context.get("requestId"), 400, "PASSKEY_REGISTRATION_FAILED", error instanceof Error ? error.message : "Passkey registration failed.");
  }
});

app.post("/v1/auth/passkeys/authenticate/options", async (context) => {
  try {
    return context.json(await authenticationOptions(context.env));
  } catch (error) {
    return apiError(context.get("requestId"), 400, "PASSKEY_OPTIONS_FAILED", error instanceof Error ? error.message : "Unable to create passkey options.");
  }
});

app.post("/v1/auth/passkeys/authenticate/verify", async (context) => {
  try {
    const body = await context.req.json<{
      requestId: string;
      response: Parameters<typeof authenticatePasskey>[2];
    }>();
    return context.json(await authenticatePasskey(context.env, body.requestId, body.response));
  } catch (error) {
    return apiError(context.get("requestId"), 401, "PASSKEY_AUTHENTICATION_FAILED", error instanceof Error ? error.message : "Passkey authentication failed.");
  }
});

app.post("/v1/auth/recovery-codes", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  return context.json({ codes: await issueRecoveryCodes(context.env, session) }, 201);
});

app.post("/v1/auth/recovery", async (context) => {
  const body: { code?: string } = await context.req.json<{ code?: string }>().catch(() => ({}));
  if (!body.code) return apiError(context.get("requestId"), 400, "RECOVERY_CODE_REQUIRED", "A recovery code is required.");
  try {
    return context.json(await authenticateRecoveryCode(context.env, body.code));
  } catch {
    return apiError(context.get("requestId"), 401, "RECOVERY_CODE_INVALID", "The recovery code is invalid or has already been used.");
  }
});

app.use("/v1/sources/*", async (context, next) => {
  const requestId = context.get("requestId");
  const session = context.get("session");
  if (!session) return apiError(requestId, 401, "AUTH_REQUIRED", "Authentication is required.");
  if (!can(session.role, context.req.method === "GET" ? "source:read" : "source:write")) {
    return apiError(requestId, 403, "PERMISSION_DENIED", "This role cannot manage shared sources.");
  }
  await next();
});

app.get("/v1/sources", async (context) => {
  const repository = new Repository(context.env);
  const sources = await repository.listSources();
  const result = await Promise.all(sources.map(async (source) => ({
    ...source,
    headers: Object.fromEntries(Object.keys(source.headers).map((key) => [key, "••••••••"])),
    health: await repository.health(source.id)
  })));
  return context.json(result);
});

app.put("/v1/sources/:id", async (context) => {
  const requestId = context.get("requestId");
  const parsed = sourceConfigSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success || parsed.data.id !== context.req.param("id")) {
    return apiError(requestId, 400, "SOURCE_INVALID", "Source configuration is invalid.", parsed.error?.flatten());
  }
  try {
    const base = new URL(parsed.data.baseUrl);
    assertAllowedUrl(parsed.data.baseUrl, [...new Set([base.hostname, ...parsed.data.allowedHosts])]);
    const repository = new Repository(context.env);
    const source = await repository.saveSource(parsed.data);
    await repository.audit(context.get("session"), "source.saved", source.id, requestId);
    await context.env.JOBS.send({ id: crypto.randomUUID(), type: "source.probe", sourceId: source.id });
    return context.json(source);
  } catch (error) {
    return apiError(requestId, 400, "SOURCE_REJECTED", error instanceof Error ? error.message : "Source rejected.");
  }
});

app.delete("/v1/sources/:id", async (context) => {
  const repository = new Repository(context.env);
  await repository.deleteSource(context.req.param("id"));
  await repository.audit(context.get("session"), "source.deleted", context.req.param("id"), context.get("requestId"));
  return new Response(null, { status: 204 });
});

app.post("/v1/sources/:id/probe", async (context) => {
  const source = await new Repository(context.env).getSource(context.req.param("id"));
  if (!source) return apiError(context.get("requestId"), 404, "SOURCE_NOT_FOUND", "Source not found.");
  return context.json(await probeSource(context.env, source));
});

app.get("/v1/search", async (context) => {
  const query = context.req.query("q")?.trim() ?? "";
  if (query.length < 1 || query.length > 120) {
    return apiError(context.get("requestId"), 400, "SEARCH_QUERY_INVALID", "Query must contain 1 to 120 characters.");
  }
  const rateId = context.env.RATE_LIMITER.idFromName(context.req.header("cf-connecting-ip") ?? "anonymous");
  const limited = await context.env.RATE_LIMITER.get(rateId).fetch("https://rate.local/take", {
    method: "POST",
    body: JSON.stringify({ limit: 60, windowMs: 60_000 })
  });
  if (!limited.ok) return apiError(context.get("requestId"), 429, "RATE_LIMITED", "Too many search requests.");
  const sources = await new Repository(context.env).listSources();
  return context.json(await searchSources(context.env, sources, query, context.get("requestId")));
});

app.get("/v1/catalog/items/:sourceId/:itemId", async (context) => {
  const repository = new Repository(context.env);
  const source = await repository.getSource(context.req.param("sourceId"));
  if (!source || !source.enabled) {
    return apiError(context.get("requestId"), 404, "SOURCE_NOT_FOUND", "Source not found.");
  }
  try {
    const detail = await fetchDetail(source, context.req.param("itemId"));
    await context.env.JOBS.send({
      id: crypto.randomUUID(),
      type: "metadata.enrich",
      sourceId: source.id,
      sourceItemId: detail.sourceItemId,
      title: detail.title
    });
    return context.json(detail);
  } catch (error) {
    return apiError(
      context.get("requestId"),
      502,
      "SOURCE_DETAIL_FAILED",
      error instanceof Error ? error.message : "Unable to load source detail."
    );
  }
});

app.post("/v1/playback/resolve", async (context) => {
  const parsed = resolverRequestSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(context.get("requestId"), 400, "PLAYBACK_REQUEST_INVALID", "Playback request is invalid.");
  }
  const source = await new Repository(context.env).getSource(parsed.data.sourceId);
  if (!source || !source.enabled) {
    return apiError(context.get("requestId"), 404, "SOURCE_NOT_FOUND", "Source not found.");
  }
  try {
    const sourceHosts = [...new Set([new URL(source.baseUrl).hostname, ...source.allowedHosts])];
    if (source.resolver) {
      const connectorUrl = assertAllowedUrl(source.resolver.endpoint, source.resolver.allowedHosts);
      const connector = await guardedFetch(connectorUrl.toString(), {
        allowedHosts: source.resolver.allowedHosts,
        timeoutMs: source.resolver.timeoutMs,
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(parsed.data),
        maxBytes: 500_000
      });
      const manifest = JSON.parse(connector.body) as { url?: string };
      if (!manifest.url) throw new Error("RESOLVER_RESPONSE_INVALID");
      assertAllowedUrl(manifest.url, sourceHosts);
      return context.json(manifest);
    }
    const mediaUrl = assertAllowedUrl(parsed.data.episodeUrl, sourceHosts);
    const pathname = mediaUrl.pathname.toLocaleLowerCase();
    const protocol = pathname.endsWith(".m3u8")
      ? "hls"
      : pathname.endsWith(".mpd")
        ? "dash"
        : "progressive";
    return context.json({
      protocol,
      url: mediaUrl.toString(),
      headers: {},
      expiresAt: null,
      subtitles: [],
      audioTracks: []
    });
  } catch (error) {
    return apiError(
      context.get("requestId"),
      400,
      "PLAYBACK_REJECTED",
      error instanceof Error ? error.message : "Playback URL was rejected."
    );
  }
});

app.post("/v1/pairing/start", async (context) => {
  const pairingId = randomToken(12);
  const id = context.env.PAIRING.idFromName(pairingId);
  const response = await context.env.PAIRING.get(id).fetch("https://pair.local/start", { method: "POST" });
  const payload = await response.json<{ code: string; secret: string; expiresAt: number }>();
  await context.env.CACHE.put(`pairing-code:${payload.code}`, pairingId, { expirationTtl: 300 });
  return context.json({ pairingId, ...payload }, 201);
});

async function completePairing(
  env: Env,
  session: NonNullable<Variables["session"]>,
  pairingId: string,
  body: { code: string; deviceName?: string; platform?: string },
  requestId: string
): Promise<Response> {
  const deviceId = crypto.randomUUID();
  const repository = new Repository(env);
  const issued = await repository.createSession({
    userId: session.userId,
    householdId: session.householdId,
    role: session.role,
    deviceId
  });
  const id = env.PAIRING.idFromName(pairingId);
  const response = await env.PAIRING.get(id).fetch("https://pair.local/claim", {
    method: "POST",
    body: JSON.stringify({ code: body.code, userId: session.userId, sessionToken: issued.token })
  });
  if (!response.ok) {
    await env.DB.prepare("UPDATE sessions SET revoked_at = ?1 WHERE token_hash = ?2")
      .bind(new Date().toISOString(), await sha256(issued.token)).run();
    return new Response(response.body, response);
  }
  await env.DB.prepare(`
    INSERT INTO devices (id, household_id, user_id, name, platform, last_seen_at, revoked_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL)
  `).bind(
    deviceId,
    session.householdId,
    session.userId,
    body.deviceName?.trim() || "MarsTV device",
    body.platform?.trim() || "unknown",
    new Date().toISOString()
  ).run();
  await repository.audit(session, "device.paired", deviceId, requestId);
  await env.CACHE.delete(`pairing-code:${body.code}`);
  return new Response(response.body, response);
}

app.post("/v1/pairing/claim", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  const body = await context.req.json<{ code: string; deviceName?: string; platform?: string }>();
  const pairingId = await context.env.CACHE.get(`pairing-code:${body.code}`);
  if (!pairingId) return apiError(context.get("requestId"), 403, "PAIRING_CODE_INVALID", "Pairing code is invalid or expired.");
  return completePairing(context.env, session, pairingId, body, context.get("requestId"));
});

app.post("/v1/pairing/:pairingId/claim", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  const body = await context.req.json<{ code: string; deviceName?: string; platform?: string }>();
  return completePairing(
    context.env,
    session,
    context.req.param("pairingId"),
    body,
    context.get("requestId")
  );
});

app.post("/v1/pairing/:pairingId/consume", async (context) => {
  const id = context.env.PAIRING.idFromName(context.req.param("pairingId"));
  const response = await context.env.PAIRING.get(id).fetch("https://pair.local/consume", {
    method: "POST",
    body: JSON.stringify(await context.req.json())
  });
  return new Response(response.body, response);
});

app.post("/v1/sync/push", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  const parsed = syncEnvelopeSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success || parsed.data.householdId !== session.householdId) {
    return apiError(context.get("requestId"), 400, "SYNC_ENVELOPE_INVALID", "Sync envelope is invalid.");
  }
  const id = context.env.SYNC.idFromName(session.householdId);
  const response = await context.env.SYNC.get(id).fetch("https://sync.local/push", {
    method: "POST",
    body: JSON.stringify(parsed.data)
  });
  const envelope = await response.json();
  await new Repository(context.env).syncRecords(session.householdId, parsed.data.records);
  return context.json(envelope);
});

app.get("/v1/profiles", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  const rows = await context.env.DB.prepare(`
    SELECT id, user_id, name, kind, rating_limit, avatar_key, created_at, updated_at
    FROM profiles WHERE household_id = ?1 ORDER BY created_at
  `).bind(session.householdId).all();
  return context.json(rows.results);
});

app.post("/v1/profiles", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  if (!can(session.role, "profile:write")) {
    return apiError(context.get("requestId"), 403, "PERMISSION_DENIED", "This role cannot create profiles.");
  }
  const body = await context.req.json<{
    name?: string;
    kind?: "adult" | "child";
    ratingLimit?: string | null;
    pin?: string | null;
    avatarKey?: string;
  }>();
  if (!body.name?.trim() || !body.kind) {
    return apiError(context.get("requestId"), 400, "PROFILE_INVALID", "Name and kind are required.");
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const pinHash = body.kind === "child" && body.pin
    ? await sha256(body.pin)
    : null;
  await context.env.DB.prepare(`
    INSERT INTO profiles
      (id, household_id, user_id, name, kind, rating_limit, pin_hash, avatar_key, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
  `).bind(
    id,
    session.householdId,
    session.userId,
    body.name.trim(),
    body.kind,
    body.ratingLimit ?? null,
    pinHash,
    body.avatarKey || "default",
    now
  ).run();
  await new Repository(context.env).audit(session, "profile.created", id, context.get("requestId"));
  return context.json({
    id,
    user_id: session.userId,
    name: body.name.trim(),
    kind: body.kind,
    rating_limit: body.ratingLimit ?? null,
    avatar_key: body.avatarKey || "default",
    created_at: now,
    updated_at: now
  }, 201);
});

app.get("/v1/devices", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  const privileged = session.role === "owner" || session.role === "admin";
  const result = privileged
    ? await context.env.DB.prepare(`
        SELECT id, user_id, name, platform, last_seen_at, revoked_at
        FROM devices WHERE household_id = ?1 ORDER BY last_seen_at DESC
      `).bind(session.householdId).all()
    : await context.env.DB.prepare(`
        SELECT id, user_id, name, platform, last_seen_at, revoked_at
        FROM devices WHERE household_id = ?1 AND user_id = ?2 ORDER BY last_seen_at DESC
      `).bind(session.householdId, session.userId).all();
  return context.json(result.results);
});

app.post("/v1/devices/:deviceId/revoke", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  const device = await context.env.DB.prepare(`
    SELECT user_id FROM devices WHERE id = ?1 AND household_id = ?2
  `).bind(context.req.param("deviceId"), session.householdId).first<{ user_id: string }>();
  if (!device) return apiError(context.get("requestId"), 404, "DEVICE_NOT_FOUND", "Device not found.");
  if (device.user_id !== session.userId && session.role !== "owner" && session.role !== "admin") {
    return apiError(context.get("requestId"), 403, "PERMISSION_DENIED", "This role cannot revoke that device.");
  }
  const now = new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare("UPDATE devices SET revoked_at = ?1 WHERE id = ?2").bind(now, context.req.param("deviceId")),
    context.env.DB.prepare("UPDATE sessions SET revoked_at = ?1 WHERE device_id = ?2").bind(now, context.req.param("deviceId"))
  ]);
  await new Repository(context.env).audit(session, "device.revoked", context.req.param("deviceId"), context.get("requestId"));
  return new Response(null, { status: 204 });
});

app.get("/v1/audit", async (context) => {
  const session = context.get("session");
  if (!session) return apiError(context.get("requestId"), 401, "AUTH_REQUIRED", "Authentication is required.");
  if (!can(session.role, "audit:read")) {
    return apiError(context.get("requestId"), 403, "PERMISSION_DENIED", "This role cannot read audit events.");
  }
  const result = await context.env.DB.prepare(`
    SELECT id, actor_user_id, action, subject, request_id, created_at
    FROM audit_events WHERE household_id = ?1 ORDER BY created_at DESC LIMIT 200
  `).bind(session.householdId).all();
  return context.json(result.results);
});

app.get("/v1/backups", async (context) => {
  const session = context.get("session");
  if (!session || session.role !== "owner") {
    return apiError(context.get("requestId"), 403, "PERMISSION_DENIED", "Only the Owner can list backups.");
  }
  const listed = await context.env.BACKUPS.list({ prefix: "backups/", limit: 100 });
  return context.json(listed.objects.map((object) => ({
    id: object.key,
    size: object.size,
    uploaded: object.uploaded.toISOString()
  })));
});

app.post("/v1/backups", async (context) => {
  const session = context.get("session");
  if (!session || session.role !== "owner") {
    return apiError(context.get("requestId"), 403, "PERMISSION_DENIED", "Only the Owner can create backups.");
  }
  const job: JobMessage = { id: crypto.randomUUID(), type: "backup.create", reason: "manual" };
  await context.env.JOBS.send(job);
  return context.json({ jobId: job.id, state: "queued" }, 202);
});

app.post("/v1/backups/:backupId/restore", async (context) => {
  const session = context.get("session");
  if (!session || session.role !== "owner") {
    return apiError(context.get("requestId"), 403, "PERMISSION_DENIED", "Only the Owner can restore backups.");
  }
  const backupId = decodeURIComponent(context.req.param("backupId"));
  if (!backupId.startsWith("backups/") || !backupId.endsWith(".marstv")) {
    return apiError(context.get("requestId"), 400, "BACKUP_ID_INVALID", "Backup identifier is invalid.");
  }
  const job: JobMessage = {
    id: crypto.randomUUID(),
    type: "backup.restore",
    backupId,
    requestedBy: context.get("requestId")
  };
  await context.env.JOBS.send(job);
  await new Repository(context.env).audit(session, "backup.restore_queued", backupId, context.get("requestId"));
  return context.json({ jobId: job.id, state: "queued" }, 202);
});

app.notFound((context) => {
  if (new URL(context.req.url).pathname.startsWith("/v1/")) {
    return apiError(context.get("requestId"), 404, "NOT_FOUND", "API route not found.");
  }
  return context.env.ASSETS.fetch(context.req.raw);
});

app.onError((error, context) => {
  console.error(JSON.stringify(redactLog({
    requestId: context.get("requestId"),
    route: new URL(context.req.url).pathname,
    method: context.req.method,
    status: 500,
    errorCode: error instanceof Error ? error.message : "INTERNAL_ERROR"
  })));
  return apiError(context.get("requestId"), 500, "INTERNAL_ERROR", "An unexpected error occurred.");
});

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processJob(env, message.body);
        message.ack();
      } catch {
        message.retry();
      }
    }
  },
  async scheduled(event: ScheduledController, env: Env, context: ExecutionContext): Promise<void> {
    context.waitUntil((async () => {
      const repository = new Repository(env);
      if (event.cron === "*/15 * * * *") {
        const sources = await repository.listSources();
        await env.JOBS.sendBatch(sources.filter((source) => source.enabled).map((source) => ({
          body: { id: crypto.randomUUID(), type: "source.probe", sourceId: source.id } satisfies JobMessage
        })));
      } else {
        await env.JOBS.send({
          id: crypto.randomUUID(),
          type: "backup.create",
          reason: "scheduled"
        });
      }
    })());
  }
};
