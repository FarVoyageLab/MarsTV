# Operations

## Cloudflare

### One-click deployment

Use the **Deploy to Cloudflare** button in the repository README. Keep the
default Worker name `marstv-edge`; the queue consumer names intentionally match
that deployment. Cloudflare Workers Builds provisions and binds:

- D1 `marstv`
- KV for the `CACHE` binding
- R2 `marstv-backups`
- Queues `marstv-jobs` and `marstv-jobs-dlq`
- SQLite Durable Objects for pairing, rate limiting, and sync
- Worker Static Assets and the two Cron Triggers

When prompted, generate independent random values for
`MARSTV_SOURCE_MASTER_KEY` and `MARSTV_BOOTSTRAP_TOKEN`. The deploy command
uploads Web and Worker code, provisions bindings, applies D1 migrations by the
`DB` binding, and keeps future pushes connected through Workers Builds.

### CLI deployment

```sh
corepack pnpm install
pnpm cloudflare:login
pnpm deploy:cloudflare
```

The first run uses Wrangler automatic provisioning, writes deployment secrets
to the ignored `.marstv/cloudflare-secrets.env` with mode `0600`, applies the
initial D1 schema, checks `/healthz`, and prints the `/setup` URL. Subsequent
runs apply pending migrations before uploading the new Worker version.

Use `pnpm deploy:cloudflare -- --dry-run` to build and validate the complete
binding graph without changing Cloudflare.

`wrangler.jsonc` is the configuration source of truth. Account-specific IDs may
be written back by an interactive Wrangler deployment; they are optional for
future automatic provisioning and should not be added to the upstream template.

The Web UI and `/v1` API use one origin. When `MARSTV_PUBLIC_ORIGIN` is absent,
MarsTV derives the secure origin from each request, so the initial
`workers.dev` URL works without editing configuration. If a custom domain is
planned, attach it before registering Passkeys; credentials are scoped to the
hostname. A fixed `MARSTV_PUBLIC_ORIGIN=https://tv.example.com` runtime variable
may be set when the deployment must reject every other hostname.

Use `/healthz` for liveness and `/v1/health` for dependency readiness.

`MARSTV_SOURCE_MASTER_KEY` must be a random 32-byte base64url secret. Rotating it
requires decrypting and re-encrypting all shared-source configurations and
backups during a maintenance window.

## Docker

```sh
corepack pnpm install
pnpm deploy:self-host
```

The command creates a production `.env` with random secrets, validates the
Compose model, builds the multi-architecture-compatible image, starts the
service, and waits for its health check. To prepare configuration without
starting Docker:

```sh
pnpm deploy:self-host -- --prepare-only --origin https://tv.example.com
```

For manual operation, copy `.env.self-host.example` to `.env`, replace both
secret placeholders, set the final HTTPS origin, then run:

```sh
docker compose --env-file .env up --build --detach
docker compose ps
```

The published `ghcr.io/farvoyagelab/marstv:latest` image supports amd64 and
arm64 after the container workflow on `main` completes. The runtime is
read-only, runs as the unprivileged `node` user, and writes only to `/data` and
the no-exec `/tmp` tmpfs.

Back up the `marstv-data` volume and source master key separately. A backup
without the key is intentionally unreadable; the key without the backup
contains no catalog or account data.

Passkeys require HTTPS except on localhost. Terminate TLS with Caddy, Traefik,
Nginx, or another reverse proxy and forward to port `8787`. Set
`MARSTV_PUBLIC_ORIGIN` to the external HTTPS origin without a trailing slash.

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
