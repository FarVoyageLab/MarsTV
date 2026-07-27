import { describe, expect, it } from "vitest";
import { demoDetail, demoMedia } from "./demo";

describe("original demonstration catalog", () => {
  it("keeps source identity unique and ships no remote media endpoint", () => {
    const identities = demoMedia.map((item) => `${item.sourceId}:${item.sourceItemId}`);
    expect(new Set(identities).size).toBe(identities.length);
    expect(demoMedia.every((item) => item.posterUrl === null && item.backdropUrl === null)).toBe(true);
    expect(demoDetail.episodes.every((episode) => episode.sourceId === "demo")).toBe(true);
  });
});
