import { describe, expect, it } from "vitest";
import { parsePlayUrl } from "./apple-cms";

describe("parsePlayUrl", () => {
	it("returns empty array when playUrl is missing", () => {
		expect(parsePlayUrl("", "")).toEqual([]);
		expect(parsePlayUrl("线路A", "")).toEqual([]);
	});

	it("parses a single line with name/url episodes", () => {
		const lines = parsePlayUrl(
			"高清",
			"第1集$https://cdn.a/1.m3u8#第2集$https://cdn.a/2.m3u8",
		);
		expect(lines).toEqual([
			{
				name: "高清",
				episodes: [
					{ title: "第1集", url: "https://cdn.a/1.m3u8" },
					{ title: "第2集", url: "https://cdn.a/2.m3u8" },
				],
			},
		]);
	});

	it("splits multiple lines on $$$ and zips names positionally", () => {
		const lines = parsePlayUrl(
			"线A$$$线B",
			"第1集$https://a/1#第2集$https://a/2$$$第1集$https://b/1",
		);
		expect(lines).toHaveLength(2);
		expect(lines[0]?.name).toBe("线A");
		expect(lines[0]?.episodes).toHaveLength(2);
		expect(lines[1]?.name).toBe("线B");
		expect(lines[1]?.episodes).toHaveLength(1);
	});

	it('falls back to "线路N" when vod_play_from is missing or shorter', () => {
		const lines = parsePlayUrl("", "ep$https://a/1$$$ep$https://b/1");
		expect(lines[0]?.name).toBe("线路1");
		expect(lines[1]?.name).toBe("线路2");
	});

	it("uses episode index fallback when title is empty before $", () => {
		const lines = parsePlayUrl("线A", "$https://a/1#$https://a/2");
		expect(lines[0]?.episodes).toEqual([
			{ title: "第1集", url: "https://a/1" },
			{ title: "第2集", url: "https://a/2" },
		]);
	});

	it("treats a part with no $ as url-only with generated title", () => {
		const lines = parsePlayUrl("线A", "https://a/1#https://a/2");
		expect(lines[0]?.episodes).toEqual([
			{ title: "第1集", url: "https://a/1" },
			{ title: "第2集", url: "https://a/2" },
		]);
	});

	it("drops episodes whose url ends up empty after trim", () => {
		// "title$" → title present, url empty → dropped
		const lines = parsePlayUrl("线A", "第1集$https://a/1#第2集$");
		expect(lines[0]?.episodes).toEqual([
			{ title: "第1集", url: "https://a/1" },
		]);
	});

	it("drops a whole line whose segment parses to zero episodes", () => {
		// Line B has one empty segment part which evaluates to skip; result has
		// only line A.
		const lines = parsePlayUrl("线A$$$线B", "第1集$https://a/1$$$");
		expect(lines).toHaveLength(1);
		expect(lines[0]?.name).toBe("线A");
	});

	it("trims whitespace in titles and urls", () => {
		const lines = parsePlayUrl("线A", "  第1集  $  https://a/1  ");
		expect(lines[0]?.episodes[0]).toEqual({
			title: "第1集",
			url: "https://a/1",
		});
	});

	it("splits titles on the first $ only (so urls may contain $)", () => {
		// URLs with query params containing $ should survive intact.
		const lines = parsePlayUrl("线A", "第1集$https://a/1?sig=$foo$bar");
		expect(lines[0]?.episodes[0]?.url).toBe("https://a/1?sig=$foo$bar");
	});

	it("handles a realistic Apple CMS payload (multi-line, multi-ep)", () => {
		const playFrom = "youku$$$iqiyi";
		const playUrl =
			"第01集$https://youku.cdn/s01e01.m3u8#第02集$https://youku.cdn/s01e02.m3u8" +
			"$$$" +
			"第01集$https://iqiyi.cdn/s01e01.m3u8";
		const lines = parsePlayUrl(playFrom, playUrl);
		expect(lines.map((l) => l.name)).toEqual(["youku", "iqiyi"]);
		expect(lines[0]?.episodes).toHaveLength(2);
		expect(lines[1]?.episodes).toHaveLength(1);
		expect(lines[1]?.episodes[0]?.url).toBe("https://iqiyi.cdn/s01e01.m3u8");
	});
});
