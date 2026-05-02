// ============================================================================
// Storage API endpoints — play history, favorites, subscriptions.
// All storage operations are scoped to the current session / device via
// a server-side identifier (IP, session cookie, or user token).
// ============================================================================

import type { ApiClient } from "../client.js";
import type {
	AcknowledgeSubscriptionBody,
	FavoriteRecord,
	PlayRecord,
	RemoveFavoriteBody,
	SaveFavoriteBody,
	SavePlayRecordBody,
	SaveSubscriptionBody,
	StorageListResponse,
	SubscriptionRecord,
} from "../types.js";

// ─── Play records ───────────────────────────────────────────────────────────

/** List all play records (watch history). */
export function listPlayRecords(
	client: ApiClient,
	signal?: AbortSignal,
): Promise<StorageListResponse<PlayRecord>> {
	return client.get<StorageListResponse<PlayRecord>>(
		"/api/storage/play-records",
		undefined,
		signal,
	);
}

/** Get a single play record. */
export function getPlayRecord(
	client: ApiClient,
	source: string,
	id: string,
	signal?: AbortSignal,
): Promise<PlayRecord | null> {
	return client.get<PlayRecord | null>(
		"/api/storage/play-records",
		{ source, id },
		signal,
	);
}

/** Save or update a play record. */
export function savePlayRecord(
	client: ApiClient,
	body: SavePlayRecordBody,
	signal?: AbortSignal,
): Promise<{ success: boolean }> {
	return client.post<{ success: boolean }>(
		"/api/storage/play-records",
		body,
		signal,
	);
}

/** Remove a single play record. */
export function removePlayRecord(
	client: ApiClient,
	source: string,
	id: string,
	signal?: AbortSignal,
): Promise<{ success: boolean }> {
	return client.delete<{ success: boolean }>(
		"/api/storage/play-records",
		{ source, id },
		signal,
	);
}

/** Clear all play records. */
export function clearPlayRecords(
	client: ApiClient,
	signal?: AbortSignal,
): Promise<{ success: boolean }> {
	return client.delete<{ success: boolean }>(
		"/api/storage/play-records",
		undefined,
		signal,
	);
}

// ─── Favorites ──────────────────────────────────────────────────────────────

/** List all favorites. */
export function listFavorites(
	client: ApiClient,
	signal?: AbortSignal,
): Promise<StorageListResponse<FavoriteRecord>> {
	return client.get<StorageListResponse<FavoriteRecord>>(
		"/api/storage/favorites",
		undefined,
		signal,
	);
}

/** Check if a video is favourited. */
export function hasFavorite(
	client: ApiClient,
	source: string,
	id: string,
	signal?: AbortSignal,
): Promise<{ has: boolean }> {
	return client.get<{ has: boolean }>(
		"/api/storage/favorites",
		{ source, id },
		signal,
	);
}

/** Add a favourite. */
export function addFavorite(
	client: ApiClient,
	body: SaveFavoriteBody,
	signal?: AbortSignal,
): Promise<{ success: boolean }> {
	return client.post<{ success: boolean }>(
		"/api/storage/favorites",
		body,
		signal,
	);
}

/** Remove a favourite. */
export function removeFavorite(
	client: ApiClient,
	body: RemoveFavoriteBody,
	signal?: AbortSignal,
): Promise<{ success: boolean }> {
	return client.delete<{ success: boolean }>(
		"/api/storage/favorites",
		body,
		signal,
	);
}

/** Clear all favourites. */
export function clearFavorites(
	client: ApiClient,
	signal?: AbortSignal,
): Promise<{ success: boolean }> {
	return client.delete<{ success: boolean }>(
		"/api/storage/favorites",
		undefined,
		signal,
	);
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

/** List all subscriptions. */
export function listSubscriptions(
	client: ApiClient,
	signal?: AbortSignal,
): Promise<StorageListResponse<SubscriptionRecord>> {
	return client.get<StorageListResponse<SubscriptionRecord>>(
		"/api/storage/subscriptions",
		undefined,
		signal,
	);
}

/** Check if a video is subscribed. */
export function hasSubscription(
	client: ApiClient,
	source: string,
	id: string,
	signal?: AbortSignal,
): Promise<{ has: boolean }> {
	return client.get<{ has: boolean }>(
		"/api/storage/subscriptions",
		{ source, id },
		signal,
	);
}

/** Get a single subscription. */
export function getSubscription(
	client: ApiClient,
	source: string,
	id: string,
	signal?: AbortSignal,
): Promise<SubscriptionRecord | null> {
	return client.get<SubscriptionRecord | null>(
		"/api/storage/subscriptions",
		{ source, id },
		signal,
	);
}

/** Subscribe to a video. */
export function saveSubscription(
	client: ApiClient,
	body: SaveSubscriptionBody,
	signal?: AbortSignal,
): Promise<{ success: boolean }> {
	return client.post<{ success: boolean }>(
		"/api/storage/subscriptions",
		body,
		signal,
	);
}

/** Remove a subscription. */
export function removeSubscription(
	client: ApiClient,
	source: string,
	id: string,
	signal?: AbortSignal,
): Promise<{ success: boolean }> {
	return client.delete<{ success: boolean }>(
		"/api/storage/subscriptions",
		{ source, id },
		signal,
	);
}

/** Acknowledge new episodes (bump knownEpisodeCount). */
export function acknowledgeSubscription(
	client: ApiClient,
	body: AcknowledgeSubscriptionBody,
	signal?: AbortSignal,
): Promise<{ success: boolean }> {
	return client.put<{ success: boolean }>(
		"/api/storage/subscriptions/acknowledge",
		body,
		signal,
	);
}

/** Clear all subscriptions. */
export function clearSubscriptions(
	client: ApiClient,
	signal?: AbortSignal,
): Promise<{ success: boolean }> {
	return client.delete<{ success: boolean }>(
		"/api/storage/subscriptions",
		undefined,
		signal,
	);
}
