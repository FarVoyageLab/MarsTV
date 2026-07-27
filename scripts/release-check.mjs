import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const required = [
  "LICENSE",
  "LICENSES/MarsTV-App-Store-Exception.txt",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
  "CLA.md",
  "docs/openapi.yaml",
  "docs/security-privacy.md",
  "docs/store-review.md",
  "RELEASE-GATE.md"
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length > 0) {
  throw new Error(`Missing release documents: ${missing.join(", ")}`);
}

const wrangler = readFileSync("apps/edge/wrangler.jsonc", "utf8");
const blockers = [];
if (wrangler.includes("replace-with-")) {
  blockers.push("Cloudflare D1/KV resource IDs are still placeholders.");
}
if (process.env.MARSTV_DOUBAN_ENABLED === "true" && !process.env.MARSTV_DOUBAN_LEGAL_APPROVAL_ID) {
  blockers.push("Douban is enabled without MARSTV_DOUBAN_LEGAL_APPROVAL_ID.");
}

for (const [command, args] of [
  ["corepack", ["pnpm", "check"]],
  ["corepack", ["pnpm", "test"]],
  ["corepack", ["pnpm", "--filter", "@marstv/web", "build"]],
  ["corepack", ["pnpm", "--filter", "@marstv/server", "build"]],
  ["corepack", ["pnpm", "--filter", "@marstv/edge", "build"]],
  ["corepack", ["pnpm", "--filter", "@marstv/mobile", "build"]],
  ["corepack", ["pnpm", "--filter", "@marstv/tv", "build"]],
  ["corepack", ["pnpm", "sbom"]]
]) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (blockers.length > 0) {
  throw new Error(`Release blocked:\n- ${blockers.join("\n- ")}`);
}
