import { describe, expect, it } from "vitest";
import { relyingParty, resolvePublicOrigin } from "../src/origin";

describe("public origin", () => {
  it("uses the request origin when no fixed origin is configured", () => {
    expect(resolvePublicOrigin({}, "https://marstv-edge.example.workers.dev/v1/health"))
      .toBe("https://marstv-edge.example.workers.dev");
  });

  it("uses an explicitly configured custom domain", () => {
    expect(relyingParty(
      { MARSTV_PUBLIC_ORIGIN: "https://tv.example.com/path" },
      "https://marstv-edge.example.workers.dev/v1/health"
    )).toEqual({ origin: "https://tv.example.com", id: "tv.example.com" });
  });

  it("rejects insecure non-local origins", () => {
    expect(() => resolvePublicOrigin(
      { MARSTV_PUBLIC_ORIGIN: "http://tv.example.com" },
      "https://worker.example/v1/health"
    )).toThrow("PUBLIC_ORIGIN_HTTPS_REQUIRED");
  });

  it("allows local HTTP development", () => {
    expect(resolvePublicOrigin({}, "http://localhost:8787/healthz"))
      .toBe("http://localhost:8787");
  });
});
