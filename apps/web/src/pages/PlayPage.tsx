import { findSource, getDetail, type VideoDetail } from "@marstv/core";
import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { getDetail as apiGetDetail } from "../lib/api";

function asInt(v: string | null, fallback = 0): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function PlayPage() {
  const { source: sourceKey, id } = useParams<{ source: string; id: string }>();
  const [searchParams] = useSearchParams();
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<unknown>(null);

  const source = sourceKey ? findSource(sourceKey) : undefined;

  useEffect(() => {
    if (!source || !id) return;
    setLoading(true);
    setError(null);
    apiGetDetail(source, id)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [source, id]);

  if (!sourceKey || !id || !source) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">无效的源或视频ID</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <div className="mb-4 h-7 w-48 animate-pulse rounded bg-surface/40" />
        <div className="aspect-video w-full animate-pulse rounded-lg bg-surface/20" />
        <div className="mt-6 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-surface/20" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-semibold">页面加载出错</h1>
        <p className="text-sm text-muted-foreground">{error ?? "视频未找到"}</p>
        <Link
          to="/"
          className="glass-card inline-flex items-center rounded-full px-5 py-2 text-sm transition-all hover:border-primary/30"
        >
          返回首页
        </Link>
      </div>
    );
  }

  const lines = detail.lines ?? [];
  if (lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <h1 className="mb-2 text-xl font-semibold">{detail.title}</h1>
        <p className="text-sm text-muted-foreground">该视频暂无可用播放线路</p>
      </div>
    );
  }

  const lineIdx = Math.min(asInt(searchParams.get("line")), lines.length - 1);
  const line = lines[lineIdx]!;
  const epIdx = Math.min(asInt(searchParams.get("ep")), line.episodes.length - 1);
  const episode = line.episodes[epIdx]!;

  const sourceName = source.name ?? detail.source;
  const nextEpIdx = epIdx + 1 < line.episodes.length ? epIdx + 1 : null;
  const prevEpIdx = epIdx > 0 ? epIdx - 1 : null;

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{detail.title}</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-surface/40 px-1.5 py-0.5">{sourceName}</span>
          {detail.year ? <span>{detail.year}</span> : null}
          {detail.area ? <span>· {detail.area}</span> : null}
          {detail.category ? <span>· {detail.category}</span> : null}
          {detail.remarks ? <span className="text-primary">· {detail.remarks}</span> : null}
        </div>
      </div>

      {/* Player */}
      <div className="relative overflow-hidden rounded-lg border border-border/20 bg-black">
        <video
          ref={videoRef}
          className="aspect-video w-full"
          controls
          poster={detail.poster}
          crossOrigin="anonymous"
          playsInline
        >
          <source src={episode.url} type="application/vnd.apple.mpegurl" />
          您的浏览器不支持视频播放
        </video>
      </div>

      {/* Episode navigation */}
      <div className="mt-4 flex items-center justify-between gap-4">
        {prevEpIdx !== null ? (
          <Link
            to={`/play/${sourceKey}/${id}?line=${lineIdx}&ep=${prevEpIdx}`}
            className="glass-card rounded-full px-4 py-1.5 text-xs transition-all hover:border-primary/30"
          >
            ← 上一集
          </Link>
        ) : <div />}
        <span className="text-xs text-dim-foreground">
          {line.name} · {episode.title}
        </span>
        {nextEpIdx !== null ? (
          <Link
            to={`/play/${sourceKey}/${id}?line=${lineIdx}&ep=${nextEpIdx}`}
            className="glass-card rounded-full px-4 py-1.5 text-xs transition-all hover:border-primary/30"
          >
            下一集 →
          </Link>
        ) : <div />}
      </div>

      {/* Lines */}
      {lines.length > 1 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium">线路</h2>
          <div className="flex flex-wrap gap-2">
            {lines.map((l, i) => (
              <Link
                key={`${l.name}:${i}`}
                to={`/play/${sourceKey}/${id}?line=${i}&ep=0`}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors ${
                  i === lineIdx
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/40 bg-surface/40 text-muted-foreground hover:border-border-strong hover:text-foreground"
                }`}
              >
                {l.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Episode grid */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium">
          剧集 <span className="text-dim-foreground">· 共 {line.episodes.length} 集</span>
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {line.episodes.map((ep, i) => (
            <Link
              key={`${ep.title}:${i}`}
              to={`/play/${sourceKey}/${id}?line=${lineIdx}&ep=${i}`}
              className={`truncate rounded-md border px-2 py-1.5 text-center text-xs transition-colors ${
                i === epIdx
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/40 bg-surface/40 text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              {ep.title}
            </Link>
          ))}
        </div>
      </section>

      {detail.desc ? (
        <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">{detail.desc}</p>
      ) : null}
    </div>
  );
}
