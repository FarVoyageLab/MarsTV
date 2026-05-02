import { createApiClient, searchCms } from "@marstv/api";
import { loadSources, type VideoItem } from "@marstv/core";
import { SearchBox, VideoCard } from "@marstv/ui";
import { useEffect, useState } from "react";

const api = createApiClient("");

export function HomePage() {
	const [sources] = useState(() => loadSources());
	const [featured, setFeatured] = useState<
		{ source: string; items: VideoItem[] }[]
	>([]);

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
		<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
			<section className="mb-10">
				<h1 className="mb-4 text-3xl font-bold tracking-tight">
					<span className="bg-gradient-to-r from-primary via-orange-400 to-yellow-400 bg-clip-text text-transparent">
						MarsTV
					</span>
					<span className="ml-3 text-lg font-normal text-muted-foreground">
						更快、更好看、全端可用
					</span>
				</h1>
				<div className="mt-6 max-w-xl">
					<SearchBox
						onSearch={(q) => {
							window.location.href = `/search?q=${encodeURIComponent(q)}`;
						}}
					/>
				</div>
			</section>

			{featured.length > 0 ? (
				featured.map((group) => (
					<section key={group.source} className="mb-8">
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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
				<section className="flex flex-col items-center justify-center py-20 text-center">
					<div className="mb-4 text-5xl">📺</div>
					<h2 className="mb-2 text-lg font-semibold">暂无内容</h2>
					<p className="text-sm text-muted-foreground">
						请配置 CMS 源后刷新页面
					</p>
				</section>
			)}
		</div>
	);
}
