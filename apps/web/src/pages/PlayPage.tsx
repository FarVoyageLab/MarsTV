import { createApiClient, getDetail } from "@marstv/api";
import type { VideoDetail } from "@marstv/core";
import { EpisodeGrid, FavoriteButton, PlayerEmbed } from "@marstv/ui";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useSources } from "../lib/sources";

const api = createApiClient(
	typeof window !== "undefined" ? window.location.origin : "http://localhost",
);

function asInt(v: string | null, fallback = 0): number {
	if (!v) return fallback;
	const n = Number.parseInt(v, 10);
	return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function PlayPage() {
	const { source: sourceKey, id } = useParams<{ source: string; id: string }>();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [detail, setDetail] = useState<VideoDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const sources = useSources();
	// Sources hydrate asynchronously after first mount. Treat an empty list as
	// "still loading" so a full-page reload onto /play/... doesn't briefly
	// render "无效的源或视频ID" before the list arrives.
	const sourcesReady = sources.length > 0;
	const source = sourceKey
		? sources.find((s) => s.key === sourceKey)
		: undefined;

	useEffect(() => {
		if (!source || !id) return;
		setLoading(true);
		setError(null);
		getDetail(api, source.key, id)
			.then(setDetail)
			.catch((err: Error) => setError(err.message))
			.finally(() => setLoading(false));
	}, [source, id]);

	if (!sourceKey || !id) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<p className="text-muted-foreground">无效的源或视频ID</p>
			</div>
		);
	}

	// Still waiting for the sources list to hydrate from the worker.
	if (!sourcesReady) {
		return (
			<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
				<div className="mb-4 h-7 w-48 animate-pulse rounded bg-surface/40" />
				<div className="aspect-video w-full animate-pulse rounded-lg bg-surface/20" />
			</div>
		);
	}

	if (!source) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
				<div className="text-5xl">⚠️</div>
				<h1 className="text-xl font-semibold">未知的视频源</h1>
				<p className="text-sm text-muted-foreground">
					源 <code className="font-mono">{sourceKey}</code> 未在当前配置中启用
				</p>
				<Link
					to="/"
					className="glass-card inline-flex items-center rounded-full px-5 py-2 text-sm transition-all hover:border-primary/30"
				>
					返回首页
				</Link>
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
	const epIdx = Math.min(
		asInt(searchParams.get("ep")),
		line.episodes.length - 1,
	);
	const episode = line.episodes[epIdx]!;

	const sourceName = source.name ?? detail.source;
	const nextEpIdx = epIdx + 1 < line.episodes.length ? epIdx + 1 : null;
	const prevEpIdx = epIdx > 0 ? epIdx - 1 : null;

	// Route playback through the worker proxy so HLS.js can fetch the manifest
	// and segments with CORS headers — most upstream CMS CDNs don't send any.
	const playbackUrl = `/api/proxy/m3u8?u=${encodeURIComponent(episode.url)}`;
	const nextEpisode =
		nextEpIdx !== null ? (line.episodes[nextEpIdx] ?? null) : null;
	const nextPlaybackUrl = nextEpisode
		? `/api/proxy/m3u8?u=${encodeURIComponent(nextEpisode.url)}`
		: undefined;

	const nextHref =
		nextEpIdx !== null
			? `/play/${sourceKey}/${id}?line=${lineIdx}&ep=${nextEpIdx}`
			: undefined;
	const prevHref =
		prevEpIdx !== null
			? `/play/${sourceKey}/${id}?line=${lineIdx}&ep=${prevEpIdx}`
			: undefined;

	return (
		<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
			<div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
				<h1 className="text-2xl font-semibold tracking-tight">
					{detail.title}
				</h1>
				<div className="flex items-center gap-3">
					<FavoriteButton
						source={sourceKey}
						sourceName={sourceName}
						id={id}
						title={detail.title}
						poster={detail.poster}
					/>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<span className="rounded bg-surface/40 px-1.5 py-0.5">
							{sourceName}
						</span>
						{detail.year ? <span>{detail.year}</span> : null}
					</div>
				</div>
			</div>

			<PlayerEmbed
				src={playbackUrl}
				poster={detail.poster}
				title={`${detail.title} · ${line.name} · ${episode.title}`}
				progressKey={`${sourceKey}:${id}:${lineIdx}:${epIdx}`}
				nextHref={nextHref}
				prevHref={prevHref}
				nextPlaybackUrl={nextPlaybackUrl}
				record={{
					source: sourceKey,
					sourceName,
					id,
					title: detail.title,
					poster: detail.poster,
					lineIdx,
					lineName: line.name,
					epIdx,
				}}
				onNavigate={(href) => navigate(href)}
			/>

			{detail.desc ? (
				<p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
					{detail.desc}
				</p>
			) : null}

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

			<section className="mt-6">
				<h2 className="mb-2 text-sm font-medium">
					剧集{" "}
					<span className="text-dim-foreground">
						· 共 {line.episodes.length} 集
					</span>
				</h2>
				<EpisodeGrid
					source={sourceKey}
					id={id}
					lineIdx={lineIdx}
					currentEpIdx={epIdx}
					episodes={line.episodes}
				/>
			</section>
		</div>
	);
}
