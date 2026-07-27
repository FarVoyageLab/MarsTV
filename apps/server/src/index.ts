import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { resolverRequestSchema, sourceConfigSchema, syncEnvelopeSchema } from "@marstv/contracts";
import { dedupeMedia } from "@marstv/domain";
import { macCmsUrl, parseMacCmsDetail, parseMacCmsPayload } from "@marstv/maccms";
import { mergeRecords, nextCursor } from "@marstv/sync";
import {
  authenticatePasskey,
  authenticationOptions,
  registerPasskey,
  registrationOptions
} from "./auth";
import { decrypt, encrypt, NodeStore, type ServerPrincipal } from "./store";
import { assertAllowedUrl, guardedFetch } from "./security";

const store = new NodeStore();
const app = new Hono<{ Variables: { requestId: string; session: ServerPrincipal | null } }>();

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

app.use("*", cors({
  origin: process.env.MARSTV_PUBLIC_ORIGIN || "http://localhost:4173",
  credentials: true
}));

app.use("*", async (context, next) => {
  context.set("requestId", context.req.header("x-request-id") || randomUUID());
  const token = bearerToken(context.req.raw);
  context.set("session", token ? store.session(token) : null);
  await next();
  context.header("x-request-id", context.get("requestId"));
  context.header("x-content-type-options", "nosniff");
});

app.get("/healthz", (context) => context.json({
  status: "ok",
  service: "marstv-server",
  runtime: "node",
  version: "1.0.0"
}));

app.get("/v1/health", (context) => context.json({
  status: "healthy",
  runtime: "node",
  bindings: {
    sqlite: true,
    queue: false,
    objectStorage: "filesystem"
  },
  metadata: {
    doubanEnabled: false
  }
}));

app.post("/v1/auth/bootstrap", async (context) => {
  if (context.req.header("x-marstv-bootstrap-token") !== process.env.MARSTV_BOOTSTRAP_TOKEN) {
    return context.json({ error: { code: "BOOTSTRAP_DENIED", message: "Bootstrap token is invalid.", requestId: context.get("requestId") } }, 403);
  }
  try {
    const body: { displayName?: string } = await context.req.json().catch(() => ({}));
    return context.json(store.bootstrap(body.displayName || "Owner"), 201);
  } catch (error) {
    const conflict = error instanceof Error && error.message === "BOOTSTRAP_COMPLETE";
    return context.json({
      error: {
        code: conflict ? "BOOTSTRAP_COMPLETE" : "BOOTSTRAP_FAILED",
        message: conflict ? "The instance already has an owner." : "Unable to initialize the instance.",
        requestId: context.get("requestId")
      }
    }, conflict ? 409 : 500);
  }
});

app.post("/v1/auth/passkeys/register/options", async (context) => {
  const session = context.get("session");
  if (!session) return context.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: context.get("requestId") } }, 401);
  return context.json(await registrationOptions(store, session));
});

app.post("/v1/auth/passkeys/register/verify", async (context) => {
  const session = context.get("session");
  if (!session) return context.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: context.get("requestId") } }, 401);
  const body = await context.req.json<{ response: Parameters<typeof registerPasskey>[2] }>();
  return context.json(await registerPasskey(store, session, body.response), 201);
});

app.post("/v1/auth/passkeys/authenticate/options", async (context) => {
  return context.json(await authenticationOptions(store));
});

app.post("/v1/auth/passkeys/authenticate/verify", async (context) => {
  const body = await context.req.json<{
    requestId: string;
    response: Parameters<typeof authenticatePasskey>[2];
  }>();
  return context.json(await authenticatePasskey(store, body.requestId, body.response));
});

app.post("/v1/auth/recovery-codes", (context) => {
  const session = context.get("session");
  if (!session) return context.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: context.get("requestId") } }, 401);
  const codes = Array.from({ length: 10 }, () => {
    const raw = randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/gu, "").toUpperCase().padEnd(8, "X").slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  store.replaceRecoveryCodes(session.userId, codes);
  return context.json({ codes }, 201);
});

