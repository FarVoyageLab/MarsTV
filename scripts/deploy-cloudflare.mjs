#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stateDirectory = join(root, ".marstv");
const defaultSecretsFile = join(stateDirectory, "cloudflare-secrets.env");
const exampleSecretsFile = join(root, ".dev.vars.example");
const configFile = join(root, "wrangler.jsonc");
const wranglerLog = join(stateDirectory, "wrangler.log");
const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function has(name) {
  return args.includes(name);
}

function command(program, commandArgs, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(program, commandArgs, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || wranglerLog
    },
    stdio: capture ? "pipe" : "inherit"
  });
  if (!allowFailure && result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    if (output) console.error(output);
    process.exit(result.status || 1);
  }
  return result;
}

function wrangler(commandArgs, options) {
  return command("pnpm", ["exec", "wrangler", ...commandArgs, "--config", configFile], options);
}

function parseSecrets(file) {
  const entries = Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return separator < 0 ? [line, ""] : [line.slice(0, separator), line.slice(separator + 1)];
      })
  );
  for (const key of ["MARSTV_SOURCE_MASTER_KEY", "MARSTV_BOOTSTRAP_TOKEN"]) {
    if (!entries[key] || entries[key].includes("replace-with")) {
      throw new Error(`${file} is missing a production value for ${key}`);
    }
  }
  return entries;
}

function ensureLocalSecrets(requestedFile) {
  const file = resolve(root, requestedFile || defaultSecretsFile);
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    const values = {
      MARSTV_SOURCE_MASTER_KEY: randomBytes(32).toString("base64url"),
      MARSTV_BOOTSTRAP_TOKEN: randomBytes(32).toString("base64url")
    };
    writeFileSync(
      file,
      Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n") + "\n",
      { encoding: "utf8", mode: 0o600 }
    );
    chmodSync(file, 0o600);
    console.log(`Created encrypted-configuration keys at ${file}`);
    console.log(`Bootstrap token: ${values.MARSTV_BOOTSTRAP_TOKEN}`);
    console.log("Store both values in a password manager before removing the local file.");
  }
  parseSecrets(file);
  return file;
}

function deployArguments(secretsFile, extra = []) {
  const values = ["deploy", "--strict", ...extra];
  if (secretsFile) values.push("--secrets-file", secretsFile);
  return values;
}

function migrationArguments(action) {
  return ["d1", "migrations", action, "DB", "--remote"];
}

function deploymentUrl(output) {
  const custom = process.env.MARSTV_PUBLIC_ORIGIN?.trim();
  if (custom) return new URL(custom).origin;
  return output.match(/https:\/\/[A-Za-z0-9.-]+\.workers\.dev/gu)?.at(-1);
}

async function waitForHealth(origin) {
  if (!origin || has("--skip-health")) return;
  const endpoint = new URL("/healthz", origin);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(5_000) });
      if (response.ok) {
        console.log(`Health check passed: ${endpoint}`);
        return;
      }
    } catch {
      // The deployment can take a few seconds to propagate.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_500));
  }
  throw new Error(`Deployment completed, but ${endpoint} did not become healthy.`);
}

mkdirSync(stateDirectory, { recursive: true });

if (has("--dry-run")) {
  console.log("Building MarsTV Web for Cloudflare Workers...");
  command("pnpm", ["--filter", "@marstv/web", "build"]);
  wrangler(deployArguments(exampleSecretsFile, [
    "--dry-run",
    "--outdir",
    join(root, "apps/edge/dist")
  ]));
  console.log("Cloudflare deployment dry-run passed.");
  process.exit(0);
}

const authenticated = wrangler(["whoami", "--json"], { capture: true, allowFailure: true });
if (authenticated.status !== 0) {
  console.error("Cloudflare authentication is required. Run `pnpm cloudflare:login` and retry.");
  process.exit(1);
}

console.log("Building MarsTV Web for Cloudflare Workers...");
command("pnpm", ["--filter", "@marstv/web", "build"]);

const workersBuild = process.env.WORKERS_CI === "1";
const secretsFile = workersBuild
  ? undefined
  : ensureLocalSecrets(option("--secrets-file") || process.env.MARSTV_CLOUDFLARE_SECRETS_FILE);

const existingDatabase = wrangler(migrationArguments("list"), {
  capture: true,
  allowFailure: true
});

let deployed;
if (existingDatabase.status === 0) {
  console.log("Applying D1 migrations before deploying the new Worker version...");
  wrangler(migrationArguments("apply"));
  deployed = wrangler(deployArguments(secretsFile), { capture: true });
} else {
  console.log("First deployment: provisioning D1, KV, R2, Queues, and Durable Objects...");
  deployed = wrangler(deployArguments(secretsFile), { capture: true });
  console.log("Applying the initial D1 schema...");
  wrangler(migrationArguments("apply"));
}

if (deployed.stdout) console.log(deployed.stdout);
if (deployed.stderr) console.error(deployed.stderr);
const origin = deploymentUrl(`${deployed.stdout || ""}\n${deployed.stderr || ""}`);
await waitForHealth(origin);
console.log(origin ? `MarsTV is ready: ${new URL("/setup", origin)}` : "MarsTV is deployed. Open its /setup route to create the Owner.");
