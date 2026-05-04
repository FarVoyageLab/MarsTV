import type { DoubanItem } from "@marstv/api";
import { createApiClient, fetchDouban } from "@marstv/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

const api = createApiClient(
	typeof window !== "undefined" ? window.location.origin : "http://localhost",
);

type DoubanType = "movie" | "tv";
type SortKey = "recommend" | "time" | "rank";

const PAGE_SIZE = 24;

// Curated tag sets — mirror what the Douban endpoint accepts for each category.
// Keep "热门" first so the page lands on something populated when no tag is set.
const TAGS: Record<DoubanType, string[]> = {
	movie: [
		"热门",
		"最新",
		"经典",
		"豆瓣高分",
		"冷门佳片",
		"华语",
		"欧美",
		"韩国",
		"日本",
		"动作",
		"喜剧",
		"爱情",
		"科幻",
		"悬疑",
		"恐怖",
		"动画",
	],
	tv: [
		"热门",
		"美剧",
		"英剧",
		"韩剧",
		"日剧",
		"国产剧",
		"港剧",
		"日本动画",
		"综艺",
		"纪录片",
	],
};

const SORTS: { key: SortKey; label: string }[] = [
	{ key: "recommend", label: "推荐" },
	{ key: "time", label: "最新" },
	{ key: "rank", label: "高分" },
];

const TYPE_LABEL: Record<DoubanType, string> = {
	movie: "电影",
	tv: "剧集",
};

// Helper — TypeScript's `noUncheckedIndexedAccess` widens array[0] to
// `string | undefined`; we know these arrays are non-empty.
function firstTag(t: DoubanType): string {
	return TAGS[t][0] ?? "热门";
}

