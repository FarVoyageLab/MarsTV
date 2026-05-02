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
				return { source: s.key, items: list.slice(0, 8) };
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

	return (
		<div className="mx-auto w-full max-w-7xl flex-1 px-6 md:px-10">
			{/* ═══ Hero — search is the star ═══ */}
			<section className="flex flex-col items-center pt-20 pb-14 md:pt-28 md:pb-18">
				<img
					src="/logo.svg"
					alt=""
					className="mb-6 h-16 w-16 opacity-90 drop-shadow-[0_0_24px_rgba(255,94,0,0.12)]"
				/>
				<h1 className="mb-2 text-center text-4xl font-bold tracking-tight md:text-5xl">
					<span className="text-foreground/90">Mars</span>
					<span className="text-primary">TV</span>
				</h1>
				<p className="mb-10 text-sm tracking-wider text-dim-foreground">
					多源聚合 · 极速播放 · 追剧无忧
				</p>

				{/* Search — big, centered, can't miss */}
				<div className="w-full max-w-2xl">
					<SearchBox
						size="lg"
						onSearch={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
					/>
				</div>

				<p className="mt-4 font-mono text-[10px] tracking-[0.2em] text-dim-foreground/20 uppercase">
					{sources.length > 0
						? `${sources.length} source${sources.length > 1 ? "s" : ""}`
						: "no sources"}
				</p>
			</section>

			{/* ═══ Content ═══ */}
			{featured.length > 0 ? (
				featured.map((group, gi) => (
					<section
						key={group.source}
						className="mb-14"
						style={{ animation: `fade-up 0.5s ease-out ${gi * 0.1}s both` }}
					>
						{/* Section header — editorial style */}
						<div className="mb-5 flex items-baseline gap-4">
							<h2 className="font-mono text-[11px] font-medium tracking-[0.2em] text-dim-foreground/40 uppercase">
								{group.source}
							</h2>
							<div className="h-px flex-1 bg-white/[0.03]" />
						</div>

						{/* Card grid */}
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
							{group.items.map((v) => (
								<VideoCard
									key={`${group.source}:${v.id}`}
									item={v}
									hideSourceBadge
								/>
							))}
						</div>
					</section>
				))
			) : (
				<section className="flex flex-col items-center pb-24 pt-8 text-center">
					<div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/[0.04] bg-white/[0.01]">
						<span className="font-mono text-[9px] tracking-[0.25em] text-dim-foreground/15 uppercase">
							idle
						</span>
					</div>
					<p className="font-mono text-[11px] tracking-[0.2em] text-dim-foreground/20 uppercase">
						CMS_SOURCES_JSON
					</p>
					<p className="mt-1.5 max-w-sm text-xs leading-relaxed text-dim-foreground/15">
						配置视频源后开始探索。在环境变量中设置 CMS 源列表即可激活。
					</p>
				</section>
			)}
		</div>
	);
}
