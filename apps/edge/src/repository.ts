import type {
  SourceConfig,
  SourceHealth,
  SyncRecord
} from "@marstv/contracts";
import { sourceConfigSchema } from "@marstv/contracts";
import type { Env, SessionPrincipal } from "./env";
import { decryptJson, encryptJson, randomToken, sha256 } from "./security";

interface SourceRow {
  id: string;
  name: string;
  enabled: number;
  priority: number;
  encrypted_config: string;
}

export class Repository {
  constructor(private readonly env: Env) {}

  async listSources(): Promise<SourceConfig[]> {
    const result = await this.env.DB.prepare(
      "SELECT id, name, enabled, priority, encrypted_config FROM sources ORDER BY priority ASC, name ASC"
    ).all<SourceRow>();
    return Promise.all(result.results.map((row) => this.decodeSource(row)));
  }

  async getSource(id: string): Promise<SourceConfig | null> {
    const row = await this.env.DB.prepare(
      "SELECT id, name, enabled, priority, encrypted_config FROM sources WHERE id = ?1"
    ).bind(id).first<SourceRow>();
    return row ? this.decodeSource(row) : null;
  }

  async saveSource(config: SourceConfig): Promise<SourceConfig> {
    const parsed = sourceConfigSchema.parse(config);
    const encrypted = await encryptJson(this.env.MARSTV_SOURCE_MASTER_KEY, parsed);
    await this.env.DB.prepare(`
      INSERT INTO sources (id, name, enabled, priority, encrypted_config, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        enabled = excluded.enabled,
        priority = excluded.priority,
        encrypted_config = excluded.encrypted_config,
        updated_at = excluded.updated_at
    `).bind(
      parsed.id,
      parsed.name,
      parsed.enabled ? 1 : 0,
      parsed.priority,
      encrypted,
      parsed.updatedAt
    ).run();
    return parsed;
  }

  async deleteSource(id: string): Promise<void> {
    await this.env.DB.batch([
      this.env.DB.prepare("DELETE FROM source_health WHERE source_id = ?1").bind(id),
      this.env.DB.prepare("DELETE FROM sources WHERE id = ?1").bind(id)
    ]);
  }

  async health(sourceId: string): Promise<SourceHealth | null> {
    const row = await this.env.DB.prepare(`
      SELECT source_id, state, latency_ms, checked_at, item_count, message
      FROM source_health WHERE source_id = ?1
    `).bind(sourceId).first<{
      source_id: string;
      state: SourceHealth["state"];
      latency_ms: number | null;
      checked_at: string | null;
      item_count: number | null;
      message: string | null;
    }>();
    return row ? {
      sourceId: row.source_id,
      state: row.state,
      latencyMs: row.latency_ms,
      checkedAt: row.checked_at,
      itemCount: row.item_count,
      message: row.message
    } : null;
  }

  async saveHealth(health: SourceHealth): Promise<void> {
    await this.env.DB.prepare(`
      INSERT INTO source_health (source_id, state, latency_ms, checked_at, item_count, message)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT(source_id) DO UPDATE SET
        state = excluded.state,
        latency_ms = excluded.latency_ms,
        checked_at = excluded.checked_at,
        item_count = excluded.item_count,
        message = excluded.message
    `).bind(
      health.sourceId,
      health.state,
      health.latencyMs,
      health.checkedAt,
      health.itemCount,
      health.message
    ).run();
  }

  async createSession(input: {
    userId: string;
    householdId: string;
    role: SessionPrincipal["role"];
    deviceId?: string | null;
  }): Promise<{ token: string; expiresAt: string }> {
    const token = randomToken();
    const tokenHash = await sha256(token);
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1_000).toISOString();
    await this.env.DB.prepare(`
      INSERT INTO sessions
        (id, token_hash, user_id, household_id, role, device_id, expires_at, created_at, rotated_from)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL)
    `).bind(
      crypto.randomUUID(),
      tokenHash,
      input.userId,
      input.householdId,
      input.role,
      input.deviceId ?? null,
      expiresAt,
      new Date(now).toISOString()
    ).run();
    return { token, expiresAt };
  }

  async sessionFromToken(token: string): Promise<SessionPrincipal | null> {
    const tokenHash = await sha256(token);
    const row = await this.env.DB.prepare(`
      SELECT id, user_id, household_id, role, device_id
      FROM sessions
      WHERE token_hash = ?1 AND revoked_at IS NULL AND expires_at > ?2
    `).bind(tokenHash, new Date().toISOString()).first<{
      id: string;
      user_id: string;
      household_id: string;
      role: SessionPrincipal["role"];
      device_id: string | null;
    }>();
    return row ? {
      sessionId: row.id,
      userId: row.user_id,
      householdId: row.household_id,
      role: row.role,
      deviceId: row.device_id
    } : null;
  }

  async audit(principal: SessionPrincipal | null, action: string, subject: string, requestId: string): Promise<void> {
    await this.env.DB.prepare(`
      INSERT INTO audit_events (id, household_id, actor_user_id, action, subject, request_id, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    `).bind(
      crypto.randomUUID(),
      principal?.householdId ?? null,
      principal?.userId ?? null,
      action,
      subject,
      requestId,
      new Date().toISOString()
    ).run();
  }

  async syncRecords(householdId: string, records: readonly SyncRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.env.DB.batch(records.map((record) => this.env.DB.prepare(`
      INSERT INTO sync_records
        (household_id, collection_name, record_id, ciphertext, nonce, wall_time, counter, device_id, deleted_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
      ON CONFLICT(household_id, collection_name, record_id) DO UPDATE SET
        ciphertext = CASE WHEN excluded.wall_time > sync_records.wall_time
          OR (excluded.wall_time = sync_records.wall_time AND excluded.counter >= sync_records.counter)
          THEN excluded.ciphertext ELSE sync_records.ciphertext END,
        nonce = CASE WHEN excluded.wall_time > sync_records.wall_time
          OR (excluded.wall_time = sync_records.wall_time AND excluded.counter >= sync_records.counter)
          THEN excluded.nonce ELSE sync_records.nonce END,
        wall_time = MAX(sync_records.wall_time, excluded.wall_time),
        counter = CASE WHEN excluded.wall_time >= sync_records.wall_time
          THEN excluded.counter ELSE sync_records.counter END,
        device_id = CASE WHEN excluded.wall_time >= sync_records.wall_time
          THEN excluded.device_id ELSE sync_records.device_id END,
        deleted_at = CASE WHEN excluded.wall_time >= sync_records.wall_time
          THEN excluded.deleted_at ELSE sync_records.deleted_at END
    `).bind(
      householdId,
      record.collection,
      record.id,
      record.ciphertext,
      record.nonce,
      record.clock.wallTime,
      record.clock.counter,
      record.clock.deviceId,
      record.deletedAt
    )));
  }

  private async decodeSource(row: SourceRow): Promise<SourceConfig> {
    return sourceConfigSchema.parse(
      await decryptJson<SourceConfig>(this.env.MARSTV_SOURCE_MASTER_KEY, row.encrypted_config)
    );
  }
}
