// CMS source loader — read from env CMS_SOURCES_JSON at runtime.
// Platform-neutral: works in browser, Node, React Native.
import type { CmsSource } from "./types/index";

let cached: CmsSource[] | null = null;

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
