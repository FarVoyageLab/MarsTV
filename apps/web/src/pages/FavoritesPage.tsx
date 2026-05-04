import { type FavoriteRecord, localStorageBackend } from "@marstv/core";
import { invalidateCardMarkers } from "@marstv/ui";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

const IMAGE_PROXY = "/api/image/cms";

export function FavoritesPage() {
	const [records, setRecords] = useState<FavoriteRecord[] | null>(null);

	useEffect(() => {
		let cancelled = false;
		localStorageBackend
			.listFavorites()
			.then((rs) => {
				if (!cancelled) setRecords(rs);
			})
			.catch(() => {
				if (!cancelled) setRecords([]);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const handleRemove = useCallback((source: string, id: string) => {
		localStorageBackend
			.removeFavorite(source, id)
			.then(() => {
				invalidateCardMarkers();
				setRecords((prev) =>
					(prev ?? []).filter((r) => !(r.source === source && r.id === id)),
				);
			})
			.catch(() => {});
	}, []);

	if (records === null) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<div className="h-8 w-48 animate-pulse rounded bg-surface/40" />
			</div>
		);
	}

	if (records.length === 0) {
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
				<div className="mb-6 text-5xl">❤️</div>
				<h1 className="mb-3 text-2xl font-semibold">我的收藏</h1>
				<p className="mb-8 max-w-md text-sm leading-6 text-muted-foreground">
					还没有收藏任何视频,在播放页点击「收藏」即可加入这里
				</p>
				<Link
					to="/"
					className="glass-button inline-flex items-center rounded-full px-5 py-2 text-sm font-medium transition-all hover:bg-primary/20"
				>
					返回首页
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
			<div className="mb-6 flex items-baseline justify-between gap-4">
				<h1 className="text-2xl font-semibold">我的收藏</h1>
				<span className="text-xs text-dim-foreground">
					共 {records.length} 部
				</span>
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
				{records.map((it) => {
					const href = `/play/${encodeURIComponent(it.source)}/${encodeURIComponent(it.id)}`;
					const proxiedPoster = it.poster
						? `${IMAGE_PROXY}?u=${encodeURIComponent(it.poster)}`
						: null;
					return (
						<div
							key={`${it.source}:${it.id}`}
							className="group glass-card relative flex flex-col overflow-hidden rounded-xl"
						>
							<Link to={href} className="contents">
								<div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
									{proxiedPoster ? (
										<img
											src={proxiedPoster}
											alt={it.title}
											loading="lazy"
											referrerPolicy="no-referrer"
											className="h-full w-full object-cover transition-transform group-hover:scale-105"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center text-xs text-dim-foreground">
											无封面
										</div>
									)}
									{it.sourceName ? (
										<span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-foreground/90 backdrop-blur-sm">
											{it.sourceName}
										</span>
									) : null}
								</div>
								<div className="px-2 py-1.5">
									<p className="line-clamp-2 text-xs text-foreground group-hover:text-primary">
										{it.title}
									</p>
								</div>
							</Link>
							<button
								type="button"
								onClick={() => handleRemove(it.source, it.id)}
								aria-label="取消收藏"
								className="absolute right-1.5 top-1.5 rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
							>
								×
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
