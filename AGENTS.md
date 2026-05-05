# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, Cline, Aider, 等) working in this repository.

`CLAUDE.md` mirrors this file for Claude-specific conventions; keep the two in sync when editing.

## Project at a glance

**MarsTV** — cross-platform open-source video aggregator. One pnpm + Turborepo monorepo, four client targets, five shared packages.

| Path | Package | Stack |
|---|---|---|
| `apps/desktop` | `@marstv/desktop` | Tauri v2 + Vite + React Router (Rust backend in `src-tauri/`, dev URL `http://localhost:1420`) |
| `apps/mobile` | `@marstv/mobile` | Expo SDK 55 + React Navigation (`catalog:mobile`, RN 0.81.5) |
| `apps/tvos` | `@marstv/tvos` | Expo + `react-native-tvos@0.83.6-0` + Reanimated 4.3 (`catalog:tvos`). TV builds require `EXPO_TV=1` |
| `apps/web` | `@marstv/web` | Vite + React Router 7 (SSR) + Cloudflare Workers (worker `marstv-web`, entry `worker/index.ts`) |
| `packages/core` | `@marstv/core` | Shared types, CMS adapters, storage. **Only package with tests (vitest).** |
| `packages/api` | `@marstv/api` | Typed API client + endpoint contracts. Depends on `@marstv/core` |
| `packages/ui` | `@marstv/ui` | Shared React components (shadcn, Tailwind v4, Base UI). Exports `./styles/globals.css` |
| `packages/eslint-config` | | `base`, `next-js`, `react-internal` — all bundle `eslint-plugin-only-warn`, so ESLint never errors |
| `packages/typescript-config` | | Shared tsconfig bases |

## Toolchain

- **Package manager:** pnpm `10.33.0` — pinned via `packageManager`. **Never use `npm` or `yarn`.**
- **Node:** `>= 22`.
- **Orchestrator:** Turborepo (`turbo.json`). Root scripts fan out via `turbo run <task>`.
- **CI:** GitHub Actions run the quality gate on PRs and pushes to `main`; no git hooks.

## pnpm catalogs (critical)

`pnpm-workspace.yaml` defines **three** catalog namespaces. Pick the right one when adding a dep:

- `catalog:` — default shared versions (React 19, TypeScript, Tailwind v4, etc.)
- `catalog:mobile` — for `apps/mobile` (stock RN)
- `catalog:tvos` — for `apps/tvos` (RN aliased to `react-native-tvos`, divergent Reanimated version)

Before adding a dependency, check whether it already exists in a catalog. Use `pnpm catalog` to invoke the catalog codemod.

## Commands

### Root (via Turbo)

| Command | Effect |
|---|---|
| `pnpm dev` | all dev servers |
| `pnpm build` | all app/package builds |
| `pnpm lint` | each package's lint script |
| `pnpm check-types` | typecheck everything |
| `pnpm format` | **Prettier** over `**/*.{ts,tsx,md}` — legacy, not the source of truth (see Code style) |

### Per-workspace (`pnpm -F <name> <script>`)

- **`@marstv/core`**: `test` (`vitest run`), `test:watch`, `typecheck`
- **`@marstv/desktop`**: `dev`, `build` (`tsc && vite build`), `tauri <cmd>`
- **`@marstv/mobile`**: `start` / `android` / `ios` / `web`, `lint` (expo lint)
- **`@marstv/tvos`**: `start`, `prebuild`, `prebuild:tv` (sets `EXPO_TV=1`), `deploy` (expo export + eas deploy)
- **`@marstv/web`**: `dev`, `build` (`tsc -b && vite build`), `build:cf` (build + inject KV id, used by CF Workers Builds CI), `lint` (eslint), `deploy` (build + `wrangler deploy`), `cf-typegen` (regenerate worker types after editing `wrangler.jsonc`)

## Code style

- **Biome** (`biome.json`, `@biomejs/biome 2.4.14`) is the root linter + formatter: **tabs** for indent, **double quotes**.
- The Claude Code harness auto-formats every Write/Edit via a PostToolUse hook (`pnpm biome format --write "$f"`). Agents using other harnesses should run `pnpm biome format --write <files>` manually before committing.
- ESLint configs in individual apps/packages use `eslint-plugin-only-warn` + `eslint-config-prettier` — they never error on style and exist purely for React / Expo rules.
- No `.prettierrc`. Prettier runs with defaults plus `prettier-plugin-tailwindcss` for class sorting when called directly.

