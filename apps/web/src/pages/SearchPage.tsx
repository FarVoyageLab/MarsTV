import { createApiClient, searchCms } from "@marstv/api";
import { loadSources, type VideoItem } from "@marstv/core";
import { SearchBox, VideoCard } from "@marstv/ui";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router";

const api = createApiClient("");

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [results, setResults] = useState<{ source: string; sourceName: string; items: VideoItem[] }[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const sources = loadSources();
      const data = await Promise.allSettled(
        sources.map(async (s) => {
          const { list } = await searchCms(api, s.key, q.trim(), 1);
          return { source: s.key, sourceName: s.name, items: list };
        }),
      );
      setResults(
        data
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value)
          .filter((r) => r.items.length > 0),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (q: string) => {
    setSearchParams(q ? { q } : {});
    doSearch(q);
  };

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
      <div className="mb-8 max-w-xl">
        <SearchBox onSearch={handleSearch} defaultValue={query} />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-surface/20" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-8">
          {results.map((group) => (
            <section key={group.source}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                来自 {group.sourceName}
                <span className="ml-2 text-dim-foreground">({group.items.length})</span>
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {group.items.map((v) => (
                  <VideoCard key={`${group.source}:${v.id}`} item={v} hideSourceBadge />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : query ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <p className="text-muted-foreground">未找到 "{query}" 的相关内容</p>
        </div>
      ) : null}
    </div>
  );
}
