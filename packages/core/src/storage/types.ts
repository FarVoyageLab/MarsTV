// ============================================================================
// Platform-neutral storage abstraction.
// Shared across Web / Desktop / Mobile / TV. Concrete backends:
//   - LocalStorage (browser)           → storage/local.ts
//   - Upstash / Redis (server)         → future: storage/redis.ts
//   - SecureStore / MMKV (mobile)      → future: storage/native.ts
//
// All methods are async so the IStorage contract holds regardless of whether
// the backend is synchronous (localStorage) or remote (Redis/Upstash).
// ============================================================================

export interface PlayRecord {
	source: string;
	/** Human-readable source name (CmsSource.name). Optional for backward compat. */
	sourceName?: string;
	id: string;
	title: string;
	poster?: string;
	lineIdx: number;
	/** Human-readable line name (PlayLine.name). Optional for backward compat. */
	lineName?: string;
	epIdx: number;
	/** Current playback position, seconds. */
	positionSec: number;
	/** Duration of the episode when the record was saved, seconds. 0 if unknown. */
	durationSec: number;
	/** epoch milliseconds */
	updatedAt: number;
}

export interface FavoriteRecord {
	source: string;
	/** Human-readable source name (CmsSource.name). Optional for backward compat. */
	sourceName?: string;
	id: string;
	title: string;
	poster?: string;
	/** epoch milliseconds */
	updatedAt: number;
}

export interface IStorage {
	// Play records — the last known position for (source, id) across lines/eps.
	listPlayRecords(): Promise<PlayRecord[]>;
	getPlayRecord(source: string, id: string): Promise<PlayRecord | null>;
	putPlayRecord(record: PlayRecord): Promise<void>;
	removePlayRecord(source: string, id: string): Promise<void>;
	clearPlayRecords(): Promise<void>;

	// Favorites — simple bookmark list.
	listFavorites(): Promise<FavoriteRecord[]>;
	hasFavorite(source: string, id: string): Promise<boolean>;
	addFavorite(record: FavoriteRecord): Promise<void>;
	removeFavorite(source: string, id: string): Promise<void>;
	clearFavorites(): Promise<void>;
}

export function makePlayRecordKey(source: string, id: string): string {
	return `${source}::${id}`;
}
