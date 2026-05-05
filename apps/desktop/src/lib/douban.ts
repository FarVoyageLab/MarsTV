import {
	type CmsRuntimeSource,
	type CmsSearchResult,
	type CmsVideoDetail,
	type DoubanResult,
	registerRuntimeHandlers,
} from "@marstv/ui/app/lib/runtime";
import { invoke } from "@tauri-apps/api/core";

const imageCache = new Map<string, Promise<string>>();
const cmsImageCache = new Map<string, Promise<string>>();

export function initDesktopRuntime(): void {
	registerRuntimeHandlers({
		fetchDouban: (request, signal) => {
			if (signal?.aborted) {
				return Promise.reject(new DOMException("Aborted", "AbortError"));
			}
			return invoke<DoubanResult>("search_douban", { request });
		},
		resolveDoubanImage: (src, signal) => {
			if (signal?.aborted) {
				return Promise.reject(new DOMException("Aborted", "AbortError"));
			}
			const cached = imageCache.get(src);
			if (cached) return cached;
			const promise = invoke<string>("fetch_douban_image", { src }).catch(
				(error) => {
					imageCache.delete(src);
					throw error;
				},
			);
			imageCache.set(src, promise);
			return promise;
		},
		resolveCmsImage: (src, signal) => {
			if (signal?.aborted) {
				return Promise.reject(new DOMException("Aborted", "AbortError"));
			}
			const cached = cmsImageCache.get(src);
			if (cached) return cached;
			const promise = invoke<string>("fetch_cms_image", { src }).catch(
				(error) => {
					cmsImageCache.delete(src);
					throw error;
				},
			);
			cmsImageCache.set(src, promise);
			return promise;
		},
		searchCms: (
			source: CmsRuntimeSource,
			keyword: string,
			page = 1,
			signal,
		) => {
			if (signal?.aborted) {
				return Promise.reject(new DOMException("Aborted", "AbortError"));
			}
			return invoke<CmsSearchResult>("search_cms", {
				source,
				keyword,
				page,
			});
		},
		getCmsDetail: (source: CmsRuntimeSource, id: string, signal) => {
			if (signal?.aborted) {
				return Promise.reject(new DOMException("Aborted", "AbortError"));
			}
			return invoke<CmsVideoDetail>("get_cms_detail", { source, id });
		},
		resolvePlaybackUrl: (src) =>
			`http://marsplay.localhost/m3u8?u=${encodeURIComponent(src)}`,
		settingsPath: "/settings",
	});
}
