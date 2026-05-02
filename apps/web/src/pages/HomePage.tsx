import { loadSources } from "@marstv/core";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getDetail } from "../lib/api";
import type { VideoDetail } from "@marstv/core";

export function HomePage() {
  const [sources] = useState(() => loadSources());
  const [featured, setFeatured] = useState<VideoDetail[]>([]);

  useEffect(() => {
    // Load featured content from first few sources
    const load = async () => {
      const results = await Promise.allSettled(
        sources.slice(0, 3).map(async (s) => {
          // Try a few popular IDs from each source
          for (const id of ["1", "2", "3"]) {
            try {
              return await getDetail(s, id);
            } catch {
              continue;
            }
          }
          return null;
        }),
      );
      setFeatured(
        results
          .filter((r): r is PromiseFulfilledResult<VideoDetail> => r.status === "fulfilled" && r.value !== null)
          .map((r) => r.value),
      );
    };
    if (sources.length > 0) load();
  }, [sources]);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
      <section className="mb-10">
        <h1 className="mb-4 text-3xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            MarsTV
          </span>
          <span className="ml-3 text-lg font-normal text-muted-foreground">更快、更好看、全端可用</span>
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          跨平台开源影视聚合浏览器，多源测速择优、边缘缓存代理、追剧订阅。
        </p>
      </section>

      {featured.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold">精选推荐</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {featured.map((v) => (
              <Link
                key={`${v.source}:${v.id}`}
                to={`/play/${v.source}/${v.id}`}
                className="glass-card group overflow-hidden rounded-lg transition-all hover:border-primary/30"
              >
                {v.poster ? (
                  <img
                    src={v.poster}
                    alt={v.title}
                    className="aspect-[2/3] w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center bg-surface/40 text-xs text-dim-foreground">
                    暂无封面
                  </div>
                )}
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
      ) : (
        <section className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-5xl">📺</div>
          <h2 className="mb-2 text-lg font-semibold">暂无内容</h2>
          <p className="text-sm text-muted-foreground">请配置 CMS 源后刷新页面</p>
        </section>
      )}
    </div>
  );
}
