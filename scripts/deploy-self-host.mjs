#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function has(name) {
  return args.includes(name);
}

function run(program, commandArgs) {
  const result = spawnSync(program, commandArgs, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

function validOrigin(rawOrigin) {
  const origin = new URL(rawOrigin);
  const local = origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  if (origin.protocol !== "https:" && !(local && origin.protocol === "http:")) {
    throw new Error("Self-hosted Passkeys require HTTPS, except on localhost.");
  }
  return origin.origin;
}

function values(file) {
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return separator < 0 ? [line, ""] : [line.slice(0, separator), line.slice(separator + 1)];
      })
  );
}

const environmentFile = resolve(root, option("--env-file") || ".env");
if (!existsSync(environmentFile)) {
  const origin = validOrigin(option("--origin") || "http://localhost:8787");
  const generated = {
    MARSTV_PUBLIC_ORIGIN: origin,
    MARSTV_SOURCE_MASTER_KEY: randomBytes(32).toString("base64url"),
    MARSTV_BOOTSTRAP_TOKEN: randomBytes(32).toString("base64url"),
    MARSTV_DOUBAN_ENABLED: "false",
    MARSTV_DOUBAN_ORIGIN: "https://movie.douban.com"
  };
  writeFileSync(
    environmentFile,
    Object.entries(generated).map(([key, value]) => `${key}=${value}`).join("\n") + "\n",
    { encoding: "utf8", mode: 0o600 }
  );
  chmodSync(environmentFile, 0o600);
  console.log(`Created ${environmentFile}`);
  console.log(`Bootstrap token: ${generated.MARSTV_BOOTSTRAP_TOKEN}`);
  console.log("Back up this file securely; the source master key is required to restore encrypted data.");
}

const environment = values(environmentFile);
const origin = validOrigin(environment.MARSTV_PUBLIC_ORIGIN || "http://localhost:8787");
for (const key of ["MARSTV_SOURCE_MASTER_KEY", "MARSTV_BOOTSTRAP_TOKEN"]) {
  if (!environment[key] || environment[key].includes("replace-with")) {
    throw new Error(`${environmentFile} is missing a production value for ${key}`);
  }
}

if (has("--prepare-only")) {
  console.log(`Self-host configuration is ready at ${environmentFile}`);
  process.exit(0);
}

run("docker", ["--version"]);
run("docker", ["compose", "version"]);
run("docker", ["compose", "--env-file", environmentFile, "config", "--quiet"]);
run("docker", ["compose", "--env-file", environmentFile, "up", "--build", "--detach"]);

if (!has("--skip-health")) {
  const endpoint = new URL("/healthz", origin);
  let healthy = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) {
        healthy = true;
        break;
      }
    } catch {
      // The container or reverse proxy may still be starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
  }
  if (!healthy) throw new Error(`Container started, but ${endpoint} did not become healthy.`);
  console.log(`Health check passed: ${endpoint}`);
}

console.log(`MarsTV is ready: ${new URL("/setup", origin)}`);
console.log(`Bootstrap token: ${environment.MARSTV_BOOTSTRAP_TOKEN}`);
