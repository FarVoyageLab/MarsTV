import { describe, expect, it } from "vitest";
import { can, mediaFingerprint, normalizeTitle } from "./index";

describe("domain identity", () => {
  it("normalizes punctuation without merging year and kind", () => {
    expect(normalizeTitle(" 遗落・之环（2026） ")).toBe("遗落之环2026");
    expect(mediaFingerprint({ title: "遗落之环", year: 2026, kind: "series" }))
      .toBe("series:遗落之环:2026");
  });

  it("enforces role capabilities", () => {
    expect(can("owner", "source:write")).toBe(true);
    expect(can("member", "source:write")).toBe(false);
    expect(can("child", "play")).toBe(true);
  });
});