app.post("/v1/auth/recovery", async (context) => {
  const body: { code?: string } = await context.req.json().catch(() => ({}));
  const recovered = body.code ? store.consumeRecoveryCode(body.code) : null;
  if (!recovered) {
    return context.json({ error: { code: "RECOVERY_CODE_INVALID", message: "The recovery code is invalid or already used.", requestId: context.get("requestId") } }, 401);
  }
  return context.json(store.createSession(recovered.userId, recovered.householdId, recovered.role));
});

app.post("/v1/pairing/start", (context) => context.json(store.createPairing(), 201));

app.post("/v1/pairing/claim", async (context) => {
  const session = context.get("session");
  if (!session) return context.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: context.get("requestId") } }, 401);
  const body = await context.req.json<{ code: string; deviceName?: string; platform?: string }>();
  const pairingId = store.pairingIdForCode(body.code);
  if (!pairingId) {
    return context.json({ error: { code: "PAIRING_CODE_INVALID", message: "Pairing code is invalid or expired.", requestId: context.get("requestId") } }, 403);
  }
  const deviceId = randomUUID();
  const issued = store.createSession(session.userId, session.householdId, session.role, deviceId);
  if (!store.claimPairing(pairingId, session.userId, issued.token)) {
    store.db.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ?").run(
      new Date().toISOString(),
      createHash("sha256").update(issued.token).digest("base64url")
    );
    return context.json({ error: { code: "PAIRING_ALREADY_CLAIMED", message: "Pairing was already claimed.", requestId: context.get("requestId") } }, 409);
  }
  store.db.prepare(`
    INSERT INTO devices (id, household_id, user_id, name, platform, last_seen_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `).run(
    deviceId,
    session.householdId,
    session.userId,
    body.deviceName?.trim() || "MarsTV device",
    body.platform?.trim() || "unknown",
    new Date().toISOString()
  );
  store.audit("device.paired", deviceId, context.get("requestId"));
  return context.json({ claimed: true });
});

app.post("/v1/pairing/:pairingId/claim", async (context) => {
  const session = context.get("session");
  if (!session) return context.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: context.get("requestId") } }, 401);
  const body = await context.req.json<{ code: string; deviceName?: string; platform?: string }>();
  if (!store.pairingForClaim(context.req.param("pairingId"), body.code)) {
    return context.json({ error: { code: "PAIRING_CODE_INVALID", message: "Pairing code is invalid or expired.", requestId: context.get("requestId") } }, 403);
  }
  const deviceId = randomUUID();
  const issued = store.createSession(session.userId, session.householdId, session.role, deviceId);
  if (!store.claimPairing(context.req.param("pairingId"), session.userId, issued.token)) {
    store.db.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ?").run(
      new Date().toISOString(),
      createHash("sha256").update(issued.token).digest("base64url")
    );
    return context.json({ error: { code: "PAIRING_ALREADY_CLAIMED", message: "Pairing was already claimed.", requestId: context.get("requestId") } }, 409);
  }
  store.db.prepare(`
    INSERT INTO devices (id, household_id, user_id, name, platform, last_seen_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `).run(
    deviceId,
    session.householdId,
    session.userId,
    body.deviceName?.trim() || "MarsTV device",
    body.platform?.trim() || "unknown",
    new Date().toISOString()
  );
  store.audit("device.paired", deviceId, context.get("requestId"));
  return context.json({ claimed: true });
});

app.post("/v1/pairing/:pairingId/consume", async (context) => {
  const body = await context.req.json<{ secret: string }>();
  const pairing = store.consumePairing(context.req.param("pairingId"), body.secret);
  if (!pairing) return context.json({ error: { code: "PAIRING_INVALID", message: "Pairing is invalid or expired.", requestId: context.get("requestId") } }, 410);
  return context.json(pairing, "pending" in pairing ? 202 : 200);
});

