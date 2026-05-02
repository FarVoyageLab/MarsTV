// ============================================================================
// API contract types — request params and response shapes for every MarsTV
// API endpoint.
//
// Core domain types (VideoItem, PlayRecord, etc.) are reclaimed from
// @marstv/core and re-declared here so this package is self-contained for
// tsc with NodeNext resolution (the core package uses bare re-exports that
// are incompatible with --moduleResolution node16/nodenext).
// ============================================================================

// ─── Core domain types (mirrored from @marstv/core) ──────────────────────

export interface VideoItem {
	source: string;
	id: string;
	title: string;
	poster?: string;
	category?: string;
	year?: string;
	area?: string;
	desc?: string;
	remarks?: string;
	rating?: number;
}

export interface Episode {
	title: string;
	url: string;
}

export interface PlayLine {
	name: string;
	episodes: Episode[];
}

export interface VideoDetail extends VideoItem {
	lines: PlayLine[];
	updateTime?: string;
}

export interface SpeedTestResult {
	source: string;
	line: string;
	firstChunkMs: number;
	bitrateKbps: number;
	score: number;
}

export interface DoubanItem {
	id: string;
	title: string;
	rate: string;
	cover: string;
	url: string;
	isNew: boolean;
	playable: boolean;
}

export interface PlayRecord {
	source: string;
	sourceName?: string;
	id: string;
	title: string;
	poster?: string;
	lineIdx: number;
	lineName?: string;
	epIdx: number;
	positionSec: number;
	durationSec: number;
	updatedAt: number;
}

export interface FavoriteRecord {
	source: string;
	sourceName?: string;
	id: string;
	title: string;
	poster?: string;
	updatedAt: number;
}

export interface SubscriptionRecord {
	source: string;
	sourceName?: string;
	id: string;
	title: string;
	poster?: string;
	lineIdx: number;
	lineName?: string;
	knownEpisodeCount: number;
	latestEpisodeCount: number;
	subscribedAt: number;
	lastCheckedAt: number;
}

// ─── Generic wrappers ───────────────────────────────────────────────────────

/** Standard JSON response wrapper used by all MarsTV API routes. */
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

/** Paginated list wrapper. */
export interface PaginatedList<T> {
	list: T[];
	total: number;
	page: number;
	pageCount: number;
}

// ─── CMS ────────────────────────────────────────────────────────────────────

export interface CmsSearchParams {
	source: string;
	wd: string;
	pg?: number;
}

export type CmsSearchResponse = PaginatedList<VideoItem>;

export interface CmsDetailParams {
	source: string;
	id: string;
}

export type CmsDetailResponse = VideoDetail;

export interface CmsAvailabilityParams {
	source: string;
	id: string;
}

export interface CmsAvailabilityResponse {
	available: boolean;
}

// ─── Proxy ───────────────────────────────────────────────────────────────────

/** Input for building a signed proxy URL. The signature itself must be
 *  generated server-side; the client only assembles the final URL. */
export interface ProxyUrlInput {
	upstreamUrl: string;
	token: string;
	expiresAt: number;
}

// ─── Douban ─────────────────────────────────────────────────────────────────

export interface DoubanRequestParams {
	type: "movie" | "tv";
	tag: string;
	pageSize?: number;
	pageStart?: number;
	sort?: "recommend" | "time" | "rank";
}

export interface DoubanResponseData {
	items: DoubanItem[];
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export interface StorageListResponse<T> {
	items: T[];
}

// Play records
export interface SavePlayRecordBody {
	source: string;
	id: string;
	title: string;
	poster?: string;
	lineIdx: number;
	lineName?: string;
	epIdx: number;
	positionSec: number;
	durationSec: number;
}

// Favorites
export interface SaveFavoriteBody {
	source: string;
	id: string;
	title: string;
	poster?: string;
}

export interface RemoveFavoriteBody {
	source: string;
	id: string;
}

// Subscriptions
export interface SaveSubscriptionBody {
	source: string;
	id: string;
	title: string;
	poster?: string;
	lineIdx: number;
	lineName?: string;
	knownEpisodeCount: number;
}

export interface AcknowledgeSubscriptionBody {
	source: string;
	id: string;
}

// ─── Speedtest ───────────────────────────────────────────────────────────────

export interface SpeedtestRequestBody {
	sources: Array<{
		source: string;
		line: string;
		url: string;
	}>;
}

export type SpeedtestResponseData = SpeedTestResult[];

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequestBody {
	password: string;
}

export interface LoginResponseData {
	success: boolean;
}
