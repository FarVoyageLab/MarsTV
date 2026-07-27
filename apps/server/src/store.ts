import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { SourceConfig, SyncRecord } from "@marstv/contracts";
import { sourceConfigSchema } from "@marstv/contracts";

export type ServerRole = "owner" | "admin" | "member" | "child";

export interface ServerPrincipal {
  sessionId: string;
  userId: string;
  householdId: string;
  role: ServerRole;
  deviceId: string | null;
}

function dataPath(): string {
  return process.env.MARSTV_DATA_DIR || join(process.cwd(), ".data");
}

function masterKey(): Buffer {
  return createHash("sha256")
    .update(process.env.MARSTV_SOURCE_MASTER_KEY || "development-only-change-me")
    .digest();
}

export function encrypt(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((buffer) => buffer.toString("base64url")).join(".");
}

export function decrypt<T>(value: string): T {
  const [rawIv, rawTag, rawCiphertext] = value.split(".");
  if (!rawIv || !rawTag || !rawCiphertext) throw new Error("INVALID_CIPHERTEXT");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(rawIv, "base64url"));
  decipher.setAuthTag(Buffer.from(rawTag, "base64url"));
  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(rawCiphertext, "base64url")),
    decipher.final()
  ]).toString("utf8")) as T;
}

export class NodeStore {
  readonly db: DatabaseSync;

