import { XMLParser } from "fast-xml-parser";
import type {
  Episode,
  MediaDetail,
  MediaSummary,
  SourceCapabilities,
  SourceConfig
} from "@marstv/contracts";
import { inferMediaKind, mediaFingerprint } from "@marstv/domain";

export interface MacCmsPage {
  page: number;
  pageCount: number;
  limit: number;
  total: number;
  items: MediaSummary[];
}

type UnknownRecord = Record<string, unknown>;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  processEntities: false,
  allowBooleanAttributes: false,
  parseTagValue: false,
  trimValues: true
});

function record(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? value as UnknownRecord : {};
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function nullable(value: unknown): string | null {
  const result = stringValue(value);
  return result.length > 0 ? result : null;
}

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function listValue(value: unknown): string[] {
  return stringValue(value)
    .split(/[,，/]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstArray(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) return value.map(record);
  if (value === undefined || value === null) return [];
  return [record(value)];
}

function safeHttpUrl(value: unknown): string | null {
  try {
    const url = new URL(stringValue(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeRawList(payload: unknown): UnknownRecord[] {
  const root = record(payload);
  if (Array.isArray(root.list)) return root.list.map(record);
  if (root.list) return firstArray(root.list);
  const rss = record(root.rss);
  const list = record(rss.list);
  if (list.video) return firstArray(list.video);
  if (rss.video) return firstArray(rss.video);
  return [];
}

function sourceItemId(item: UnknownRecord): string {
  return stringValue(item.vod_id || item.id);
}

function toSummary(source: SourceConfig, item: UnknownRecord): MediaSummary {
  const title = stringValue(item.vod_name || item.name) || "未命名条目";
  const year = numberValue(item.vod_year || item.year);
  const category = nullable(item.type_name || item.type);
  const remarks = nullable(item.vod_remarks || item.note);
  const kind = inferMediaKind(category, remarks);
  const id = sourceItemId(item);
  return {
    id: `${source.id}:${id}`,
    sourceId: source.id,
    sourceItemId: id,
    fingerprint: mediaFingerprint({ title, year, kind }),
    title,
    subtitle: nullable(item.vod_sub || item.subname),
    kind,
    year,
    category,
    posterUrl: safeHttpUrl(item.vod_pic || item.pic),
    backdropUrl: safeHttpUrl(item.vod_pic_slide || item.vod_pic_thumb),
    remarks,
    score: numberValue(item.vod_score || item.score),
    updatedAt: nullable(item.vod_time || item.last)
  };
}

export function parsePlayLines(
  sourceId: string,
  sourceItemIdValue: string,
  playFromValue: unknown,
  playUrlValue: unknown
): Episode[] {
  const lineNames = stringValue(playFromValue).split("$$$");
  const lineValues = stringValue(playUrlValue).split("$$$");
  const episodes: Episode[] = [];
  const lineCount = Math.max(lineNames.length, lineValues.length);

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const lineId = lineNames[lineIndex]?.trim() || `line-${lineIndex + 1}`;
    const rawEpisodes = lineValues[lineIndex]?.split("#") ?? [];
    rawEpisodes.forEach((rawEpisode, episodeIndex) => {
      const value = rawEpisode.trim();
      if (!value) return;
      const separator = value.indexOf("$");
      const label = separator >= 0 ? value.slice(0, separator).trim() : `第 ${episodeIndex + 1} 集`;
      const url = separator >= 0 ? value.slice(separator + 1).trim() : value;
      if (!url) return;
      episodes.push({
        id: `${sourceId}:${sourceItemIdValue}:${lineIndex}:${episodeIndex}`,
        label: label || `第 ${episodeIndex + 1} 集`,
        sourceId,
        sourceItemId: sourceItemIdValue,
        lineId,
        lineLabel: lineId,
        url,
        order: episodeIndex
      });
    });
  }

  return episodes;
}

export function parseMacCmsPayload(
  source: SourceConfig,
  raw: string,
  contentType = "application/json"
): MacCmsPage {
  if (raw.length > 5_000_000) throw new Error("SOURCE_RESPONSE_TOO_LARGE");
  let payload: unknown;
  const looksXml = contentType.includes("xml") || raw.trimStart().startsWith("<");
  try {
    payload = looksXml ? xmlParser.parse(raw) : JSON.parse(raw);
  } catch {
    throw new Error("SOURCE_RESPONSE_INVALID");
  }

  const root = record(payload);
  const rss = record(root.rss);
  const items = normalizeRawList(payload).map((item) => toSummary(source, item));
  return {
    page: numberValue(root.page || rss.page) ?? 1,
    pageCount: numberValue(root.pagecount || rss.pagecount) ?? 1,
    limit: numberValue(root.limit || rss.limit) ?? items.length,
    total: numberValue(root.total || rss.recordcount) ?? items.length,
    items
  };
}

export function parseMacCmsDetail(
  source: SourceConfig,
  raw: string,
  contentType = "application/json"
): MediaDetail {
  const page = parseMacCmsPayload(source, raw, contentType);
  if (page.items.length === 0) throw new Error("SOURCE_ITEM_NOT_FOUND");

  const payload = contentType.includes("xml") || raw.trimStart().startsWith("<")
    ? xmlParser.parse(raw)
    : JSON.parse(raw) as unknown;
  const item = normalizeRawList(payload)[0] ?? {};
  const summary = page.items[0]!;
  return {
    ...summary,
    description: nullable(item.vod_content || item.vod_blurb || item.des),
    director: listValue(item.vod_director || item.director),
    actors: listValue(item.vod_actor || item.actor),
    area: listValue(item.vod_area || item.area),
    language: listValue(item.vod_lang || item.lang),
    tags: listValue(item.vod_tag || item.tag),
    episodes: parsePlayLines(
      source.id,
      summary.sourceItemId,
      item.vod_play_from || item.from,
      item.vod_play_url || item.dl
    ),
    metadata: null
  };
}

export function macCmsUrl(
  source: Pick<SourceConfig, "baseUrl">,
  input: { action: "list" | "detail"; page?: number; query?: string; ids?: string[] }
): URL {
  const base = new URL(source.baseUrl);
  const marker = "/api.php/provide/vod";
  if (!base.pathname.includes(marker)) {
    base.pathname = `${base.pathname.replace(/\/$/u, "")}${marker}/`;
  }
  base.searchParams.set("ac", input.action);
  if (input.page) base.searchParams.set("pg", String(input.page));
  if (input.query) base.searchParams.set("wd", input.query);
  if (input.ids?.length) base.searchParams.set("ids", input.ids.join(","));
  return base;
}

export function defaultCapabilities(): SourceCapabilities {
  return {
    json: true,
    xml: true,
    search: true,
    detail: true,
    categories: true,
    directPlayback: true
  };
}
