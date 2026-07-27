import { describe, expect, it } from "vitest";
import type { SyncRecord } from "@marstv/contracts";
import { compareClock, mergeRecords, receiveClock, tickClock } from "./index";

function record(deviceId: string, wallTime: number, ciphertext: string): SyncRecord {
  return {
    id: "same",
    collection: "progress",
    ciphertext,
    nonce: "nonce",
    clock: { deviceId, wallTime, counter: 0 },
    deletedAt: null
  };
}

describe("hybrid logical clock", () => {
  it("ticks monotonically when wall clocks do not advance", () => {
    const clock = tickClock({ deviceId: "a", wallTime: 10, counter: 2 }, 9);
    expect(clock).toEqual({ deviceId: "a", wallTime: 10, counter: 3 });
  });

  it("merges a remote clock without moving backward", () => {
    const result = receiveClock(
      { deviceId: "a", wallTime: 10, counter: 1 },
      { deviceId: "b", wallTime: 10, counter: 4 },
      8
    );
    expect(result.counter).toBe(5);
  });

  it("uses deterministic device ordering as the final tie breaker", () => {
    expect(compareClock(
      { deviceId: "a", wallTime: 10, counter: 0 },
      { deviceId: "b", wallTime: 10, counter: 0 }
    )).toBeLessThan(0);
  });

  it("keeps the latest encrypted record", () => {
    expect(mergeRecords([record("a", 10, "old")], [record("b", 11, "new")])[0]?.ciphertext)
      .toBe("new");
  });
});
