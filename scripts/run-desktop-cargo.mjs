import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const action = process.argv[2];

if (action !== "check" && action !== "test") {
  throw new Error("Expected the Cargo action to be `check` or `test`.");
}

function run(program, args) {
  const result = spawnSync(program, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const cargo = process.platform === "win32" ? "cargo.exe" : "cargo";

run(pnpm, ["--filter", "@marstv/web", "build"]);
run(cargo, [
  action,
  "--manifest-path",
  join(root, "apps", "desktop", "src-tauri", "Cargo.toml")
]);
