import type { MediaKind, MediaSummary, Role } from "@marstv/contracts";

const punctuation = /[\s\-_.·・•:：,，/\\'"“”‘’()（）[\]【】]+/gu;

export function normalizeTitle(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(punctuation, "");
}

export function mediaFingerprint(input: {
  title: string;
  year?: number | null;
  kind?: MediaKind | null;
}): string {
  const title = normalizeTitle(input.title);
  const year = input.year ?? "unknown";
  const kind = input.kind ?? "unknown";
  return `${kind}:${title}:${year}`;
}

export function dedupeMedia(items: readonly MediaSummary[]): MediaSummary[] {
  const seen = new Set<string>();
  const output: MediaSummary[] = [];
  for (const item of items) {
    const identity = `${item.sourceId}:${item.sourceItemId}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    output.push(item);
  }
  return output;
}

const permissions: Record<Role, ReadonlySet<string>> = {
  owner: new Set(["source:read", "source:write", "user:write", "audit:read", "play", "profile:write"]),
  admin: new Set(["source:read", "source:write", "audit:read", "play", "profile:write"]),
  member: new Set(["source:read", "play", "profile:write"]),
  child: new Set(["source:read", "play"])
};

export function can(role: Role, permission: string): boolean {
  return permissions[role].has(permission);
}

export function inferMediaKind(category: string | null, remarks: string | null): MediaKind {
  const value = `${category ?? ""} ${remarks ?? ""}`.toLocaleLowerCase();
  if (/(电视剧|连续剧|剧集|series|season|动漫|综艺)/u.test(value)) return "series";
  if (/(电影|movie|film)/u.test(value)) return "movie";
  return "unknown";
}
