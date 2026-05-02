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

	return (
		<div className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-8">
			{/* ── Hero: Search as the focal point ── */}
			<section className="relative flex flex-col items-center pb-16 pt-20 md:pt-28">
				{/* Orbital ring decoration */}
				<div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2">
					<div className="h-[300px] w-[600px] rounded-full border border-white/[0.02]" />
					<div className="absolute inset-16 rounded-full border border-white/[0.015]" />
				</div>

				{/* Logo */}
				<img
					src="/logo.svg"
					alt="MarsTV"
					className="relative z-10 mb-8 h-20 w-20 drop-shadow-[0_0_32px_rgba(255,106,0,0.2)]"
				/>

				{/* Heading */}
				<h1 className="relative z-10 mb-2 text-center font-['Space_Grotesk'] text-3xl font-bold tracking-tight md:text-4xl">
					<span className="text-foreground">Mars</span>
					<span className="text-primary">TV</span>
				</h1>
				<p className="relative z-10 mb-10 text-center font-['Space_Grotesk'] text-sm tracking-wider text-dim-foreground">
					多源聚合 · 极速播放 · 追剧无忧
				</p>

				{/* Search — the hero element */}
				<div className="relative z-10 w-full max-w-2xl">
					<SearchBox
						size="lg"
						autoFocus
						onSearch={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
					/>
				</div>

				{/* Source count indicator */}
				<p className="relative z-10 mt-6 font-mono text-[11px] tracking-widest text-dim-foreground/40 uppercase">
					{sources.length} sources connected
				</p>
			</section>

			{/* ── Content grid ── */}
			{featured.length > 0 ? (
				<section className="pb-12">
					{featured.map((group) => (
						<div key={group.source} className="mb-10">
							<div className="mb-4 flex items-center gap-2">
								<div className="h-px flex-1 bg-white/[0.03]" />
								<span className="font-mono text-[10px] tracking-widest text-dim-foreground/40 uppercase">
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
			) : (
				<section className="flex flex-col items-center justify-center py-20 text-center">
					<p className="font-mono text-[10px] tracking-widest text-dim-foreground/30 uppercase">
						No sources configured
					</p>
					<p className="mt-2 text-xs text-dim-foreground/30">
						请配置 CMS_SOURCES_JSON 后刷新
					</p>
				</section>
			)}
		</div>
	);
}
