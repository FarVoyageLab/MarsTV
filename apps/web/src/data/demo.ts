import type { MediaDetail, MediaSummary, SourceConfig, SourceHealth } from "@marstv/contracts";

export interface Artwork {
  column: number;
  row: number;
}

export interface DemoMedia extends MediaSummary {
  artwork: Artwork;
  progress?: number;
}

const entries: Array<{
  title: string;
  subtitle: string;
  kind: "movie" | "series";
  year: number;
  category: string;
  remarks: string;
  score: number;
  artwork: Artwork;
  progress?: number;
}> = [
  { title: "遗落之环", subtitle: "The Abandoned Ring", kind: "series", year: 2026, category: "科幻剧集", remarks: "更新至 04", score: 8.6, artwork: { column: 0, row: 0 }, progress: 48 },
  { title: "暗潮之下", subtitle: "Beneath the Tide", kind: "movie", year: 2025, category: "悬疑电影", remarks: "正片", score: 8.1, artwork: { column: 2, row: 0 }, progress: 72 },
  { title: "山脉之间", subtitle: "Between Ranges", kind: "series", year: 2026, category: "冒险剧集", remarks: "全 8 集", score: 7.9, artwork: { column: 1, row: 0 }, progress: 31 },
  { title: "时光碎片", subtitle: "Fragments of Time", kind: "movie", year: 2024, category: "剧情电影", remarks: "4K", score: 8.4, artwork: { column: 3, row: 0 }, progress: 18 },
  { title: "边界之外", subtitle: "Beyond the Rim", kind: "series", year: 2026, category: "科幻剧集", remarks: "更新至 06", score: 8.9, artwork: { column: 3, row: 1 }, progress: 62 },
  { title: "雪线观测站", subtitle: "The Observatory", kind: "movie", year: 2025, category: "剧情电影", remarks: "杜比音效", score: 7.8, artwork: { column: 0, row: 1 } },
  { title: "赤色舱门", subtitle: "Red Chamber", kind: "series", year: 2025, category: "惊悚剧集", remarks: "全 10 集", score: 8.0, artwork: { column: 1, row: 1 } },
  { title: "林间入口", subtitle: "The Forest Gate", kind: "movie", year: 2024, category: "奇幻电影", remarks: "正片", score: 7.7, artwork: { column: 2, row: 1 } }
];

export const demoMedia: DemoMedia[] = entries.map((entry, index) => ({
  id: `demo:${index + 1}`,
  sourceId: "demo",
  sourceItemId: String(index + 1),
  fingerprint: `${entry.kind}:${entry.title}:${entry.year}`,
  title: entry.title,
  subtitle: entry.subtitle,
  kind: entry.kind,
  year: entry.year,
  category: entry.category,
  posterUrl: null,
  backdropUrl: null,
  remarks: entry.remarks,
  score: entry.score,
  updatedAt: "2026-07-26T00:00:00.000Z",
  artwork: entry.artwork,
  ...(entry.progress === undefined ? {} : { progress: entry.progress })
}));

export const demoDetail: MediaDetail = {
  ...demoMedia[0]!,
  description: "在遥远的未来，一座沉睡于荒原的环形遗迹重新启动。一个家庭必须在时间耗尽前，理解它与失落文明之间的联系。",
  director: ["林舟"],
  actors: ["陈沐", "周岚", "顾言"],
  area: ["原创演示"],
  language: ["普通话"],
  tags: ["科幻", "悬疑", "家庭"],
  episodes: Array.from({ length: 8 }, (_, index) => ({
    id: `demo:1:main:${index}`,
    label: `第 ${String(index + 1).padStart(2, "0")} 集`,
    sourceId: "demo",
    sourceItemId: "1",
    lineId: "main",
    lineLabel: "主线 · MacCMS",
    url: "/demo/sample.mp4",
    order: index
  })),
  metadata: {
    provider: "MarsTV demo",
    providerId: "original-001",
    attributionUrl: null,
    matchedManually: false
  }
};

const now = "2026-07-26T00:00:00.000Z";

export const demoSources: Array<SourceConfig & { health: SourceHealth }> = [
  {
    id: "primary",
    name: "主库 · MacCMS",
    baseUrl: "https://media.example/api.php/provide/vod/",
    enabled: true,
    priority: 1,
    timeoutMs: 4_000,
    allowedHosts: ["media.example", "cdn.media.example"],
    headers: {},
    relayMode: "off",
    categoryMap: {},
    resolver: null,
    createdAt: now,
    updatedAt: now,
    health: {
      sourceId: "primary",
      state: "healthy",
      latencyMs: 58,
      checkedAt: now,
      itemCount: 12_345,
      message: null
    }
  },
  {
    id: "backup",
    name: "备用 · MacCMS 02",
    baseUrl: "https://backup.example/api.php/provide/vod/",
    enabled: true,
    priority: 2,
    timeoutMs: 4_000,
    allowedHosts: ["backup.example"],
    headers: {},
    relayMode: "off",
    categoryMap: {},
    resolver: null,
    createdAt: now,
    updatedAt: now,
    health: {
      sourceId: "backup",
      state: "healthy",
      latencyMs: 82,
      checkedAt: now,
      itemCount: 9_876,
      message: null
    }
  },
  {
    id: "archive",
    name: "旧档案 · MacCMS",
    baseUrl: "https://archive.example/api.php/provide/vod/",
    enabled: true,
    priority: 6,
    timeoutMs: 4_000,
    allowedHosts: ["archive.example"],
    headers: {},
    relayMode: "manifest",
    categoryMap: {},
    resolver: null,
    createdAt: now,
    updatedAt: now,
    health: {
      sourceId: "archive",
      state: "degraded",
      latencyMs: 2_341,
      checkedAt: now,
      itemCount: null,
      message: "SOURCE_TIMEOUT"
    }
  }
];
