// Mobile-side CMS source store, backed by AsyncStorage.
//
// The store hydrates @marstv/core's runtime cache on boot (via `initSources`)
// and lets the Settings screen persist edits via `saveSources`. React code
// subscribes via `useSources` to get a live list that re-renders on change.

import {
	type CmsSource,
	loadSources,
	setRuntimeSources,
	subscribeSources,
} from "@marstv/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "marstv:sources";

/**
 * Hydrate the in-memory source cache from AsyncStorage. Call once at app
 * boot. Failures leave the env-based fallback in place.
 */
export async function initSources(): Promise<void> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		const parsed: unknown = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			setRuntimeSources(parsed as CmsSource[]);
		}
	} catch {
		// Corrupt JSON or storage error — leave fallback alone.
	}
}

/**
 * Persist a new source list and notify subscribers. Awaits the write so the
 * caller knows disk is in sync.
 */
export async function saveSources(list: CmsSource[]): Promise<void> {
	try {
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	} catch {
		// Quota / serialization — in-memory update still proceeds below.
	}
	setRuntimeSources(list);
}

/** Subscribe to source changes from any React component. */
export function useSources(): CmsSource[] {
	return useSyncExternalStore(subscribeSources, loadSources, loadSources);
}
