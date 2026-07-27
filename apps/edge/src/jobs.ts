import type { Env, JobMessage } from "./env";
import { sourceConfigSchema } from "@marstv/contracts";
import { probeSource } from "./aggregate";
import { Repository } from "./repository";
import { decryptJson, encryptJson, guardedFetch, sha256 } from "./security";

async function enrichMetadata(env: Env, message: Extract<JobMessage, { type: "metadata.enrich" }>): Promise<void> {
  if (env.MARSTV_DOUBAN_ENABLED !== "true" || !env.MARSTV_DOUBAN_LEGAL_APPROVAL_ID) return;
  const origin = new URL(env.MARSTV_DOUBAN_ORIGIN);
  const url = new URL("/j/subject_suggest", origin);
  url.searchParams.set("q", message.title);
  const response = await guardedFetch(url.toString(), {
    allowedHosts: [origin.hostname],
    timeoutMs: 4_000,
    headers: {
      accept: "application/json",
      "user-agent": "MarsTV/1.0 metadata connector; compliance contact configured by operator"
    },
    maxBytes: 500_000
  });
  const payload = JSON.parse(response.body) as unknown;
  await env.DB.prepare(`
    INSERT INTO metadata_cache
      (cache_key, provider, source_id, source_item_id, payload, attribution_url, expires_at, created_at)
    VALUES (?1, 'douban', ?2, ?3, ?4, ?5, ?6, ?7)
    ON CONFLICT(cache_key) DO UPDATE SET
      payload = excluded.payload,
      expires_at = excluded.expires_at,
      created_at = excluded.created_at
  `).bind(
    await sha256(`${message.sourceId}:${message.sourceItemId}`),
    message.sourceId,
    message.sourceItemId,
    JSON.stringify(payload),
    origin.toString(),
    new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
    new Date().toISOString()
  ).run();
}

async function createBackup(env: Env, message: Extract<JobMessage, { type: "backup.create" }>): Promise<void> {
  const repository = new Repository(env);
  const sources = await repository.listSources();
  const payload = JSON.stringify({
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    reason: message.reason,
    sources
  });
  const encrypted = await encryptJson(env.MARSTV_SOURCE_MASTER_KEY, JSON.parse(payload));
  await env.BACKUPS.put(`backups/${new Date().toISOString()}-${message.id}.marstv`, encrypted, {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { schemaVersion: "1", encrypted: "aes-256-gcm" }
  });
}

async function restoreBackup(env: Env, message: Extract<JobMessage, { type: "backup.restore" }>): Promise<void> {
  const object = await env.BACKUPS.get(message.backupId);
  if (!object) throw new Error("BACKUP_NOT_FOUND");
  const envelope = await decryptJson<unknown>(
    env.MARSTV_SOURCE_MASTER_KEY,
    await object.text()
  );
  if (!envelope || typeof envelope !== "object") throw new Error("BACKUP_INVALID");
  const candidate = envelope as { schemaVersion?: number; sources?: unknown[] };
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.sources)) {
    throw new Error("BACKUP_VERSION_UNSUPPORTED");
  }
  const sources = candidate.sources.map((source) => sourceConfigSchema.parse(source));
  const repository = new Repository(env);
  for (const source of sources) await repository.saveSource(source);
  await repository.audit(null, "backup.restored", message.backupId, message.requestedBy);
}

export async function processJob(env: Env, message: JobMessage): Promise<void> {
  const previous = await env.DB.prepare("SELECT id FROM processed_jobs WHERE id = ?1")
    .bind(message.id).first<{ id: string }>();
  if (previous) return;
  if (message.type === "source.probe") {
    const source = await new Repository(env).getSource(message.sourceId);
    if (source) await probeSource(env, source);
  } else if (message.type === "metadata.enrich") {
    await enrichMetadata(env, message);
  } else if (message.type === "backup.create") {
    await createBackup(env, message);
  } else {
    await restoreBackup(env, message);
  }
  await env.DB.prepare("INSERT INTO processed_jobs (id, job_type, processed_at) VALUES (?1, ?2, ?3)")
    .bind(message.id, message.type, new Date().toISOString()).run();
}
