import type {
  MediaDetail,
  SearchResponse,
  SourceConfig,
  SourceHealth,
  SourceResultMeta
} from "@marstv/contracts";
import { dedupeMedia } from "@marstv/domain";
import { macCmsUrl, parseMacCmsDetail, parseMacCmsPayload } from "@marstv/maccms";
import { guardedFetch, sha256 } from "./security";
import type { Env } from "./env";
import { Repository } from "./repository";

function errorCode(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "SOURCE_TIMEOUT";
  if (error instanceof Error) return error.message;
  return "SOURCE_ERROR";
}

async function querySource(
  source: SourceConfig,
  query: string
): Promise<{ items: SearchResponse["items"]; meta: SourceResultMeta }> {
  const start = performance.now();
  try {
    const url = macCmsUrl(source, { action: "list", query });
    const response = await guardedFetch(url.toString(), {
      allowedHosts: [...new Set([new URL(source.baseUrl).hostname, ...source.allowedHosts])],
      timeoutMs: source.timeoutMs,
      headers: source.headers
    });
    const page = parseMacCmsPayload(source, response.body, response.contentType);
    return {
      items: page.items,
      meta: {
        sourceId: source.id,
        sourceName: source.name,
        state: "ok",
        latencyMs: Math.round(performance.now() - start),
        message: null
      }
    };
  } catch (error) {
    const code = errorCode(error);
    return {
      items: [],
      meta: {
        sourceId: source.id,
        sourceName: source.name,
        state: code === "SOURCE_TIMEOUT" ? "timeout" : "error",
        latencyMs: Math.round(performance.now() - start),
        message: code
      }
    };
  }
}

export async function searchSources(
  env: Env,
  sources: readonly SourceConfig[],
  query: string,
  requestId: string
): Promise<SearchResponse> {
  const cacheKey = `search:${await sha256(query.trim().toLocaleLowerCase())}`;
  const cached = await env.CACHE.get<SearchResponse>(cacheKey, "json");
  if (cached) return { ...cached, requestId };

  const enabled = sources.filter((source) => source.enabled).sort((a, b) => a.priority - b.priority);
  const results: Awaited<ReturnType<typeof querySource>>[] = [];
  for (let index = 0; index < enabled.length; index += 4) {
    const wave = enabled.slice(index, index + 4);
    results.push(...await Promise.all(wave.map((source) => querySource(source, query))));
  }
  const response: SearchResponse = {
    query,
    items: dedupeMedia(results.flatMap((result) => result.items)),
    sources: results.map((result) => result.meta),
    partial: results.some((result) => result.meta.state !== "ok"),
    requestId
  };
  await env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 });
  return response;
}

export async function fetchDetail(source: SourceConfig, itemId: string): Promise<MediaDetail> {
  const url = macCmsUrl(source, { action: "detail", ids: [itemId] });
  const response = await guardedFetch(url.toString(), {
    allowedHosts: [...new Set([new URL(source.baseUrl).hostname, ...source.allowedHosts])],
    timeoutMs: source.timeoutMs,
    headers: source.headers
  });
  return parseMacCmsDetail(source, response.body, response.contentType);
}

export async function probeSource(env: Env, source: SourceConfig): Promise<SourceHealth> {
  const repository = new Repository(env);
  const start = performance.now();
  let health: SourceHealth;
  try {
    const url = macCmsUrl(source, { action: "list", page: 1 });
    const response = await guardedFetch(url.toString(), {
      allowedHosts: [...new Set([new URL(source.baseUrl).hostname, ...source.allowedHosts])],
      timeoutMs: source.timeoutMs,
      headers: source.headers,
      maxBytes: 1_000_000
    });
    const page = parseMacCmsPayload(source, response.body, response.contentType);
    health = {
      sourceId: source.id,
      state: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date().toISOString(),
      itemCount: page.total,
      message: null
    };
  } catch (error) {
    health = {
      sourceId: source.id,
      state: "offline",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date().toISOString(),
      itemCount: null,
      message: errorCode(error)
    };
  }
  await repository.saveHealth(health);
  return health;
}
