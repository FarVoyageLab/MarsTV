// CMS source loader. Reads from env CMS_SOURCES_JSON at startup, but can be
// overridden at runtime via setRuntimeSources() — used by web to hydrate from
// /api/sources and by desktop/mobile/tvos to hydrate from local storage.
// Platform-neutral: works in browser, Node, Workers, React Native.
import type { CmsSource } from "./types/index";

let cached: CmsSource[] | null = null;
const listeners = new Set<() => void>();

export function loadSources(): CmsSource[] {
	if (cached) return cached;
	const raw = getSourcesJson();
	if (!raw) {
		cached = [];
		return cached;
	}
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			cached = [];
			return cached;
		}
		cached = parsed.filter(isValidSource);
		return cached;
	} catch {
		cached = [];
		return cached;
	}
}

export function findSource(key: string): CmsSource | undefined {
	return loadSources().find((s) => s.key === key);
}

/**
 * Replace the in-memory source list and notify subscribers. Called after the
 * shell hydrates from whichever backend it owns (KV via /api/sources for web,
 * JSON file for desktop, AsyncStorage for mobile/tvos).
 */
export function setRuntimeSources(list: CmsSource[]): void {
	cached = (Array.isArray(list) ? list : []).filter(isValidSource);
	for (const fn of listeners) {
		try {
			fn();
		} catch {
			// swallow listener errors to keep notification loop resilient
		}
	}
}

/** Subscribe to source list changes. Returns an unsubscribe function. */
export function subscribeSources(fn: () => void): () => void {
	listeners.add(fn);
	return () => {
		listeners.delete(fn);
	};
}

function getGlobalEnv(): Record<string, string | undefined> {
	const g = globalThis as Record<string, unknown>;
	// Node/Workers
	if (g.process && (g.process as Record<string, unknown>).env) {
		return (g.process as Record<string, unknown>).env as Record<
			string,
			string | undefined
		>;
	}
	// Browser with injected __CMS_SOURCES__
	if (g.__CMS_SOURCES__) {
		return { CMS_SOURCES_JSON: g.__CMS_SOURCES__ as string };
	}
	return {};
}

function getSourcesJson(): string | null {
	return getGlobalEnv()["CMS_SOURCES_JSON"] ?? null;
}

function isValidSource(value: unknown): value is CmsSource {
	if (!value || typeof value !== "object") return false;
	const s = value as Record<string, unknown>;
	return (
		typeof s.key === "string" &&
		typeof s.name === "string" &&
		typeof s.api === "string"
	);
}

/** Clear the source cache (useful when env changes at runtime). */
export function clearSourcesCache(): void {
	cached = null;
}
