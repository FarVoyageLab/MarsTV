import type { SyncEnvelope, SyncRecord } from "@marstv/contracts";
import { syncEnvelopeSchema } from "@marstv/contracts";
import { mergeRecords, nextCursor } from "@marstv/sync";
import type { Env } from "./env";
import { randomToken } from "./security";

interface PairingState {
  code: string;
  secret: string;
  createdAt: number;
  expiresAt: number;
  claimedBy: string | null;
  sessionToken: string | null;
}

export class PairingCoordinator implements DurableObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname.endsWith("/start")) {
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000).padStart(6, "0");
      const pairing: PairingState = {
        code,
        secret: randomToken(18),
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60_000,
        claimedBy: null,
        sessionToken: null
      };
      await this.state.storage.put("pairing", pairing);
      await this.state.storage.setAlarm(pairing.expiresAt);
      return Response.json(pairing);
    }
    const pairing = await this.state.storage.get<PairingState>("pairing");
    if (!pairing || pairing.expiresAt <= Date.now()) {
      return Response.json({ error: "PAIRING_EXPIRED" }, { status: 410 });
    }
    if (request.method === "POST" && url.pathname.endsWith("/claim")) {
      if (pairing.claimedBy) return Response.json({ error: "PAIRING_ALREADY_CLAIMED" }, { status: 409 });
      const body = await request.json<{ code: string; userId: string; sessionToken: string }>();
      if (body.code !== pairing.code) return Response.json({ error: "PAIRING_CODE_INVALID" }, { status: 403 });
      pairing.claimedBy = body.userId;
      pairing.sessionToken = body.sessionToken;
      await this.state.storage.put("pairing", pairing);
      return Response.json({ claimed: true });
    }
    if (request.method === "POST" && url.pathname.endsWith("/consume")) {
      const body = await request.json<{ secret: string }>();
      if (body.secret !== pairing.secret) return Response.json({ error: "PAIRING_SECRET_INVALID" }, { status: 403 });
      if (!pairing.sessionToken) return Response.json({ pending: true }, { status: 202 });
      await this.state.storage.deleteAll();
      return Response.json({ sessionToken: pairing.sessionToken });
    }
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  async alarm(): Promise<void> {
    await this.state.storage.deleteAll();
  }
}

export class RateLimiter implements DurableObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const body = await request.json<{ limit: number; windowMs: number }>();
    const now = Date.now();
    const value = await this.state.storage.get<{ count: number; resetAt: number }>("window");
    const window = !value || value.resetAt <= now
      ? { count: 0, resetAt: now + body.windowMs }
      : value;
    window.count += 1;
    await this.state.storage.put("window", window);
    return Response.json({
      allowed: window.count <= body.limit,
      remaining: Math.max(0, body.limit - window.count),
      resetAt: window.resetAt
    }, { status: window.count <= body.limit ? 200 : 429 });
  }
}

export class SyncCoordinator implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const envelope = syncEnvelopeSchema.parse(await request.json());
    const current = await this.state.storage.get<SyncRecord[]>("records") ?? [];
    const merged = mergeRecords(current, envelope.records);
    await this.state.storage.put("records", merged);
    return Response.json({
      householdId: envelope.householdId,
      deviceId: envelope.deviceId,
      cursor: nextCursor(merged),
      records: merged
    } satisfies SyncEnvelope);
  }
}
