// TVOS-side CMS source store, backed by AsyncStorage.
//
// Mirrors the mobile implementation — the two apps use different React
// Native forks but AsyncStorage behaves identically on both.

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
 * boot. Failures leave any env-based fallback in place.
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

/** Persist a new source list and notify subscribers. */
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
