import type { HybridClock, SyncRecord } from "@marstv/contracts";

export function compareClock(left: HybridClock, right: HybridClock): number {
  if (left.wallTime !== right.wallTime) return left.wallTime - right.wallTime;
  if (left.counter !== right.counter) return left.counter - right.counter;
  return left.deviceId.localeCompare(right.deviceId);
}

export function tickClock(
  current: HybridClock,
  now = Date.now()
): HybridClock {
  if (now > current.wallTime) {
    return { wallTime: now, counter: 0, deviceId: current.deviceId };
  }
  return { ...current, counter: current.counter + 1 };
}

export function receiveClock(
  current: HybridClock,
  remote: HybridClock,
  now = Date.now()
): HybridClock {
  const wallTime = Math.max(now, current.wallTime, remote.wallTime);
  let counter = 0;
  if (wallTime === current.wallTime && wallTime === remote.wallTime) {
    counter = Math.max(current.counter, remote.counter) + 1;
  } else if (wallTime === current.wallTime) {
    counter = current.counter + 1;
  } else if (wallTime === remote.wallTime) {
    counter = remote.counter + 1;
  }
  return { wallTime, counter, deviceId: current.deviceId };
}

export function mergeRecords(
  local: readonly SyncRecord[],
  remote: readonly SyncRecord[]
): SyncRecord[] {
  const merged = new Map<string, SyncRecord>();
  for (const record of [...local, ...remote]) {
    const key = `${record.collection}:${record.id}`;
    const existing = merged.get(key);
    if (!existing || compareClock(record.clock, existing.clock) > 0) {
      merged.set(key, record);
    }
  }
  return [...merged.values()].sort((left, right) => {
    const collection = left.collection.localeCompare(right.collection);
    return collection === 0 ? left.id.localeCompare(right.id) : collection;
  });
}

export function nextCursor(records: readonly SyncRecord[]): string | null {
  let latest: HybridClock | null = null;
  for (const record of records) {
    if (!latest || compareClock(record.clock, latest) > 0) latest = record.clock;
  }
  if (!latest) return null;
  return btoa(`${latest.wallTime}:${latest.counter}:${latest.deviceId}`);
}
