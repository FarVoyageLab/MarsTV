import {
	type CmsSource,
	loadSources,
	setRuntimeSources,
	subscribeSources,
} from "@marstv/core";
import { setStoredApiOrigin } from "@marstv/ui/app/lib/runtime";
import { invoke } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";

type AppConfig = {
	apiOrigin?: string | null;
	sources: CmsSource[];
};

const LEGACY_SOURCES_KEY = "marstv:sources";
const LEGACY_API_ORIGIN_KEY = "marstv:api-origin";

function readLegacyConfig(): AppConfig | null {
	try {
		const rawSources = localStorage.getItem(LEGACY_SOURCES_KEY);
		if (!rawSources) return null;
		const parsed: unknown = JSON.parse(rawSources);
		if (!Array.isArray(parsed)) return null;
		return {
			apiOrigin: localStorage.getItem(LEGACY_API_ORIGIN_KEY) ?? "",
			sources: parsed as CmsSource[],
		};
	} catch {
		return null;
	}
}

async function loadConfig(): Promise<AppConfig> {
	const config = await invoke<AppConfig>("load_app_config");
	if (config.sources.length > 0) return config;

	const legacy = readLegacyConfig();
	if (!legacy) return config;
	await saveConfig(legacy);
	return legacy;
}

async function saveConfig(config: AppConfig): Promise<void> {
	await invoke("save_app_config", { config });
}

export function initSources(): void {
	void loadConfig()
		.then((config) => {
			setRuntimeSources(config.sources);
			setStoredApiOrigin(config.apiOrigin ?? "");
		})
		.catch(() => {
			setRuntimeSources([]);
		});
}

export async function saveSources(
	list: CmsSource[],
	apiOrigin = "",
): Promise<void> {
	await saveConfig({ apiOrigin, sources: list });
	setRuntimeSources(list);
	setStoredApiOrigin(apiOrigin);
}

export function useSources(): CmsSource[] {
	return useSyncExternalStore(subscribeSources, loadSources, loadSources);
}
