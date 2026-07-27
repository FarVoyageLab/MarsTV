import { spawnSync } from "node:child_process";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const isCloudflareBuild = process.env.WORKERS_CI === "1";
const argumentsForBuild = isCloudflareBuild
  ? ["--filter", "@marstv/web", "build"]
  : ["exec", "turbo", "run", "build"];

const result = spawnSync(pnpmCommand, argumentsForBuild, {
  stdio: "inherit",
  env: process.env
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