  constructor(file = join(dataPath(), "marstv.sqlite")) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL,
        priority INTEGER NOT NULL,
        encrypted_config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_records (
        household_id TEXT NOT NULL,
        collection_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        wall_time INTEGER NOT NULL,
        counter INTEGER NOT NULL,
        device_id TEXT NOT NULL,
        PRIMARY KEY (household_id, collection_name, record_id)
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        subject TEXT NOT NULL,
        request_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS households (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        device_id TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS passkeys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_id TEXT NOT NULL UNIQUE,
        public_key BLOB NOT NULL,
        counter INTEGER NOT NULL,
        transports TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT
      );
      CREATE TABLE IF NOT EXISTS auth_challenges (
        id TEXT PRIMARY KEY,
        challenge TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recovery_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        used_at TEXT
      );
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        rating_limit TEXT,
        pin_hash TEXT,
        avatar_key TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        platform TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS pairings (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        secret TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        claimed_by TEXT,
        session_token TEXT
      );
    `);
  }

  bootstrap(displayName: string): { userId: string; householdId: string; token: string; expiresAt: string } {
    const existing = this.db.prepare("SELECT id FROM users LIMIT 1").get();
    if (existing) throw new Error("BOOTSTRAP_COMPLETE");
    const householdId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO households (id, name, created_at) VALUES (?, ?, ?)")
        .run(householdId, "MarsTV Home", now);
      this.db.prepare(`
        INSERT INTO users (id, household_id, display_name, role, created_at)
        VALUES (?, ?, ?, 'owner', ?)
      `).run(userId, householdId, displayName.trim() || "Owner", now);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { userId, householdId, ...this.createSession(userId, householdId, "owner") };
  }

  createSession(
    userId: string,
    householdId: string,
    role: ServerRole,
    deviceId: string | null = null
  ): { token: string; expiresAt: string } {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("base64url");
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1_000).toISOString();
    this.db.prepare(`
      INSERT INTO sessions
        (id, token_hash, user_id, household_id, role, device_id, expires_at, created_at, revoked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `).run(
      crypto.randomUUID(),
      tokenHash,
      userId,
      householdId,
      role,
      deviceId,
      expiresAt,
      new Date(now).toISOString()
    );
    return { token, expiresAt };
  }

  session(token: string): ServerPrincipal | null {
    const tokenHash = createHash("sha256").update(token).digest("base64url");
    const row = this.db.prepare(`
      SELECT id, user_id, household_id, role, device_id
      FROM sessions
      WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?
    `).get(tokenHash, new Date().toISOString()) as {
      id: string;
      user_id: string;
      household_id: string;
      role: ServerRole;
      device_id: string | null;
    } | undefined;
    return row ? {
      sessionId: row.id,
      userId: row.user_id,
      householdId: row.household_id,
      role: row.role,
      deviceId: row.device_id
    } : null;
  }

  user(userId: string): { id: string; displayName: string; householdId: string; role: ServerRole } | null {
    const row = this.db.prepare(`
      SELECT id, display_name, household_id, role FROM users WHERE id = ?
    `).get(userId) as {
      id: string;
      display_name: string;
      household_id: string;
      role: ServerRole;
    } | undefined;
    return row ? {
      id: row.id,
      displayName: row.display_name,
      householdId: row.household_id,
      role: row.role
    } : null;
  }

  listPasskeys(userId: string): Array<{
    id: string;
    credentialId: string;
    publicKey: Uint8Array;
    counter: number;
    transports: string[];
  }> {
    const rows = this.db.prepare(`
      SELECT id, credential_id, public_key, counter, transports FROM passkeys WHERE user_id = ?
    `).all(userId) as Array<{
      id: string;
      credential_id: string;
      public_key: Uint8Array;
      counter: number;
      transports: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      credentialId: row.credential_id,
      publicKey: new Uint8Array(row.public_key),
      counter: row.counter,
      transports: JSON.parse(row.transports) as string[]
    }));
  }

  passkey(credentialId: string): {
    id: string;
    userId: string;
    credentialId: string;
    publicKey: Uint8Array;
    counter: number;
    transports: string[];
    householdId: string;
    role: ServerRole;
  } | null {
    const row = this.db.prepare(`
      SELECT
        passkeys.id, passkeys.user_id, passkeys.credential_id, passkeys.public_key,
        passkeys.counter, passkeys.transports, users.household_id, users.role
      FROM passkeys JOIN users ON users.id = passkeys.user_id
      WHERE passkeys.credential_id = ?
    `).get(credentialId) as {
      id: string;
      user_id: string;
      credential_id: string;
      public_key: Uint8Array;
      counter: number;
      transports: string;
      household_id: string;
      role: ServerRole;
    } | undefined;
    return row ? {
      id: row.id,
      userId: row.user_id,
      credentialId: row.credential_id,
      publicKey: new Uint8Array(row.public_key),
      counter: row.counter,
      transports: JSON.parse(row.transports) as string[],
      householdId: row.household_id,
      role: row.role
    } : null;
  }

  savePasskey(input: {
    userId: string;
    credentialId: string;
    publicKey: Uint8Array;
    counter: number;
    transports: string[];
  }): void {
    this.db.prepare(`
      INSERT INTO passkeys
        (id, user_id, credential_id, public_key, counter, transports, created_at, last_used_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(credential_id) DO UPDATE SET
        public_key = excluded.public_key,
        counter = excluded.counter,
        transports = excluded.transports
    `).run(
      crypto.randomUUID(),
      input.userId,
      input.credentialId,
      input.publicKey,
      input.counter,
      JSON.stringify(input.transports),
      new Date().toISOString()
    );
  }

  updatePasskeyCounter(id: string, counter: number): void {
    this.db.prepare(`
      UPDATE passkeys SET counter = ?, last_used_at = ? WHERE id = ? AND counter <= ?
    `).run(counter, new Date().toISOString(), id, counter);
  }

  putChallenge(id: string, challenge: string): void {
    this.db.prepare(`
      INSERT INTO auth_challenges (id, challenge, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET challenge = excluded.challenge, expires_at = excluded.expires_at
    `).run(id, challenge, Date.now() + 5 * 60_000);
  }

  takeChallenge(id: string): string | null {
    const row = this.db.prepare(`
      DELETE FROM auth_challenges WHERE id = ? AND expires_at > ? RETURNING challenge
    `).get(id, Date.now()) as { challenge: string } | undefined;
    return row?.challenge ?? null;
  }

  replaceRecoveryCodes(userId: string, codes: readonly string[]): void {
    const insert = this.db.prepare(`
      INSERT INTO recovery_codes (id, user_id, code_hash, created_at, used_at)
      VALUES (?, ?, ?, ?, NULL)
    `);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM recovery_codes WHERE user_id = ?").run(userId);
      for (const code of codes) {
        insert.run(
          crypto.randomUUID(),
          userId,
          createHash("sha256").update(code).digest("base64url"),
          new Date().toISOString()
        );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  consumeRecoveryCode(code: string): {
    userId: string;
    householdId: string;
    role: ServerRole;
  } | null {
    const hash = createHash("sha256").update(code.trim().toUpperCase()).digest("base64url");
    const row = this.db.prepare(`
      SELECT recovery_codes.id, users.id AS user_id, users.household_id, users.role
      FROM recovery_codes JOIN users ON users.id = recovery_codes.user_id
      WHERE recovery_codes.code_hash = ? AND recovery_codes.used_at IS NULL
    `).get(hash) as {
      id: string;
      user_id: string;
      household_id: string;
      role: ServerRole;
    } | undefined;
    if (!row) return null;
    const result = this.db.prepare(`
      UPDATE recovery_codes SET used_at = ? WHERE id = ? AND used_at IS NULL
    `).run(new Date().toISOString(), row.id);
    return result.changes === 1 ? {
      userId: row.user_id,
      householdId: row.household_id,
      role: row.role
    } : null;
  }

  listSources(): SourceConfig[] {
    const rows = this.db.prepare(
      "SELECT encrypted_config FROM sources ORDER BY priority ASC, name ASC"
    ).all() as Array<{ encrypted_config: string }>;
    return rows.map((row) => sourceConfigSchema.parse(decrypt(row.encrypted_config)));
  }

  getSource(id: string): SourceConfig | null {
    const row = this.db.prepare("SELECT encrypted_config FROM sources WHERE id = ?")
      .get(id) as { encrypted_config: string } | undefined;
    return row ? sourceConfigSchema.parse(decrypt(row.encrypted_config)) : null;
  }

  saveSource(source: SourceConfig): SourceConfig {
    const parsed = sourceConfigSchema.parse(source);
    this.db.prepare(`
      INSERT INTO sources (id, name, enabled, priority, encrypted_config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        enabled = excluded.enabled,
        priority = excluded.priority,
        encrypted_config = excluded.encrypted_config,
        updated_at = excluded.updated_at
    `).run(
      parsed.id,
      parsed.name,
      parsed.enabled ? 1 : 0,
      parsed.priority,
      encrypt(parsed),
      parsed.createdAt,
      parsed.updatedAt
    );
    return parsed;
  }

  deleteSource(id: string): void {
    this.db.prepare("DELETE FROM sources WHERE id = ?").run(id);
  }

  audit(action: string, subject: string, requestId: string): void {
    this.db.prepare(`
      INSERT INTO audit_events (id, action, subject, request_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), action, subject, requestId, new Date().toISOString());
  }

  createPairing(): { pairingId: string; code: string; secret: string; expiresAt: number } {
    const pairingId = randomBytes(12).toString("base64url");
    const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
    const secret = randomBytes(18).toString("base64url");
    const expiresAt = Date.now() + 5 * 60_000;
    this.db.prepare(`
      INSERT INTO pairings (id, code, secret, expires_at, claimed_by, session_token)
      VALUES (?, ?, ?, ?, NULL, NULL)
    `).run(pairingId, code, secret, expiresAt);
    return { pairingId, code, secret, expiresAt };
  }

  pairingForClaim(pairingId: string, code: string): boolean {
    const row = this.db.prepare(`
      SELECT id FROM pairings
      WHERE id = ? AND code = ? AND expires_at > ? AND claimed_by IS NULL
    `).get(pairingId, code, Date.now());
    return Boolean(row);
  }

  pairingIdForCode(code: string): string | null {
    const row = this.db.prepare(`
      SELECT id FROM pairings
      WHERE code = ? AND expires_at > ? AND claimed_by IS NULL
      ORDER BY expires_at DESC LIMIT 1
    `).get(code, Date.now()) as { id: string } | undefined;
    return row?.id ?? null;
  }

  claimPairing(pairingId: string, userId: string, token: string): boolean {
    const result = this.db.prepare(`
      UPDATE pairings SET claimed_by = ?, session_token = ?
      WHERE id = ? AND expires_at > ? AND claimed_by IS NULL
    `).run(userId, token, pairingId, Date.now());
    return result.changes === 1;
  }

  consumePairing(pairingId: string, secret: string): { pending: true } | { sessionToken: string } | null {
    const row = this.db.prepare(`
      SELECT session_token FROM pairings WHERE id = ? AND secret = ? AND expires_at > ?
    `).get(pairingId, secret, Date.now()) as { session_token: string | null } | undefined;
    if (!row) return null;
    if (!row.session_token) return { pending: true };
    this.db.prepare("DELETE FROM pairings WHERE id = ?").run(pairingId);
    return { sessionToken: row.session_token };
  }

  saveSync(householdId: string, records: readonly SyncRecord[]): void {
    const statement = this.db.prepare(`
      INSERT INTO sync_records
        (household_id, collection_name, record_id, payload, wall_time, counter, device_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(household_id, collection_name, record_id) DO UPDATE SET
        payload = CASE WHEN excluded.wall_time >= sync_records.wall_time
          THEN excluded.payload ELSE sync_records.payload END,
        wall_time = MAX(sync_records.wall_time, excluded.wall_time),
        counter = CASE WHEN excluded.wall_time >= sync_records.wall_time
          THEN excluded.counter ELSE sync_records.counter END,
        device_id = CASE WHEN excluded.wall_time >= sync_records.wall_time
          THEN excluded.device_id ELSE sync_records.device_id END
    `);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const record of records) {
        statement.run(
          householdId,
          record.collection,
          record.id,
          JSON.stringify(record),
          record.clock.wallTime,
          record.clock.counter,
          record.clock.deviceId
        );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