app.use("/v1/sources/*", async (context, next) => {
  const session = context.get("session");
  if (!session) return context.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: context.get("requestId") } }, 401);
  if (session.role !== "owner" && session.role !== "admin") {
    return context.json({ error: { code: "PERMISSION_DENIED", message: "This role cannot manage shared sources.", requestId: context.get("requestId") } }, 403);
  }
  await next();
});

app.get("/v1/sources", (context) => context.json(store.listSources().map((source) => ({
  ...source,
  headers: Object.fromEntries(Object.keys(source.headers).map((key) => [key, "••••••••"])),
  health: null
}))));

app.put("/v1/sources/:id", async (context) => {
  const parsed = sourceConfigSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success || parsed.data.id !== context.req.param("id")) {
    return context.json({ error: { code: "SOURCE_INVALID", message: "Source configuration is invalid.", requestId: context.get("requestId") } }, 400);
  }
  const base = new URL(parsed.data.baseUrl);
  assertAllowedUrl(parsed.data.baseUrl, [...new Set([base.hostname, ...parsed.data.allowedHosts])]);
  return context.json(store.saveSource(parsed.data));
});

app.delete("/v1/sources/:id", (context) => {
  store.deleteSource(context.req.param("id"));
  return new Response(null, { status: 204 });
});

app.get("/v1/search", async (context) => {
  const query = context.req.query("q")?.trim() ?? "";
  const sources = store.listSources().filter((source) => source.enabled);
  const results = await Promise.all(sources.map(async (source) => {
    const started = performance.now();
    try {
      const response = await guardedFetch(macCmsUrl(source, { action: "list", query }).toString(), {
        timeoutMs: source.timeoutMs,
        allowedHosts: [...new Set([new URL(source.baseUrl).hostname, ...source.allowedHosts])],
        headers: source.headers
      });
      const page = parseMacCmsPayload(source, response.body, response.contentType);
      return {
        items: page.items,
        source: { sourceId: source.id, sourceName: source.name, state: "ok" as const, latencyMs: Math.round(performance.now() - started), message: null }
      };
    } catch (error) {
      return {
        items: [],
        source: { sourceId: source.id, sourceName: source.name, state: "error" as const, latencyMs: Math.round(performance.now() - started), message: error instanceof Error ? error.message : "SOURCE_ERROR" }
      };
    }
  }));
  return context.json({
    query,
    items: dedupeMedia(results.flatMap((result) => result.items)),
    sources: results.map((result) => result.source),
    partial: results.some((result) => result.source.state !== "ok"),
    requestId: context.get("requestId")
  });
});

app.get("/v1/catalog/items/:sourceId/:itemId", async (context) => {
  const source = store.getSource(context.req.param("sourceId"));
  if (!source) return context.json({ error: { code: "SOURCE_NOT_FOUND", message: "Source not found.", requestId: context.get("requestId") } }, 404);
  const response = await guardedFetch(macCmsUrl(source, { action: "detail", ids: [context.req.param("itemId")] }).toString(), {
    timeoutMs: source.timeoutMs,
    allowedHosts: [...new Set([new URL(source.baseUrl).hostname, ...source.allowedHosts])],
    headers: source.headers
  });
  return context.json(parseMacCmsDetail(source, response.body, response.contentType));
});

app.post("/v1/playback/resolve", async (context) => {
  const parsed = resolverRequestSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) {
    return context.json({ error: { code: "PLAYBACK_REQUEST_INVALID", message: "Playback request is invalid.", requestId: context.get("requestId") } }, 400);
  }
  const source = store.getSource(parsed.data.sourceId);
  if (!source || !source.enabled) {
    return context.json({ error: { code: "SOURCE_NOT_FOUND", message: "Source not found.", requestId: context.get("requestId") } }, 404);
  }
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
  const path = mediaUrl.pathname.toLocaleLowerCase();
  return context.json({
    protocol: path.endsWith(".m3u8") ? "hls" : path.endsWith(".mpd") ? "dash" : "progressive",
    url: mediaUrl.toString(),
    headers: {},
    expiresAt: null,
    subtitles: [],
    audioTracks: []
  });
});