export function DoubanPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const type = (searchParams.get("type") as DoubanType) ?? "movie";
	const tag = searchParams.get("tag") ?? firstTag(type);
	const sort = (searchParams.get("sort") as SortKey) ?? "recommend";

	const [items, setItems] = useState<DoubanItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [reachedEnd, setReachedEnd] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const pageStartRef = useRef(0);

	// URL helpers — everything is URL-driven so back/forward + refresh work.
	const patchParams = useCallback(
		(patch: Partial<{ type: DoubanType; tag: string; sort: SortKey }>) => {
			const next = new URLSearchParams(searchParams);
			for (const [k, v] of Object.entries(patch)) {
				if (v) next.set(k, v);
				else next.delete(k);
			}
			// When switching type, reset tag to that type's first entry.
			if (patch.type && !patch.tag) {
				next.set("tag", firstTag(patch.type));
			}
			setSearchParams(next, { replace: false });
		},
		[searchParams, setSearchParams],
	);

	// Fetch first page whenever type/tag/sort change.
	useEffect(() => {
		const ctrl = new AbortController();
		pageStartRef.current = 0;
		setItems([]);
		setReachedEnd(false);
		setError(null);
		setLoading(true);

		fetchDouban(
			api,
			{ type, tag, sort, pageSize: PAGE_SIZE, pageStart: 0 },
			ctrl.signal,
		)
			.then((data) => {
				if (ctrl.signal.aborted) return;
				const list = data.items ?? [];
				setItems(list);
				setReachedEnd(list.length < PAGE_SIZE);
			})
			.catch((err) => {
				if (ctrl.signal.aborted) return;
				setError(err instanceof Error ? err.message : "加载失败");
			})
			.finally(() => {
				if (!ctrl.signal.aborted) setLoading(false);
			});

		return () => ctrl.abort();
	}, [type, tag, sort]);

	const loadMore = useCallback(async () => {
		if (loadingMore || loading || reachedEnd) return;
		setLoadingMore(true);
		const nextStart = pageStartRef.current + PAGE_SIZE;
		try {
			const data = await fetchDouban(api, {
				type,
				tag,
				sort,
				pageSize: PAGE_SIZE,
				pageStart: nextStart,
			});
			const list = data.items ?? [];
			setItems((prev) => [...prev, ...list]);
			pageStartRef.current = nextStart;
			if (list.length < PAGE_SIZE) setReachedEnd(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "加载失败");
		} finally {
			setLoadingMore(false);
		}
	}, [loading, loadingMore, reachedEnd, type, tag, sort]);

	const availableTags = TAGS[type];

	// If the URL carries a tag not in the current type's list, still show it —
	// backend may accept it, and we don't want to silently rewrite URLs.
	const visibleTags = useMemo(() => {
		if (availableTags.includes(tag)) return availableTags;
		return [tag, ...availableTags];
	}, [availableTags, tag]);

	return (
		<div className="mx-auto w-full max-w-[1280px] flex-1 px-6 pt-8 pb-20 md:px-8">
			{/* ───── Header ───── */}
			<header className="mb-8">
				<div className="mb-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-dim-foreground/40">
					<span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
					<span>CATALOG</span>
					<span className="opacity-40">·</span>
					<span>DOUBAN · {type.toUpperCase()}</span>
					<span className="opacity-40">·</span>
					<span>{sort.toUpperCase()}</span>
				</div>

				<div className="flex flex-wrap items-end justify-between gap-6">
					<h1 className="text-[40px] leading-[1.05] font-light tracking-tight text-foreground md:text-[56px]">
						<span className="serif-accent italic">豆瓣</span>片单
					</h1>

					{/* Type switcher — movie / tv */}
					<div
						className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1 backdrop-blur-sm"
						role="tablist"
						aria-label="类型切换"
					>
						{(["movie", "tv"] as DoubanType[]).map((t) => {
							const active = t === type;
							return (
								<button
									key={t}
									type="button"
									role="tab"
									aria-selected={active}
									onClick={() => patchParams({ type: t, tag: firstTag(t) })}
									className={[
										"rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300",
										active
											? "bg-primary text-white shadow-[0_0_20px_rgba(255,94,0,0.25)]"
											: "text-dim-foreground/70 hover:text-foreground",
									].join(" ")}
								>
									{TYPE_LABEL[t]}
								</button>
							);
						})}
					</div>
				</div>
			</header>

			{/* ───── Tag chips ───── */}
			<nav
				className="douban-tag-row -mx-6 mb-4 overflow-x-auto px-6 md:-mx-8 md:px-8"
				aria-label="分类标签"
			>
				<div className="flex gap-2 pb-1">
					{visibleTags.map((t) => {
						const active = t === tag;
						return (
							<button
								key={t}
								type="button"
								onClick={() => patchParams({ tag: t })}
								className={[
									"shrink-0 rounded-full border px-4 py-1.5 text-sm transition-all duration-300",
									active
										? "border-primary bg-primary/15 text-primary"
										: "border-white/10 bg-white/[0.01] text-dim-foreground/70 hover:border-white/25 hover:text-foreground",
								].join(" ")}
							>
								{t}
							</button>
						);
					})}
				</div>
			</nav>

			{/* ───── Sort row ───── */}
			<div className="mb-8 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.25em] text-dim-foreground/40">
				<span>SORT</span>
				<div className="flex gap-1">
					{SORTS.map((s, i) => {
						const active = s.key === sort;
						return (
							<span key={s.key} className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => patchParams({ sort: s.key })}
									className={[
										"transition-colors duration-300",
										active
											? "text-primary"
											: "text-dim-foreground/50 hover:text-foreground",
									].join(" ")}
								>
									{s.label}
								</button>
								{i < SORTS.length - 1 ? (
									<span className="opacity-40">·</span>
								) : null}
							</span>
						);
					})}
				</div>
				{!loading && items.length > 0 ? (
					<span className="ml-auto tabular-nums">
						{items.length.toString().padStart(3, "0")} ITEMS
					</span>
				) : null}
			</div>

			{/* ───── Grid ───── */}
			{loading ? (
				<Grid>
					{Array.from({ length: PAGE_SIZE }).map((_, i) => (
						<SkeletonTile key={i} />
					))}
				</Grid>
			) : error ? (
				<ErrorState message={error} />
			) : items.length === 0 ? (
				<EmptyState tag={tag} />
			) : (
				<>
					<Grid>
						{items.map((it) => (
							<DoubanTile key={it.id} item={it} />
						))}
					</Grid>

					<div className="mt-10 flex flex-col items-center gap-3">
						{reachedEnd ? (
							<p className="font-mono text-[10px] uppercase tracking-[0.3em] text-dim-foreground/30">
								— END OF TRANSMISSION —
							</p>
						) : (
							<button
								type="button"
								onClick={loadMore}
								disabled={loadingMore}
								className={[
									"inline-flex items-center gap-3 rounded-full border border-white/10 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.28em] transition-all duration-300",
									loadingMore
										? "text-dim-foreground/50"
										: "text-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-primary",
								].join(" ")}
							>
								<span className="relative flex h-1.5 w-1.5">
									<span
										className={[
											"absolute inset-0 rounded-full",
											loadingMore ? "bg-primary animate-ping" : "bg-primary",
										].join(" ")}
									/>
								</span>
								{loadingMore ? "LOADING…" : "LOAD MORE"}
							</button>
						)}
					</div>
				</>
			)}

			<style>{`
				.serif-accent {
					font-family: 'Instrument Serif', 'Noto Serif SC', Georgia, serif;
					font-weight: 400;
				}
				.douban-tag-row::-webkit-scrollbar { height: 0; }
				.douban-tag-row { scrollbar-width: none; }
			`}</style>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────