## Testing

- Unit tests: `packages/core` only, vitest, `src/**/*.test.ts`, node env. Run `pnpm -F @marstv/core test`.
- `@playwright/test` is installed in `@marstv/web` but **no config or specs exist yet** — do not assume a working E2E harness.
- CI runs this gate on PRs and pushes to `main`, but every change should still be validated locally before declaring completion:
  ```bash
  pnpm check-types && pnpm lint && pnpm -F @marstv/core test
  ```
  Or invoke the bundled Claude skill: `/verify`.

## Deployment

| Target | How |
|---|---|
| Web (`@marstv/web`) | Cloudflare Workers — push to main triggers Workers Builds CI (`build:cf`). Local: `pnpm -F @marstv/web deploy`. `--keep-vars` preserves dashboard secrets. Full guide: `apps/web/DEPLOY.md`. |
| tvOS (`@marstv/tvos`) | EAS — `pnpm -F @marstv/tvos deploy` |
| Desktop (`@marstv/desktop`) | `pnpm -F @marstv/desktop tauri build` |
| Mobile (`@marstv/mobile`) | Expo / EAS |

Release builds are created from the manual GitHub Actions `Release` workflow. Its tag format is `v{x}.{y}.{z}-{YYYYMMDD}.{HHmm}` using Asia/Shanghai time, for example `v0.1.0-20260505.2130`.

## Repo etiquette

- **Commits:** Conventional Commits (`feat:` / `fix:` / `refactor:` / `chore:` / `docs:` / `style:` / `perf:`). See recent history for tone.
- **Branches:** descriptive kebab-case (`blank-slate`, `fix/bypass-opennext-deploy` — follow existing patterns).
- **PRs:** run the quality gate locally; mention the affected apps/packages in the description.
- **Chinese is fine** in commit messages, PR titles, UI copy, and comments where it helps readability — this is a bilingual project.

## Gotchas and non-obvious behavior

1. **RN version split** — `apps/mobile` and `apps/tvos` use *different* React Native forks. Do not share mobile-only code into the tvos app without checking RN API parity. Shared UI lives in `packages/ui` (web-compatible) or must be duplicated with `.native.tsx` / `.tsx` variants in `apps/tvos/src/components/`.
2. **TV-specific files** — `apps/tvos/metro.config.js` has commented-out config for TV file extensions. If you introduce `.tv.tsx` variants, uncomment and adjust.
3. **`EXPO_TV=1`** — Omitting this env var when prebuilding `apps/tvos` produces a non-TV build that looks broken on ATV/Android TV.
4. **`wrangler.jsonc` edits** — Always re-run `pnpm -F @marstv/web cf-typegen` afterward so `worker-configuration.d.ts` stays in sync.
5. **Cloudflare Workers deployment** — `--keep-vars` only protects `vars`/`secrets`, NOT resource bindings (KV, R2, D1). The KV namespace id is injected at build time via `scripts/inject-kv-id.mjs` from a build-time env var. CF dashboard has two identically-named "Variables and Secrets" sections — the one nested under "Build" is for build-time, the top-level one is for runtime. Mixing these up is a common mistake. See `apps/web/DEPLOY.md`.
6. **Empty `test-results/`** — The `test-results/` directory at repo root is a Playwright artifact left behind; safe to ignore or gitignore.
7. **Tauri Rust code** lives in `apps/desktop/src-tauri/`. Changes there require a local Rust toolchain.
8. **`@marstv/ui` lint is strict** — Unlike other packages that use `eslint-plugin-only-warn`, `@marstv/ui` runs eslint with `--max-warnings 0`. Any warning becomes an error in that package.

## Things an agent should NOT do

- Introduce a new package manager (`npm install` / `yarn add`).
- Add a floating version of a dep already present in a pnpm catalog.
- Run `pnpm format` expecting Biome behavior — it's Prettier. Use `pnpm biome format --write` instead.
- Modify `apps/mobile` code when the task was about `apps/tvos` (they look similar but depend on different RN forks).
- Delete or rewrite `CLAUDE.md` without also updating this file — they mirror each other.
- Assume Playwright E2E exists — it doesn't.