app.post("/v1/sync/push", async (context) => {
  const session = context.get("session");
  if (!session) return context.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: context.get("requestId") } }, 401);
  const envelope = syncEnvelopeSchema.parse(await context.req.json());
  if (envelope.householdId !== session.householdId) {
    return context.json({ error: { code: "SYNC_ENVELOPE_INVALID", message: "Household mismatch.", requestId: context.get("requestId") } }, 400);
  }
  store.saveSync(envelope.householdId, envelope.records);
  const records = mergeRecords([], envelope.records);
  return context.json({ ...envelope, cursor: nextCursor(records), records });
});

app.get("/v1/profiles", (context) => {
  const session = context.get("session");
  if (!session) return context.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: context.get("requestId") } }, 401);
  return context.json(store.db.prepare(`
    SELECT id, user_id, name, kind, rating_limit, avatar_key, created_at, updated_at
    FROM profiles WHERE household_id = ? ORDER BY created_at
  `).all(session.householdId));
});

app.post("/v1/profiles", async (context) => {
  const session = context.get("session");
  if (!session || session.role === "child") {
    return context.json({ error: { code: "PERMISSION_DENIED", message: "This role cannot create profiles.", requestId: context.get("requestId") } }, 403);
  }
  const body = await context.req.json<{
    name?: string;
    kind?: "adult" | "child";
    ratingLimit?: string | null;
    pin?: string | null;
    avatarKey?: string;
  }>();
  if (!body.name?.trim() || !body.kind) {
    return context.json({ error: { code: "PROFILE_INVALID", message: "Name and kind are required.", requestId: context.get("requestId") } }, 400);
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  const pinHash = body.pin
    ? createHash("sha256").update(body.pin).digest("base64url")
    : null;
  store.db.prepare(`
    INSERT INTO profiles
      (id, household_id, user_id, name, kind, rating_limit, pin_hash, avatar_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, session.householdId, session.userId, body.name.trim(), body.kind, body.ratingLimit ?? null, pinHash, body.avatarKey || "default", now, now);
  store.audit("profile.created", id, context.get("requestId"));
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

app.get("/v1/devices", (context) => {
  const session = context.get("session");
  if (!session) return context.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: context.get("requestId") } }, 401);
  const rows = session.role === "owner" || session.role === "admin"
    ? store.db.prepare(`
        SELECT id, user_id, name, platform, last_seen_at, revoked_at
        FROM devices WHERE household_id = ? ORDER BY last_seen_at DESC
      `).all(session.householdId)
    : store.db.prepare(`
        SELECT id, user_id, name, platform, last_seen_at, revoked_at
        FROM devices WHERE household_id = ? AND user_id = ? ORDER BY last_seen_at DESC
      `).all(session.householdId, session.userId);
  return context.json(rows);
});

app.post("/v1/devices/:deviceId/revoke", (context) => {
  const session = context.get("session");
  if (!session) return context.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: context.get("requestId") } }, 401);
  const device = store.db.prepare(`
    SELECT user_id FROM devices WHERE id = ? AND household_id = ?
  `).get(context.req.param("deviceId"), session.householdId) as { user_id: string } | undefined;
  if (!device) return context.json({ error: { code: "DEVICE_NOT_FOUND", message: "Device not found.", requestId: context.get("requestId") } }, 404);
  if (device.user_id !== session.userId && session.role !== "owner" && session.role !== "admin") {
    return context.json({ error: { code: "PERMISSION_DENIED", message: "This role cannot revoke that device.", requestId: context.get("requestId") } }, 403);
  }
  const now = new Date().toISOString();
  store.db.prepare("UPDATE devices SET revoked_at = ? WHERE id = ?").run(now, context.req.param("deviceId"));
  store.db.prepare("UPDATE sessions SET revoked_at = ? WHERE device_id = ?").run(now, context.req.param("deviceId"));
  store.audit("device.revoked", context.req.param("deviceId"), context.get("requestId"));
  return new Response(null, { status: 204 });
});

app.get("/v1/audit", (context) => {
  const session = context.get("session");
  if (!session || (session.role !== "owner" && session.role !== "admin")) {
    return context.json({ error: { code: "PERMISSION_DENIED", message: "This role cannot read audit events.", requestId: context.get("requestId") } }, 403);
  }
  return context.json(store.db.prepare(`
    SELECT id, NULL AS actor_user_id, action, subject, request_id, created_at
    FROM audit_events ORDER BY created_at DESC LIMIT 200
  `).all());
});

function backupDirectory(): string {
  const directory = join(process.env.MARSTV_DATA_DIR || join(process.cwd(), ".data"), "backups");
  mkdirSync(directory, { recursive: true });
  return directory;
}

app.get("/v1/backups", (context) => {
  const session = context.get("session");
  if (!session || session.role !== "owner") {
    return context.json({ error: { code: "PERMISSION_DENIED", message: "Only the Owner can list backups.", requestId: context.get("requestId") } }, 403);
  }
  return context.json(readdirSync(backupDirectory())
    .filter((name) => name.endsWith(".marstv"))
    .map((name) => ({ id: name })));
});

app.post("/v1/backups", (context) => {
  const session = context.get("session");
  if (!session || session.role !== "owner") {
    return context.json({ error: { code: "PERMISSION_DENIED", message: "Only the Owner can create backups.", requestId: context.get("requestId") } }, 403);
  }
  const id = `${new Date().toISOString().replace(/:/gu, "-")}-${randomUUID()}.marstv`;
  writeFileSync(join(backupDirectory(), id), encrypt({
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    sources: store.listSources()
  }), { mode: 0o600 });
  store.audit("backup.created", id, context.get("requestId"));
  return context.json({ jobId: id, state: "complete" }, 202);
});

app.post("/v1/backups/:backupId/restore", (context) => {
  const session = context.get("session");
  if (!session || session.role !== "owner") {
    return context.json({ error: { code: "PERMISSION_DENIED", message: "Only the Owner can restore backups.", requestId: context.get("requestId") } }, 403);
  }
  const id = basename(decodeURIComponent(context.req.param("backupId")));
  if (!id.endsWith(".marstv")) {
    return context.json({ error: { code: "BACKUP_ID_INVALID", message: "Backup identifier is invalid.", requestId: context.get("requestId") } }, 400);
  }
  const envelope = decrypt<{ schemaVersion: number; sources: unknown[] }>(
    readFileSync(join(backupDirectory(), id), "utf8")
  );
  if (envelope.schemaVersion !== 1 || !Array.isArray(envelope.sources)) throw new Error("BACKUP_INVALID");
  for (const source of envelope.sources) store.saveSource(sourceConfigSchema.parse(source));
  store.audit("backup.restored", id, context.get("requestId"));
  return context.json({ jobId: id, state: "complete" }, 202);
});

const webDist = relative(
  process.cwd(),
  fileURLToPath(new URL("../../web/dist/", import.meta.url))
);
app.use("/*", serveStatic({ root: webDist }));
app.get("*", serveStatic({ path: join(webDist, "index.html") }));

app.onError((error, context) => context.json({
  error: {
    code: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unexpected error.",
    requestId: context.get("requestId")
  }
}, 500));

const port = Number(process.env.PORT || 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(JSON.stringify({ event: "server.started", port: info.port }));
});