function Grid({ children }: { children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5 lg:grid-cols-6">
			{children}
		</div>
	);
}

function DoubanTile({ item }: { item: DoubanItem }) {
	const proxied = item.cover
		? `/api/image/douban?u=${encodeURIComponent(item.cover)}`
		: "";
	const params = new URLSearchParams({ q: item.title });
	if (item.cover) params.set("dbCover", item.cover);
	if (item.rate) params.set("dbRate", item.rate);
	if (item.url) params.set("db", item.url);

	return (
		<Link to={`/search?${params.toString()}`} className="db-tile group">
			<div className="poster relative overflow-hidden rounded-[var(--radius-md,10px)] bg-white/[0.03]">
				<div className="aspect-[2/3] w-full">
					{proxied ? (
						<img
							src={proxied}
							alt={item.title}
							loading="lazy"
							className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center text-[11px] text-dim-foreground/40">
							无封面
						</div>
					)}
				</div>

				{/* Rate badge */}
				{item.rate ? (
					<span className="absolute top-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#FFD166] backdrop-blur-sm">
						{item.rate}
					</span>
				) : null}

				{/* New badge */}
				{item.isNew ? (
					<span className="absolute top-2 left-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
						新
					</span>
				) : null}

				{/* Hover gradient overlay */}
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
			</div>

			<div className="mt-2 line-clamp-2 text-sm leading-snug text-foreground/90 transition-colors group-hover:text-primary">
				{item.title}
			</div>
		</Link>
	);
}

function SkeletonTile() {
	return (
		<div>
			<div className="aspect-[2/3] w-full animate-pulse rounded-[var(--radius-md,10px)] bg-white/[0.04]" />
			<div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-white/[0.04]" />
		</div>
	);
}

function EmptyState({ tag }: { tag: string }) {
	return (
		<div className="flex flex-col items-center py-20 text-center">
			<div className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-dim-foreground/30">
				NO SIGNAL
			</div>
			<p className="text-sm text-dim-foreground/70">「{tag}」暂无内容</p>
		</div>
	);
}

function ErrorState({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center py-20 text-center">
			<div className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[#FF6B6B]/70">
				TRANSMISSION FAILED
			</div>
			<p className="mb-6 max-w-md text-sm text-dim-foreground/70">{message}</p>
			<button
				type="button"
				onClick={() => window.location.reload()}
				className="rounded-full border border-white/10 px-5 py-2 text-sm text-foreground hover:border-primary/60 hover:text-primary"
			>
				重试
			</button>
		</div>
	);
}
