import { spawnSync } from "node:child_process";

for (const platform of ["ios", "android"]) {
  const result = spawnSync(
    "corepack",
    ["pnpm", "exec", "expo", "export", "--platform", platform, "--output-dir", `dist/${platform}`],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit"
    }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
