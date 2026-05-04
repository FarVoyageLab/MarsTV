#!/usr/bin/env node
// Post-build step for Cloudflare Workers Builds.
//
// The @cloudflare/vite-plugin emits `dist/marstv_web/wrangler.json`, which
// `wrangler deploy` reads instead of the source `wrangler.jsonc`. Our source
// file ships with a placeholder KV id so forks build out of the box; on
// deploy we substitute the real id from the `MARSTV_CMS_KV_ID` env var so
// it never needs to land in git.
//
// No-op when the env var is unset (local builds, dry runs).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PLACEHOLDER = "0123456789abcdef0123456789abcdef";
const CONFIG_PATH = resolve("dist/marstv_web/wrangler.json");
const kvId = process.env.MARSTV_CMS_KV_ID;

if (!kvId) {
	console.log("[inject-kv-id] MARSTV_CMS_KV_ID not set — leaving placeholder");
	process.exit(0);
}

if (!/^[0-9a-f]{32}$/i.test(kvId)) {
	console.error(
		`[inject-kv-id] MARSTV_CMS_KV_ID does not look like a valid KV id (expected 32 hex chars), got: ${kvId}`,
	);
	process.exit(1);
}

let raw;
try {
	raw = readFileSync(CONFIG_PATH, "utf8");
} catch (err) {
	console.error(`[inject-kv-id] Could not read ${CONFIG_PATH}:`, err.message);
	process.exit(1);
}

if (!raw.includes(PLACEHOLDER)) {
	console.log(
		"[inject-kv-id] placeholder not found — config may already be patched",
	);
	process.exit(0);
}

writeFileSync(CONFIG_PATH, raw.replaceAll(PLACEHOLDER, kvId));
console.log(`[inject-kv-id] patched ${CONFIG_PATH}`);
