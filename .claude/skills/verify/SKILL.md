---
name: verify
description: Run the MarsTV quality gate — type check, lint, and unit tests. Use before declaring an implementation complete, before committing, or when asked to "verify" / "check" changes.
---

# Verify MarsTV changes

Run the full local quality gate in this order. Stop and report on the first failure instead of pushing through.

## Steps

1. **Type check the whole monorepo**

   ```bash
   pnpm check-types
   ```

   This fans out `turbo run check-types` across every package that defines it. If it fails, fix type errors before proceeding.

2. **Lint the whole monorepo**

   ```bash
   pnpm lint
   ```

   Note: most package ESLint configs use `eslint-plugin-only-warn`, so errors here are rare — but Biome issues surfaced during edit should already be auto-formatted by the PostToolUse hook.

3. **Run unit tests** (only `packages/core` has tests)

   ```bash
   pnpm -F @marstv/core test
   ```

4. **Targeted re-check (optional)** — if the change only touched one app, also run that app's build to catch bundler/SSR issues:
   - Web SSR: `pnpm -F @marstv/web build`
   - Desktop: `pnpm -F @marstv/desktop build`
   - Worker types (after editing `apps/web/wrangler.jsonc`): `pnpm -F @marstv/web cf-typegen`

## Reporting

Report the outcome in one short paragraph: what passed, what failed, and (if failed) the first error line with a file:line reference. Do NOT mark the parent task complete if any step failed.
