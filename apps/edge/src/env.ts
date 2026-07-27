export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  BACKUPS: R2Bucket;
  JOBS: Queue<JobMessage>;
  ASSETS: Fetcher;
  PAIRING: DurableObjectNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  SYNC: DurableObjectNamespace;
  MARSTV_PUBLIC_ORIGIN: string;
  MARSTV_SOURCE_MASTER_KEY: string;
  MARSTV_BOOTSTRAP_TOKEN: string;
  MARSTV_DOUBAN_ENABLED: string;
  MARSTV_DOUBAN_LEGAL_APPROVAL_ID?: string;
  MARSTV_DOUBAN_ORIGIN: string;
}

export type JobMessage =
  | { id: string; type: "source.probe"; sourceId: string }
  | { id: string; type: "metadata.enrich"; sourceId: string; sourceItemId: string; title: string }
  | { id: string; type: "backup.create"; reason: "scheduled" | "manual" }
  | { id: string; type: "backup.restore"; backupId: string; requestedBy: string };

export interface Variables {
  requestId: string;
  session: SessionPrincipal | null;
}

export interface SessionPrincipal {
  sessionId: string;
  userId: string;
  householdId: string;
  role: "owner" | "admin" | "member" | "child";
  deviceId: string | null;
}
