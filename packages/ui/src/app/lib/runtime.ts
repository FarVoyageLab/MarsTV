const API_ORIGIN_STORAGE_KEY = "marstv:api-origin";
const env =
	(import.meta as unknown as { env?: Record<string, string | undefined> })
		.env ?? {};

export type DoubanRequest = {
	type: "movie" | "tv";
	tag: string;
	pageSize?: number;
	pageStart?: number;
	sort?: "recommend" | "time" | "rank";
};

export type DoubanItem = {
	id: string;
	title: string;
	rate: string;
	cover: string;
	url: string;
	isNew: boolean;
	playable: boolean;
};

export type DoubanResult = {
	items: DoubanItem[];
};

export type CmsRuntimeSource = {
	key: string;
	name: string;
	api: string;
	detail?: string;
	adult?: boolean;
	enabled?: boolean;
};

export type CmsSearchResult = {
	list: Array<{
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
	}>;
	total: number;
	page: number;
	pageCount: number;
};

export type CmsVideoDetail = CmsSearchResult["list"][number] & {
	lines: Array<{
		name: string;
		episodes: Array<{ title: string; url: string }>;
	}>;
	updateTime?: string;
};

type RuntimeHandlers = {
	fetchDouban?: (
		request: DoubanRequest,
		signal?: AbortSignal,
	) => Promise<DoubanResult>;
	resolveDoubanImage?: (src: string, signal?: AbortSignal) => Promise<string>;
	resolveCmsImage?: (src: string, signal?: AbortSignal) => Promise<string>;
	searchCms?: (
		source: CmsRuntimeSource,
		keyword: string,
		page?: number,
		signal?: AbortSignal,
	) => Promise<CmsSearchResult>;
	getCmsDetail?: (
		source: CmsRuntimeSource,
		id: string,
		signal?: AbortSignal,
	) => Promise<CmsVideoDetail>;
	resolvePlaybackUrl?: (src: string) => string;
	settingsPath?: string;
};

const runtimeHandlers: RuntimeHandlers = {};

export function registerRuntimeHandlers(handlers: RuntimeHandlers): void {
	Object.assign(runtimeHandlers, handlers);
}

export function getRuntimeDoubanHandler(): RuntimeHandlers["fetchDouban"] {
	return runtimeHandlers.fetchDouban;
}

export function getRuntimeCmsSearchHandler(): RuntimeHandlers["searchCms"] {
	return runtimeHandlers.searchCms;
}

export function getRuntimeSettingsPath(): string {
	return runtimeHandlers.settingsPath ?? "/config";
}

export function getRuntimeCmsDetailHandler(): RuntimeHandlers["getCmsDetail"] {
	return runtimeHandlers.getCmsDetail;
}

export function resolvePlaybackUrl(src: string): string {
	const resolver = runtimeHandlers.resolvePlaybackUrl;
	if (resolver) return resolver(src);
	return apiPath(`/api/proxy/m3u8?u=${encodeURIComponent(src)}`);
}

export function doubanImagePath(src: string): string {
	return runtimeHandlers.fetchDouban
		? src
		: apiPath(`/api/image/douban?u=${encodeURIComponent(src)}`);
}

export function resolveDoubanImage(
	src: string,
	signal?: AbortSignal,
): Promise<string> {
	const resolver = runtimeHandlers.resolveDoubanImage;
	if (resolver) return resolver(src, signal);
	return Promise.resolve(doubanImagePath(src));
}

export function cmsImagePath(src: string): string {
	return runtimeHandlers.resolveCmsImage
		? src
		: apiPath(`/api/image/cms?u=${encodeURIComponent(src)}`);
}

export function resolveCmsImage(
	src: string,
	signal?: AbortSignal,
): Promise<string> {
	const resolver = runtimeHandlers.resolveCmsImage;
	if (resolver) return resolver(src, signal);
	return Promise.resolve(cmsImagePath(src));
}

function normalizeOrigin(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	if (!trimmed) return null;
	try {
		const url = new URL(trimmed);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		return url.origin;
	} catch {
		return null;
	}
}

export function getStoredApiOrigin(): string {
	if (typeof localStorage === "undefined") return "";
	return localStorage.getItem(API_ORIGIN_STORAGE_KEY) ?? "";
}

export function setStoredApiOrigin(value: string): void {
	if (typeof localStorage === "undefined") return;
	const normalized = normalizeOrigin(value);
	if (normalized) {
		localStorage.setItem(API_ORIGIN_STORAGE_KEY, normalized);
		return;
	}
	localStorage.removeItem(API_ORIGIN_STORAGE_KEY);
}

export function getApiOrigin(): string {
	const envOrigin = normalizeOrigin(env.VITE_MARSTV_API_ORIGIN);
	if (envOrigin) return envOrigin;

	const storedOrigin = normalizeOrigin(getStoredApiOrigin());
	if (storedOrigin) return storedOrigin;

	if (typeof window !== "undefined") return window.location.origin;
	return "http://localhost";
}

export function apiPath(path: string): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const envOrigin = normalizeOrigin(env.VITE_MARSTV_API_ORIGIN);
	const storedOrigin = normalizeOrigin(getStoredApiOrigin());
	const apiOrigin = envOrigin ?? storedOrigin;
	return apiOrigin ? `${apiOrigin}${normalizedPath}` : normalizedPath;
}
