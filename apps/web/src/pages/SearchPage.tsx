import { loadSources, type VideoItem } from "@marstv/core";
import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { searchAllCms } from "../lib/api";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [results, setResults] = useState<{ source: string; sourceName: string; items: VideoItem[] }[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const sources = loadSources();
      const data = await searchAllCms(sources, q.trim());
      setResults(
        data.map((r) => ({
          source: r.source.key,
          sourceName: r.source.name,
          items: r.items,
        })),
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const input = form.elements.namedItem("q") as HTMLInputElement;
    const q = input.value;
    setSearchParams(q ? { q } : {});
    doSearch(q);
  };

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="搜索电影、电视剧、动漫..."
            className="glass-input flex-1 rounded-full px-5 py-3 text-sm outline-none transition-all focus:border-primary/40"
            autoFocus={!query}
          />
          <button
            type="submit"
            disabled={loading}
            className="glass-button rounded-full px-6 py-3 text-sm font-medium transition-all hover:bg-primary/20 disabled:opacity-50"
          >
            {loading ? "搜索中..." : "搜索"}
          </button>
        </div>
      </form>

      {results.length > 0 ? (
        <div className="space-y-8">
          {results.map((group) => (
            <section key={group.source}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                来自 {group.sourceName}
                <span className="ml-2 text-dim-foreground">({group.items.length} 个结果)</span>
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {group.items.map((v) => (
                  <Link
                    key={`${group.source}:${v.id}`}
                    to={`/play/${group.source}/${v.id}`}
                    className="glass-card group overflow-hidden rounded-lg transition-all hover:border-primary/30"
                  >
                    <div className="aspect-[2/3] bg-surface/40">
                      {v.poster ? (
                        <img src={v.poster} alt={v.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : null}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-medium group-hover:text-primary">{v.title}</p>
                      {v.remarks ? (
                        <p className="mt-0.5 truncate text-[10px] text-dim-foreground">{v.remarks}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : query && !loading ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <p className="text-muted-foreground">未找到 "{query}" 的相关内容</p>
        </div>
      ) : null}
    </div>
  );
}
