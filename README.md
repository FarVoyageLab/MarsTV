# MarsTV

MarsTV is a production-oriented private household media platform: multi-device
clients, a unified content aggregation layer, and configuration/sync
management.

It ships without content sources, resolver endpoints, or third-party movie
assets. Connect only services and media you are authorized to use.

## Workspace

- `apps/web` — React/Vite Web, PWA, and administration console
- `apps/edge` — Hono API for Cloudflare Workers
- `apps/desktop` — Tauri 2 desktop shell
- `apps/mobile` — Expo/React Native iOS, iPadOS, and Android client
- `apps/tv` — React Native TVOS tvOS and Android TV client
- `packages/*` — contracts, domain, MacCMS, sync, API client, and design tokens

## Development

```sh
corepack pnpm install
corepack pnpm dev
```

The Web application defaults to `http://localhost:4173`; the Edge API defaults
to `http://localhost:8787`.

See [architecture](docs/architecture.md), [operations](docs/operations.md),
[security and privacy](docs/security-privacy.md), the
[OpenAPI 3.1 contract](docs/openapi.yaml), [store review packet](docs/store-review.md),
[release gates](RELEASE-GATE.md), and the
[current verification record](docs/verification-2026-07-26.md).

## Release status

The repository contains the complete 1.0 product surfaces and release
automation. Do not publish a production `1.0.0` tag until every item in
`RELEASE-GATE.md` has external evidence, including signing/notarization,
physical-device installation, content authorization, and the 14-day candidate
reliability window.
