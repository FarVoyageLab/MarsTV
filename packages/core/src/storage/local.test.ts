import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageBackend } from "./local";
import type { FavoriteRecord, PlayRecord } from "./types";

// Minimal in-memory localStorage polyfill for Node. Mirrors just the surface
// LocalStorageBackend touches (getItem / setItem / removeItem / clear).
class MemoryStorage {
	private store = new Map<string, string>();
	getItem(key: string): string | null {
		return this.store.has(key) ? (this.store.get(key) ?? null) : null;
	}
	setItem(key: string, value: string): void {
		this.store.set(key, value);
	}
	removeItem(key: string): void {
		this.store.delete(key);
	}
	clear(): void {
		this.store.clear();
	}
	get length(): number {
		return this.store.size;
	}
	key(index: number): string | null {
		return Array.from(this.store.keys())[index] ?? null;
	}
}

function installPolyfill(): MemoryStorage {
	const ls = new MemoryStorage();
	(globalThis as { localStorage?: Storage }).localStorage =
		ls as unknown as Storage;
	return ls;
}

function makePlay(
	id: string,
	updatedAt: number,
	overrides: Partial<PlayRecord> = {},
): PlayRecord {
	return {
		source: "cms1",
		id,
		title: `title-${id}`,
		lineIdx: 0,
		epIdx: 0,
		positionSec: 10,
		durationSec: 100,
		updatedAt,
		...overrides,
	};
}

function makeFav(id: string, updatedAt: number): FavoriteRecord {
	return { source: "cms1", id, title: `fav-${id}`, updatedAt };
}

describe("LocalStorageBackend — play records", () => {
	let backend: LocalStorageBackend;
	beforeEach(() => {
		installPolyfill();
		backend = new LocalStorageBackend();
	});

	it("returns empty list when nothing stored", async () => {
		expect(await backend.listPlayRecords()).toEqual([]);
	});

	it("upsert by (source,id): putting same id twice replaces in place", async () => {
		await backend.putPlayRecord(makePlay("a", 1000));
		await backend.putPlayRecord(makePlay("a", 2000, { positionSec: 42 }));
		const records = await backend.listPlayRecords();
		expect(records).toHaveLength(1);
		expect(records[0]?.positionSec).toBe(42);
		expect(records[0]?.updatedAt).toBe(2000);
	});

	it("lists records sorted by updatedAt desc", async () => {
		await backend.putPlayRecord(makePlay("a", 1000));
		await backend.putPlayRecord(makePlay("b", 3000));
		await backend.putPlayRecord(makePlay("c", 2000));
		const records = await backend.listPlayRecords();
		expect(records.map((r) => r.id)).toEqual(["b", "c", "a"]);
	});

	it("removePlayRecord deletes the matching entry only", async () => {
		await backend.putPlayRecord(makePlay("a", 1000));
		await backend.putPlayRecord(makePlay("b", 2000));
		await backend.removePlayRecord("cms1", "a");
		const records = await backend.listPlayRecords();
		expect(records.map((r) => r.id)).toEqual(["b"]);
	});

	it("clearPlayRecords wipes everything", async () => {
		await backend.putPlayRecord(makePlay("a", 1000));
		await backend.clearPlayRecords();
		expect(await backend.listPlayRecords()).toEqual([]);
	});

	it("isolates records across different sources with same id", async () => {
		await backend.putPlayRecord(makePlay("shared", 1000));
		await backend.putPlayRecord(makePlay("shared", 2000, { source: "cms2" }));
		const records = await backend.listPlayRecords();
		expect(records).toHaveLength(2);
		await backend.removePlayRecord("cms1", "shared");
		const after = await backend.listPlayRecords();
		expect(after).toHaveLength(1);
		expect(after[0]?.source).toBe("cms2");
	});
});

describe("LocalStorageBackend — favorites", () => {
	let backend: LocalStorageBackend;
	beforeEach(() => {
		installPolyfill();
		backend = new LocalStorageBackend();
	});

	it("hasFavorite flips true after add, false after remove", async () => {
		expect(await backend.hasFavorite("cms1", "x")).toBe(false);
		await backend.addFavorite(makeFav("x", 1000));
		expect(await backend.hasFavorite("cms1", "x")).toBe(true);
		await backend.removeFavorite("cms1", "x");
		expect(await backend.hasFavorite("cms1", "x")).toBe(false);
	});

	it("re-adding the same favorite upserts rather than duplicates", async () => {
		await backend.addFavorite(makeFav("x", 1000));
		await backend.addFavorite(makeFav("x", 2000));
		const favs = await backend.listFavorites();
		expect(favs).toHaveLength(1);
		expect(favs[0]?.updatedAt).toBe(2000);
	});
});

describe("LocalStorageBackend — resilience", () => {
	let backend: LocalStorageBackend;
	beforeEach(() => {
		installPolyfill();
		backend = new LocalStorageBackend();
	});

	it("survives garbage JSON in the namespace (returns empty list)", async () => {
		(globalThis as { localStorage: Storage }).localStorage.setItem(
			"marstv:history",
			"not-json",
		);
		expect(await backend.listPlayRecords()).toEqual([]);
	});

	it("survives a non-array JSON value (returns empty list)", async () => {
		(globalThis as { localStorage: Storage }).localStorage.setItem(
			"marstv:favorites",
			'{"oops":true}',
		);
		expect(await backend.listFavorites()).toEqual([]);
	});

	it("returns empty arrays when localStorage is absent (SSR-safe)", async () => {
		delete (globalThis as { localStorage?: Storage }).localStorage;
		const ssrBackend = new LocalStorageBackend();
		expect(await ssrBackend.listPlayRecords()).toEqual([]);
		expect(await ssrBackend.listFavorites()).toEqual([]);
		// Write is a silent no-op rather than a throw.
		await expect(
			ssrBackend.putPlayRecord(makePlay("a", 1)),
		).resolves.toBeUndefined();
	});
});
