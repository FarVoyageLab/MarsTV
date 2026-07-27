PRAGMA foreign_keys = ON;

CREATE TABLE households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'child')),
  created_at TEXT NOT NULL
);

CREATE TABLE passkeys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key BLOB NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  device_id TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  rotated_from TEXT,
  revoked_at TEXT
);
CREATE INDEX sessions_token_active ON sessions(token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 100,
  encrypted_config TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX sources_priority ON sources(enabled, priority);

CREATE TABLE source_health (
  source_id TEXT PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  latency_ms INTEGER,
  checked_at TEXT,
  item_count INTEGER,
  message TEXT
);

CREATE TABLE metadata_cache (
  cache_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_item_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  attribution_url TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX metadata_source_item ON metadata_cache(source_id, source_item_id);

CREATE TABLE sync_records (
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  collection_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  nonce TEXT NOT NULL,
  wall_time INTEGER NOT NULL,
  counter INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (household_id, collection_name, record_id)
);
CREATE INDEX sync_records_cursor ON sync_records(household_id, wall_time, counter);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  household_id TEXT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  subject TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX audit_household_time ON audit_events(household_id, created_at DESC);

CREATE TABLE processed_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  processed_at TEXT NOT NULL
);
