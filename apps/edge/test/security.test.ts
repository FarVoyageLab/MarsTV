import { describe, expect, it } from "vitest";
import { assertAllowedUrl, isBlockedHostname } from "../src/security";

describe("edge egress policy", () => {
  it.each(["127.0.0.1", "10.0.0.2", "192.168.1.1", "localhost", "media.local"])(
    "blocks private hostname %s",
    (host) => expect(isBlockedHostname(host)).toBe(true)
  );

  it("requires HTTPS and an explicit host allowlist", () => {
    expect(() => assertAllowedUrl("http://media.example/a", ["media.example"]))
      .toThrow("SOURCE_HTTPS_REQUIRED");
    expect(() => assertAllowedUrl("https://other.example/a", ["media.example"]))
      .toThrow("SOURCE_HOST_NOT_ALLOWED");
    expect(assertAllowedUrl("https://media.example/a", ["media.example"]).hostname)
      .toBe("media.example");
  });
});
