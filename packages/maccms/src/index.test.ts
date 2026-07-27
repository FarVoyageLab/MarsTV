import { describe, expect, it } from "vitest";
import type { SourceConfig } from "@marstv/contracts";
import { macCmsUrl, parseMacCmsDetail, parseMacCmsPayload, parsePlayLines } from "./index";

const source: SourceConfig = {
  id: "primary",
  name: "Primary",
  baseUrl: "https://media.example/api.php/provide/vod/",
  enabled: true,
  priority: 1,
  timeoutMs: 4_000,
  allowedHosts: ["media.example"],
  headers: {},
  relayMode: "off",
  categoryMap: {},
  resolver: null,
  createdAt: "2026-07-26T00:00:00.000Z",
  updatedAt: "2026-07-26T00:00:00.000Z"
};

describe("MacCMS adapter", () => {
  it("parses JSON list and preserves source identity", () => {
    const result = parseMacCmsPayload(source, JSON.stringify({
      code: 1,
      page: 1,
      pagecount: 2,
      total: 1,
      list: [{
        vod_id: 42,
        vod_name: "遗落之环",
        vod_year: "2026",
        type_name: "电视剧",
        vod_pic: "https://media.example/poster.jpg"
      }]
    }));
    expect(result.items[0]).toMatchObject({
      id: "primary:42",
      sourceId: "primary",
      sourceItemId: "42",
      kind: "series"
    });
  });

  it("parses XML without processing entities", () => {
    const result = parseMacCmsPayload(source, `
      <rss><list><video><id>7</id><name>边界之外</name><type>电影</type></video></list></rss>
    `, "application/xml");
    expect(result.items[0]?.title).toBe("边界之外");
  });

  it("aligns play groups and splits only the first dollar", () => {
    const episodes = parsePlayLines(
      "primary",
      "42",
      "hls$$$backup",
      "第1集$https://cdn.example/a.m3u8?token=a$b#第2集$https://cdn.example/b.m3u8$$$正片$https://cdn.example/movie.mp4"
    );
    expect(episodes).toHaveLength(3);
    expect(episodes[0]?.url).toContain("token=a$b");
    expect(episodes[2]?.lineId).toBe("backup");
  });

  it("creates detail endpoint queries", () => {
    expect(macCmsUrl(source, { action: "detail", ids: ["42"] }).toString())
      .toContain("ac=detail&ids=42");
  });

  it("creates normalized details", () => {
    const detail = parseMacCmsDetail(source, JSON.stringify({
      list: [{
        vod_id: 42,
        vod_name: "遗落之环",
        vod_play_from: "hls",
        vod_play_url: "第1集$https://cdn.example/1.m3u8"
      }]
    }));
    expect(detail.episodes[0]?.label).toBe("第1集");
  });
});
