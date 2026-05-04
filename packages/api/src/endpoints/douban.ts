// ============================================================================
// Douban API endpoint — fetches curated rankings from the server-side proxy.
// ============================================================================

import type { ApiClient } from "@marstv/api/client";
import type { DoubanRequestParams, DoubanResponseData } from "@marstv/api/types";

/** Fetch curated Douban rankings (movie / tv categories). */
export function fetchDouban(
	client: ApiClient,
	params: DoubanRequestParams,
	signal?: AbortSignal,
): Promise<DoubanResponseData> {
	return client.get<DoubanResponseData>("/api/douban", params, signal);
}
