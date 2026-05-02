// ============================================================================
// CMS API endpoints — search, detail, availability
// ============================================================================

import type { ApiClient } from "../client.js";
import type {
	CmsAvailabilityResponse,
	CmsDetailResponse,
	CmsSearchParams,
	CmsSearchResponse,
} from "../types.js";

/** Search videos from a CMS source. */
export function searchCms(
	client: ApiClient,
	sourceKey: string,
	keyword: string,
	page = 1,
	signal?: AbortSignal,
): Promise<CmsSearchResponse> {
	const params: CmsSearchParams = { source: sourceKey, wd: keyword, pg: page };
	return client.get<CmsSearchResponse>("/api/search", params, signal);
}

/** Get full video detail with play lines and episodes. */
export function getDetail(
	client: ApiClient,
	sourceKey: string,
	id: string,
	signal?: AbortSignal,
): Promise<CmsDetailResponse> {
	return client.get<CmsDetailResponse>(
		"/api/detail",
		{ source: sourceKey, id },
		signal,
	);
}

/** Check whether a video is still available (i.e. the source returns data). */
export function checkAvailability(
	client: ApiClient,
	sourceKey: string,
	videoId: string,
	signal?: AbortSignal,
): Promise<CmsAvailabilityResponse> {
	return client.get<CmsAvailabilityResponse>(
		"/api/availability",
		{ source: sourceKey, id: videoId },
		signal,
	);
}
