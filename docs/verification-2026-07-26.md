# Verification record — 2026-07-26

This record distinguishes implementation evidence produced in the development
workspace from the external evidence required by `RELEASE-GATE.md`.

## Passed locally

- `pnpm install --lockfile-only --frozen-lockfile`
- `pnpm check`: 12/12 workspace packages, including Rust `cargo check`
- `pnpm test`: 18/18 task graph nodes; 22 executed assertions across domain,
  sync, MacCMS, Edge security, Node storage/pairing, Web demo data, and Tauri
- Web production build
- Node 24 single-file production bundle and live `/v1/health`
- Live Node pairing round trip: bootstrap `201`, six-digit start, claim `200`,
  consume `200`, replay rejected with `410`
- Cloudflare Worker dry-run with Static Assets, D1, KV, R2, Queues, and three
  Durable Object bindings
- Mobile iOS and Android Hermes exports
- TV iOS/tvOS-oriented and Android TV Hermes exports
- Tauri macOS arm64 Release `.app` bundle
- Browser verification at 1440×900 and PWA verification at 390×844
- CycloneDX 1.6 SBOM generated from the locked pnpm and Cargo dependency graphs

## Expected non-blocking build notes

- HLS and DASH engines are loaded only on the player route. Their lazy chunks
  exceed Vite's default 500 kB advisory threshold.
- dash.js 5.2.0 emits an upstream ESM/CommonJS compatibility advisory during
  bundling. Protocol playback remains subject to the real-device media suite in
  the release gate.

## Still blocking a public 1.0

- Real Cloudflare resource IDs and production secrets
- Universal/signature/notarization and every Windows/Linux package artifact
- EAS store builds, store credentials, and clean physical-device installation
- Maestro, Tauri WebDriver, tvOS/Android TV simulator and physical remote-path
  evidence
- Owned HLS/DASH/MP4 protocol fixtures and performance measurements
- Full security assessment, migration/rollback/DR exercise, privacy
  export/deletion exercise, and 14-day reliability window
- Source authorization and either Douban legal approval or verified production
  disablement
- Manual review of any dependency whose installed package metadata did not
  contain an SPDX license expression
