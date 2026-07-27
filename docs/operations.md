# Operations

## Cloudflare

1. Create D1, KV, R2, the main queue, and its DLQ.
2. Replace the placeholder resource IDs in `apps/edge/wrangler.jsonc`.
3. Store `MARSTV_SOURCE_MASTER_KEY` and `MARSTV_BOOTSTRAP_TOKEN` as Worker
   secrets; never commit them.
4. Apply migrations with `wrangler d1 migrations apply marstv --remote`.
5. Build Web, then deploy the Worker so Static Assets and API are one origin.
6. Use `/healthz` for liveness and `/v1/health` for dependency readiness.

`MARSTV_SOURCE_MASTER_KEY` must be a random 32-byte base64url secret. Rotating it
requires decrypting and re-encrypting all shared-source configurations and
backups during a maintenance window.

## Docker

```sh
cp .env.example .env
docker compose up --build -d
curl --fail http://localhost:8787/healthz
```

The image is read-only except `/data` and `/tmp`. Back up the named volume and
the source master key separately. A backup without the key is intentionally
unreadable; the key without the backup contains no catalog or account data.

## Bootstrap and recovery

The bootstrap secret works only while no user exists. Open `/setup`, create the
Owner, immediately register a Passkey, save the ten one-time recovery codes
offline, then remove the bootstrap secret from routine operator access.

Desktop and TV pairing records expire after five minutes. Claim and consume are
both single-use. Revoke a lost device from the household device screen.

## Backup and restore

Scheduled backups are encrypted before R2/S3 storage. A restore run must verify
the envelope version, hash, encryption key, database migration compatibility,
and target household before mutation. Practice restore and rollback on a
separate instance before every 1.0 release candidate.

## Metadata provider

Douban enrichment remains disabled unless both
`MARSTV_DOUBAN_ENABLED=true` and a non-empty
`MARSTV_DOUBAN_LEGAL_APPROVAL_ID` are set. Disabling it does not affect search,
detail, or playback. Operators must retain the written authorization or legal
review referenced by that approval ID.

## Observability

Logs permit request ID, route, method, status, duration, source ID, job type,
and error code. Never add search terms, history, media URLs, source headers, or
tokens. Export traces through the platform integration and keep crash reporting
opt-in on clients.
