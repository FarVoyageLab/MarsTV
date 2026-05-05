// Web-side bootstrap for the CMS source list.
//
// On startup we fetch /api/sources (served by the Worker from KV) and push
// the result into @marstv/core via setRuntimeSources — this keeps the
// existing `loadSources()` / `findSource()` callsites working without any
// knowledge of where the data came from.
//
// Components that need to react to admin edits during the same session use
// the useSources() hook, which subscribes to source-list updates.

import { type CmsSource, setRuntimeSources } from "@marstv/core";
import { apiPath } from "@marstv/ui/app/lib/runtime";

type SourcesResponse = {
	success: boolean;
	error?: string;
	data?: { sources: CmsSource[] };
};

let initPromise: Promise<void> | null = null;

/**
 * Fetch sources from /api/sources and hydrate the in-memory cache. Safe to
 * call multiple times — the promise is memoised, so concurrent callers share
 * one network roundtrip.
 */
export function initSources(): Promise<void> {
	if (initPromise) return initPromise;
	initPromise = (async () => {
		try {
			const res = await fetch(apiPath("/api/sources"), {
				headers: { accept: "application/json" },
			});
			if (!res.ok) return;
			const body = (await res.json()) as SourcesResponse;
			if (body.success && body.data?.sources) {
				setRuntimeSources(body.data.sources);
			}
		} catch {
			// Network failure leaves the env-based fallback in place.
		}
	})();
	return initPromise;
}

/**
 * Force a re-fetch — called by ConfigPage after a save so the rest of the
 * SPA sees the new list without a page reload.
 */
export async function refreshSources(): Promise<void> {
	initPromise = null;
	await initSources();
}
