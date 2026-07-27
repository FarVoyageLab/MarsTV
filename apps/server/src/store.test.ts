import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NodeStore } from "./store";

describe("NodeStore", () => {
  it("encrypts and round-trips source configuration", () => {
    const directory = mkdtempSync(join(tmpdir(), "marstv-store-"));
    const store = new NodeStore(join(directory, "test.sqlite"));
    const now = new Date().toISOString();
    store.saveSource({
      id: "one",
      name: "One",
      baseUrl: "https://media.example/api.php/provide/vod/",
      enabled: true,
      priority: 1,
      timeoutMs: 4_000,
      allowedHosts: ["media.example"],
      headers: { authorization: "secret" },
      relayMode: "off",
      categoryMap: {},
      resolver: null,
      createdAt: now,
      updatedAt: now
    });
    expect(store.listSources()[0]?.headers.authorization).toBe("secret");
  });

  it("claims a five-minute pairing by short code and consumes it once", () => {
    const directory = mkdtempSync(join(tmpdir(), "marstv-pairing-"));
    const store = new NodeStore(join(directory, "test.sqlite"));
    const owner = store.bootstrap("Owner");
    const pairing = store.createPairing();

    expect(store.pairingIdForCode(pairing.code)).toBe(pairing.pairingId);
    expect(store.claimPairing(pairing.pairingId, owner.userId, owner.token)).toBe(true);
    expect(store.claimPairing(pairing.pairingId, owner.userId, owner.token)).toBe(false);
    expect(store.consumePairing(pairing.pairingId, pairing.secret)).toEqual({
      sessionToken: owner.token
    });
    expect(store.consumePairing(pairing.pairingId, pairing.secret)).toBeNull();
  });
});
