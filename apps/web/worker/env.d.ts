// Worker env bindings — declared globally so worker/index.ts can type the
// `env` parameter without depending on the generated worker-configuration.d.ts
// (which lives outside the worker tsconfig include set).

import type { KVNamespace } from "@cloudflare/workers-types";

declare global {
	interface Env {
		/** Admin login password (set via `wrangler secret put ADMIN_PASSWORD`). */
		ADMIN_PASSWORD?: string;
		/** HMAC secret for signing session cookies (`wrangler secret put SESSION_SECRET`). */
		SESSION_SECRET?: string;
		/** KV namespace storing the CMS source list. */
		MARSTV_CMS: KVNamespace;
	}
}

export {};
