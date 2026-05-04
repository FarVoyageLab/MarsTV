// Desktop-side bootstrap for the CMS source list.
//
// Desktop has no backend — sources live in the Tauri webview's localStorage
// under the key `marstv:sources`. On boot we read that key (if present) and
// push the result into @marstv/core via setRuntimeSources, matching the web
// hydration shape.
//
// Mutations (from the Settings page) go through saveSources(), which writes
// localStorage and re-notifies subscribers so the SPA re-renders.

import {
	type CmsSource,
	loadSources,
	setRuntimeSources,
	subscribeSources,
} from "@marstv/core";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "marstv:sources";

function readFromStorage(): CmsSource[] {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as CmsSource[]) : [];
	} catch {
		return [];
	}
}

/**
 * Hydrate the core cache from localStorage. Safe to call multiple times; the
 * last call wins. Desktop main.tsx invokes this synchronously on boot.
 */
export function initSources(): void {
	setRuntimeSources(readFromStorage());
}

/**
 * Persist a new source list to localStorage and notify subscribers. Called by
 * the Settings page after a user edit.
 */
export function saveSources(list: CmsSource[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	} catch {
		// Quota/serialization failure — still update in-memory so the UI reflects
		// the edit; the next reload will revert if the write never landed.
	}
	setRuntimeSources(list);
}

/** Subscribe to source changes from any React component. */
export function useSources(): CmsSource[] {
	return useSyncExternalStore(subscribeSources, loadSources, loadSources);
}
