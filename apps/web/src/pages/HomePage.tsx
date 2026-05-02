import { createApiClient, searchCms } from "@marstv/api";
import { loadSources, type VideoItem } from "@marstv/core";
import { SearchBox, VideoCard } from "@marstv/ui";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const api = createApiClient("");

export function HomePage() {
	const [sources] = useState(() => loadSources());
	const [featured, setFeatured] = useState<
		{ source: string; items: VideoItem[] }[]
	>([]);
	const navigate = useNavigate();

	useEffect(() => {
		if (sources.length === 0) return;
		Promise.allSettled(
			sources.slice(0, 6).map(async (s) => {
				const { list } = await searchCms(api, s.key, "", 1);
				return { source: s.key, items: list.slice(0, 6) };
			}),
		).then((results) => {
			setFeatured(
				results
					.filter((r) => r.status === "fulfilled")
					.map((r) => r.value)
					.filter((r) => r.items.length > 0),
			);
		});
	}, [sources]);

	const hasContent = featured.length > 0;

	return (
		<div className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-8">
			{/* ── Hero ── */}
			<section
				className={[
					"relative flex flex-col items-center text-center transition-all duration-700",
					hasContent ? "pb-10 pt-12" : "pb-20 pt-24",
				].join(" ")}
			>
				{/* Orbital rings */}
				<div
					className="pointer-events-none absolute inset-x-0 top-6 flex justify-center overflow-hidden"
					aria-hidden
				>
					<div className="h-[280px] w-[560px] shrink-0 rounded-full border border-white/[0.015]" />
				</div>
				<div
					className="pointer-events-none absolute inset-x-0 top-16 flex justify-center overflow-hidden"
					aria-hidden
				>
					<div className="h-[220px] w-[440px] shrink-0 rounded-full border border-white/[0.01]" />
				</div>

				{/* Logo */}
				<img
					src="/logo.svg"
					alt="MarsTV"
					className="relative z-10 mb-6 h-20 w-20 drop-shadow-[0_0_40px_rgba(255,106,0,0.15)]"
				/>

				{/* Title */}
				<h1 className="relative z-10 mb-1.5 text-3xl font-bold tracking-tight md:text-4xl">
					<span className="text-foreground">Mars</span>
					<span className="text-primary">TV</span>
				</h1>
				<p className="relative z-10 mb-10 text-sm tracking-wider text-dim-foreground">
					多源聚合 · 极速播放 · 追剧无忧
				</p>

				{/* Search — hero element */}
				<div className="relative z-10 w-full max-w-xl">
					<SearchBox
						size="lg"
						onSearch={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
					/>
				</div>

				{/* Source count */}
				<p className="relative z-10 mt-6 font-mono text-[10px] tracking-[0.2em] text-dim-foreground/25 uppercase">
					{sources.length > 0
						? `${sources.length} source${sources.length > 1 ? "s" : ""} connected`
						: "No sources configured"}
				</p>
			</section>

			{/* ── Content ── */}
			{hasContent ? (
				<section className="pb-12">
					{featured.map((group) => (
						<div key={group.source} className="mb-12">
							<div className="mb-4 flex items-center gap-3">
								<div className="h-px flex-1 bg-white/[0.03]" />
								<span className="shrink-0 font-mono text-[10px] tracking-[0.15em] text-dim-foreground/30 uppercase">
									{group.source}
								</span>
								<div className="h-px flex-1 bg-white/[0.03]" />
							</div>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
								{group.items.map((v) => (
									<VideoCard
										key={`${group.source}:${v.id}`}
										item={v}
										hideSourceBadge
									/>
								))}
							</div>
						</div>
					))}
				</section>
			) : sources.length === 0 ? (
				/* Empty state — no sources */
				<section className="flex flex-col items-center pb-20 pt-10 text-center">
					<div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-white/[0.04] bg-white/[0.01]">
						<span className="font-mono text-[9px] tracking-[0.25em] text-dim-foreground/20 uppercase">
							idle
						</span>
					</div>
					<p className="mb-1 font-mono text-[11px] tracking-[0.2em] text-dim-foreground/30 uppercase">
						CMS_SOURCES_JSON
					</p>
					<p className="max-w-sm text-xs leading-relaxed text-dim-foreground/20">
						配置视频源后开始探索。在环境变量中设置 CMS 源列表即可激活。
					</p>
				</section>
			) : (
				/* Empty state — sources exist but no results */
				<section className="flex flex-col items-center pb-20 pt-10 text-center">
					<div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-white/[0.04] bg-white/[0.01]">
						<span className="text-3xl grayscale">📡</span>
					</div>
					<p className="mb-1 font-mono text-[11px] tracking-[0.2em] text-dim-foreground/30 uppercase">
						Scanning...
					</p>
					<p className="max-w-sm text-xs leading-relaxed text-dim-foreground/20">
						已连接 {sources.length} 个源，正在获取内容...
					</p>
				</section>
			)}
		</div>
	);
}
