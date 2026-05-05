import { loadSources, subscribeSources, type CmsSource } from "@marstv/core";
import { useSyncExternalStore } from "react";

/** Subscribe to the platform-owned runtime source list. */
export function useSources(): CmsSource[] {
	return useSyncExternalStore(subscribeSources, loadSources, loadSources);
}
