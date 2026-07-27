import { useDeferredValue, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import type { DemoMedia } from "../data/demo";
import { demoMedia } from "../data/demo";
import { api } from "../lib/runtime";
import { Poster } from "../components/Poster";
import { StateView } from "../components/StateView";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "movie" | "series">("all");
  const deferredQuery = useDeferredValue(query.trim());
  const remote = useQuery({
    queryKey: ["search", deferredQuery],
    queryFn: ({ signal }) => api.search(deferredQuery, signal),
    enabled: deferredQuery.length > 0,
    retry: 1,
    staleTime: 5 * 60_000
  });
  const local = demoMedia.filter((item) => {
    const matchesQuery = deferredQuery.length === 0
      || `${item.title}${item.subtitle ?? ""}${item.category ?? ""}`.includes(deferredQuery);
    return matchesQuery && (kind === "all" || item.kind === kind);
  });
  const remoteItems = (remote.data?.items ?? []).map((item, index): DemoMedia => ({
    ...item,
    artwork: { column: index % 4, row: Math.floor(index / 4) % 2 }
  }));
  const items = deferredQuery && remoteItems.length > 0 ? remoteItems : local;

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("#catalog-search")?.focus();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <div className="standard-page search-page">
      <header className="page-heading">
        <div>
          <h1>搜索</h1>
          <p>同时检索家庭共享源；不可用来源不会阻塞其他结果。</p>
        </div>
      </header>
      <div className="search-toolbar">
        <label className="search-input" htmlFor="catalog-search">
          <Search aria-hidden="true" />
          <input
            id="catalog-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="影片、剧集、导演或演员"
            autoComplete="off"
          />
        </label>
        <div className="segmented" aria-label="内容类型">
          <SlidersHorizontal aria-hidden="true" />
          {(["all", "movie", "series"] as const).map((value) => (
            <button
              key={value}
              type="button"
              data-active={kind === value}
              onClick={() => setKind(value)}
            >
              {value === "all" ? "全部" : value === "movie" ? "电影" : "剧集"}
            </button>
          ))}
        </div>
      </div>

      {remote.data?.partial ? (
        <div className="inline-warning" role="status">
          部分来源暂时不可用，已展示其余来源结果。
        </div>
      ) : null}
      {remote.isFetching ? <div className="loading-line" aria-label="正在搜索" /> : null}
      {items.length > 0 ? (
        <div className="poster-grid">
          {items.map((media) => <Poster key={media.id} media={media} />)}
        </div>
      ) : (
        <StateView
          kind="empty"
          title="没有匹配结果"
          description="尝试更短的片名，或在资源站管理中检查来源状态。"
        />
      )}
    </div>
  );
}
