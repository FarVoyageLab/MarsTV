import type { CmsSource, VideoDetail, VideoItem } from "@marstv/core";

const API_BASE = "/api";

interface FetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
    return res.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function searchCms(
  source: CmsSource,
  keyword: string,
  page = 1,
): Promise<{ list: VideoItem[]; total: number }> {
  const q = new URLSearchParams({
    source: source.key,
    wd: keyword,
    pg: String(page),
  });
  return apiFetch(`/search?${q}`);
}

export function getDetail(source: CmsSource, id: string): Promise<VideoDetail> {
  const q = new URLSearchParams({ source: source.key, id });
  return apiFetch(`/detail?${q}`);
}

export function checkAvailability(
  sourceKey: string,
  videoId: string,
): Promise<{ available: boolean }> {
  const q = new URLSearchParams({ source: sourceKey, id: videoId });
  return apiFetch(`/availability?${q}`);
}

export async function searchAllCms(
  sources: CmsSource[],
  keyword: string,
): Promise<{ source: CmsSource; items: VideoItem[] }[]> {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const { list } = await searchCms(source, keyword);
      return { source, items: list };
    }),
  );
  return results
    .filter(
      (
        r,
      ): r is PromiseFulfilledResult<{
        source: CmsSource;
        items: VideoItem[];
      }> => r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter((r) => r.items.length > 0);
}
