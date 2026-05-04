// ============================================================================
// LocalStorage-backed IStorage implementation. Browser-only at runtime, but
// safe to import in Node/RN — the window check is lazy, per call.
//
// Layout:
//   marstv:history   → JSON array of PlayRecord
//   marstv:favorites → JSON array of FavoriteRecord
//
// One array per namespace is simpler than key-per-entry and, at the volumes
// we expect for a personal watch history (hundreds of entries), plenty fast.
// ============================================================================

import {
	type FavoriteRecord,
	type IStorage,
	type PlayRecord,
	makePlayRecordKey,
} from "./types";

const NS_HISTORY = "marstv:history";
const NS_FAVORITES = "marstv:favorites";

// Cap stored history to avoid unbounded growth. 500 is plenty for personal use;
// trimming is FIFO by updatedAt ascending.
const MAX_HISTORY = 500;
const MAX_FAVORITES = 1000;

interface MinimalStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

function getStore(): MinimalStorage | null {
	if (typeof globalThis === "undefined") return null;
	const g = globalThis as { localStorage?: MinimalStorage };
	return g.localStorage ?? null;
}

function readArray<T>(key: string): T[] {
	const store = getStore();
	if (!store) return [];
	try {
		const raw = store.getItem(key);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as T[]) : [];
	} catch {
		return [];
	}
}

function writeArray<T>(key: string, value: T[]): void {
	const store = getStore();
	if (!store) return;
	try {
		store.setItem(key, JSON.stringify(value));
	} catch {
		// Quota / private-mode — drop silently, caller can't meaningfully recover.
	}
}

export class LocalStorageBackend implements IStorage {
	async listPlayRecords(): Promise<PlayRecord[]> {
		const records = readArray<PlayRecord>(NS_HISTORY);
		return [...records].sort((a, b) => b.updatedAt - a.updatedAt);
	}

	async getPlayRecord(source: string, id: string): Promise<PlayRecord | null> {
		const records = readArray<PlayRecord>(NS_HISTORY);
		const match = records.find(
			(r) =>
				makePlayRecordKey(r.source, r.id) === makePlayRecordKey(source, id),
		);
		return match ?? null;
	}

	async putPlayRecord(record: PlayRecord): Promise<void> {
		const records = readArray<PlayRecord>(NS_HISTORY);
		const target = makePlayRecordKey(record.source, record.id);
		const rest = records.filter(
			(r) => makePlayRecordKey(r.source, r.id) !== target,
		);
		rest.push(record);
		// Trim oldest if over cap.
		if (rest.length > MAX_HISTORY) {
			rest.sort((a, b) => a.updatedAt - b.updatedAt);
			rest.splice(0, rest.length - MAX_HISTORY);
		}
		writeArray(NS_HISTORY, rest);
	}

	async removePlayRecord(source: string, id: string): Promise<void> {
		const records = readArray<PlayRecord>(NS_HISTORY);
		const target = makePlayRecordKey(source, id);
		writeArray(
			NS_HISTORY,
			records.filter((r) => makePlayRecordKey(r.source, r.id) !== target),
		);
	}

	async clearPlayRecords(): Promise<void> {
		writeArray(NS_HISTORY, []);
	}

	async listFavorites(): Promise<FavoriteRecord[]> {
		const records = readArray<FavoriteRecord>(NS_FAVORITES);
		return [...records].sort((a, b) => b.updatedAt - a.updatedAt);
	}

	async hasFavorite(source: string, id: string): Promise<boolean> {
		const records = readArray<FavoriteRecord>(NS_FAVORITES);
		const target = makePlayRecordKey(source, id);
		return records.some((r) => makePlayRecordKey(r.source, r.id) === target);
	}

	async addFavorite(record: FavoriteRecord): Promise<void> {
		const records = readArray<FavoriteRecord>(NS_FAVORITES);
		const target = makePlayRecordKey(record.source, record.id);
		const rest = records.filter(
			(r) => makePlayRecordKey(r.source, r.id) !== target,
		);
		rest.push(record);
		if (rest.length > MAX_FAVORITES) {
			rest.sort((a, b) => a.updatedAt - b.updatedAt);
			rest.splice(0, rest.length - MAX_FAVORITES);
		}
		writeArray(NS_FAVORITES, rest);
	}

	async removeFavorite(source: string, id: string): Promise<void> {
		const records = readArray<FavoriteRecord>(NS_FAVORITES);
		const target = makePlayRecordKey(source, id);
		writeArray(
			NS_FAVORITES,
			records.filter((r) => makePlayRecordKey(r.source, r.id) !== target),
		);
	}

	async clearFavorites(): Promise<void> {
		writeArray(NS_FAVORITES, []);
	}
}

// Singleton for convenience in UI code.
export const localStorageBackend = new LocalStorageBackend();
