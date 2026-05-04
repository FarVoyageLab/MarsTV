import { createApiClient, searchCms } from "@marstv/api";
import {
	type CmsSource,
	groupHitsByTitle,
	type SourceHit,
	type VideoItem,
} from "@marstv/core";
import { SearchBox, VideoCard } from "@marstv/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useSources } from "../lib/sources";

const api = createApiClient(
	typeof window !== "undefined" ? window.location.origin : "http://localhost",
	// Worker's internal upstream timeout is 15s. Give the client enough headroom
	// for workerd overhead before giving up on a request that's still in flight.
	{ timeoutMs: 25000 },
);

// Cap concurrent searches. Browsers limit HTTP/1.1 to ~6 connections per origin;
// firing 70+ requests at once made later ones sit in the browser's own queue
// long enough that their client-side timeout fired before they were even sent.
const SEARCH_CONCURRENCY = 8;

type SourceStatus =
	| { state: "pending" }
	| { state: "ok"; count: number; elapsedMs: number; items: VideoItem[] }
	| { state: "error"; message: string; elapsedMs: number };

type StatusMap = Record<string, SourceStatus>;

export function SearchPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const query = searchParams.get("q") ?? "";
	const dbCover = searchParams.get("dbCover");
	const dbRate = searchParams.get("dbRate");
	const dbUrl = searchParams.get("db");

	const sources = useSources();
	const enabledSources = useMemo(
		() => sources.filter((s) => s.enabled !== false),
		[sources],
	);
	const enabledKey = enabledSources.map((s) => s.key).join("|");

	const [statuses, setStatuses] = useState<StatusMap>({});
	const runIdRef = useRef(0);

	const runSearch = useCallback(async (q: string, srcs: CmsSource[]) => {
		const myRun = ++runIdRef.current;
		// Seed all pills as pending so the UI shows the full set immediately.
		const seed: StatusMap = {};
		for (const s of srcs) seed[s.key] = { state: "pending" };
		setStatuses(seed);

		// Worker pool over the source list. Each worker pulls the next source
		// off a shared cursor — same streaming UX as Promise.all, but bounded
		// concurrency so the browser doesn't self-DoS its own request queue.
		let cursor = 0;
		const runOne = async (s: CmsSource) => {
			const started = performance.now();
			try {
				const { list } = await searchCms(api, s.key, q, 1);
				const elapsedMs = Math.round(performance.now() - started);
				if (runIdRef.current !== myRun) return;
				setStatuses((prev) => ({
					...prev,
					[s.key]: {
						state: "ok",
						count: list?.length ?? 0,
						elapsedMs,
						items: list ?? [],
					},
				}));
			} catch (err) {
				const elapsedMs = Math.round(performance.now() - started);
				if (runIdRef.current !== myRun) return;
				setStatuses((prev) => ({
					...prev,
					[s.key]: {
						state: "error",
						message: err instanceof Error ? err.message : String(err),
						elapsedMs,
					},
				}));
			}
		};
		const worker = async () => {
			while (runIdRef.current === myRun) {
				const i = cursor++;
				if (i >= srcs.length) return;
				// biome-ignore lint/style/noNonNullAssertion: i is bounded by length check above
				await runOne(srcs[i]!);
			}
		};
		await Promise.all(
			Array.from({ length: Math.min(SEARCH_CONCURRENCY, srcs.length) }, worker),
		);
	}, []);

	// URL-driven: re-run when q or the set of enabled sources changes.
	useEffect(() => {
		if (!query.trim() || enabledSources.length === 0) {
			setStatuses({});
			return;
		}
		void runSearch(query.trim(), enabledSources);
		// enabledSources is a new reference each render — depend on key join
		// so we only re-run when the actual list changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, enabledKey, runSearch]);

	const handleSearch = (q: string) => {
		setSearchParams(q ? { q } : {});
	};

	// Collect all successful hits across sources, then dedupe by title+year.
	const allHits: SourceHit[] = useMemo(() => {
		const hits: SourceHit[] = [];
		for (const s of enabledSources) {
			const st = statuses[s.key];
			if (st?.state !== "ok") continue;
			for (const item of st.items) hits.push({ source: s, item });
		}
		return hits;
	}, [enabledSources, statuses]);

	const groups = useMemo(() => groupHitsByTitle(allHits), [allHits]);
	const multiSourceCount = groups.filter((g) => g.others.length > 0).length;

	const done = enabledSources.every((s) => {
		const st = statuses[s.key];
		return st && st.state !== "pending";
	});
	const hasAnyResult = allHits.length > 0;
	const errorSources = enabledSources.filter(
		(s) => statuses[s.key]?.state === "error",
	);

	return (
		<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
			<div className="mb-8 max-w-3xl">
				<SearchBox onSearch={handleSearch} defaultValue={query} size="lg" />
			</div>

			{/* ───── Douban reference card ───── */}
			{query && (dbCover || dbRate || dbUrl) ? (
				<DoubanReference
					title={query}
					cover={dbCover}
					rate={dbRate}
					url={dbUrl}
				/>
			) : null}

			{/* Empty sources — prompt user to configure */}
			{enabledSources.length === 0 ? (
				<div className="flex flex-col items-center py-20 text-center">
					<div className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-dim-foreground/40">
						NO CHANNELS
					</div>
					<p className="mb-6 text-sm text-dim-foreground/70">
						尚未配置任何已启用的视频源
					</p>
					<a
						href="/config"
						className="rounded-full border border-white/10 px-5 py-2 text-sm text-foreground hover:border-primary/60 hover:text-primary"
					>
						前往配置
					</a>
				</div>
			) : !query ? null : (
				<>
					{/* ───── Source status grid ───── */}
					<SourceStatusGrid sources={enabledSources} statuses={statuses} />

					{/* ───── Merged results ───── */}
					{groups.length > 0 ? (
						<section className="mt-10">
							<div className="mb-5 flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-dim-foreground/60">
								<span className="h-1.5 w-1.5 rounded-full bg-primary" />
								<span className="text-foreground/80">合并结果</span>
								<span className="tabular-nums text-primary">
									{groups.length.toString().padStart(3, "0")} 部
								</span>
								{multiSourceCount > 0 ? (
									<span className="opacity-60">
										· 其中 {multiSourceCount} 部多源
									</span>
								) : null}
							</div>
							<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
								{groups.map((g) => (
									<div key={g.key} className="flex flex-col gap-2">
										<VideoCard
											item={g.primary.item}
											sourceName={g.primary.source.name}
											hideSourceBadge
										/>
										<SourcePills
											primary={g.primary}
											others={g.others}
											activeId={g.primary.item.id}
										/>
									</div>
								))}
							</div>
						</section>
					) : done && !hasAnyResult ? (
						<EmptyResult
							query={query}
							errorCount={errorSources.length}
							total={enabledSources.length}
						/>
					) : null}

					{/* ───── Collapsible per-source view ───── */}
					{hasAnyResult ? (
						<details className="mt-12 rounded-xl border border-white/10 bg-white/[0.01] p-5">
							<summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-[0.25em] text-dim-foreground/70 transition-colors hover:text-foreground">
								▶ 按源分组查看完整结果
							</summary>
							<div className="mt-6 space-y-10">
								{enabledSources.map((s) => {
									const st = statuses[s.key];
									if (st?.state !== "ok" || st.items.length === 0) return null;
									return (
										<section key={s.key}>
											<h3 className="mb-3 flex items-baseline gap-3 text-sm">
												<span className="font-medium text-foreground/90">
													{s.name}
												</span>
												<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim-foreground/50">
													{st.count.toString().padStart(3, "0")} ·{" "}
													{st.elapsedMs}
													ms
												</span>
											</h3>
											<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
												{st.items.map((v) => (
													<VideoCard
														key={`${s.key}:${v.id}`}
														item={v}
														sourceName={s.name}
														hideSourceBadge
													/>
												))}
											</div>
										</section>
									);
								})}
							</div>
						</details>
					) : null}
				</>
			)}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────

function DoubanReference({
	title,
	cover,
	rate,
	url,
}: {
	title: string;
	cover: string | null;
	rate: string | null;
	url: string | null;
}) {
	const proxied = cover
		? `/api/image/douban?u=${encodeURIComponent(cover)}`
		: null;
	return (
		<div className="mb-8 flex items-stretch gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
			{proxied ? (
				<img
					src={proxied}
					alt={title}
					className="h-28 w-20 shrink-0 rounded-md object-cover"
					loading="lazy"
				/>
			) : (
				<div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-md bg-white/[0.03] font-mono text-[10px] text-dim-foreground/40">
					无封面
				</div>
			)}
			<div className="flex min-w-0 flex-1 flex-col justify-between py-1">
				<div>
					<div className="mb-1 font-mono text-[10px] uppercase tracking-[0.28em] text-dim-foreground/40">
						豆瓣参考
					</div>
					<div className="line-clamp-1 text-lg font-medium text-foreground">
						{title}
					</div>
					{rate ? (
						<div className="mt-1 flex items-center gap-1.5">
							<span className="rounded-sm bg-[#FFD166]/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#FFD166]">
								{rate}
							</span>
							<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim-foreground/40">
								豆瓣评分
							</span>
						</div>
					) : null}
				</div>
				{url ? (
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="self-start font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80 transition-colors hover:text-primary"
					>
						豆瓣详情 →
					</a>
				) : null}
			</div>
		</div>
	);
}

function SourceStatusGrid({
	sources,
	statuses,
}: {
	sources: CmsSource[];
	statuses: StatusMap;
}) {
	const okCount = sources.filter((s) => statuses[s.key]?.state === "ok").length;
	const failedCount = sources.filter(
		(s) => statuses[s.key]?.state === "error",
	).length;
	const pendingCount = sources.filter(
		(s) => !statuses[s.key] || statuses[s.key]?.state === "pending",
	).length;

	return (
		<div>
			<div className="mb-3 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-dim-foreground/50">
				<span>
					SOURCES · {sources.length.toString().padStart(2, "0")}
					<span className="ml-3 text-[#7dd3a5]">
						OK {okCount.toString().padStart(2, "0")}
					</span>
					{failedCount > 0 ? (
						<span className="ml-2 text-[#ffb0b0]">
							FAIL {failedCount.toString().padStart(2, "0")}
						</span>
					) : null}
					{pendingCount > 0 ? (
						<span className="ml-2 text-dim-foreground/60">
							· {pendingCount.toString().padStart(2, "0")} 等待
						</span>
					) : null}
				</span>
				<span className="hidden opacity-60 sm:inline">每源独立流式渲染</span>
			</div>
			<div className="flex flex-wrap gap-1.5">
				{sources.map((s) => (
					<SourcePill key={s.key} source={s} status={statuses[s.key]} />
				))}
			</div>
		</div>
	);
}

function SourcePill({
	source,
	status,
}: {
	source: CmsSource;
	status: SourceStatus | undefined;
}) {
	const state = status?.state ?? "pending";
	const dotCls =
		state === "ok"
			? "bg-[#7dd3a5]"
			: state === "error"
				? "bg-[#ff7676]"
				: "bg-white/25 animate-pulse";
	const borderCls =
		state === "ok"
			? "border-[#7dd3a5]/25 bg-[#7dd3a5]/[0.04]"
			: state === "error"
				? "border-[#ff7676]/25 bg-[#ff7676]/[0.04]"
				: "border-white/10 bg-white/[0.02]";

	const title =
		status?.state === "error"
			? `${source.name} — ${status.message}`
			: source.name;

	return (
		<span
			title={title}
			className={[
				"inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] leading-none",
				borderCls,
			].join(" ")}
		>
			<span className={["h-1 w-1 rounded-full", dotCls].join(" ")} />
			<span className="text-foreground/85">{source.name}</span>
			{status?.state === "ok" ? (
				<span className="font-mono text-[9px] tabular-nums uppercase tracking-[0.1em] text-dim-foreground/60">
					{status.count}·{status.elapsedMs}ms
				</span>
			) : status?.state === "error" ? (
				<span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#ffb0b0]/80">
					FAIL
				</span>
			) : (
				<span className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim-foreground/50">
					...
				</span>
			)}
		</span>
	);
}

function SourcePills({
	primary,
	others,
	activeId,
}: {
	primary: SourceHit;
	others: SourceHit[];
	activeId: string;
}) {
	const all = [primary, ...others];
	return (
		<div className="flex flex-wrap gap-1">
			{all.map((h) => {
				const active =
					h.item.id === activeId && h.source.key === primary.source.key;
				return (
					<span
						key={`${h.source.key}:${h.item.id}`}
						className={[
							"rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em]",
							active
								? "border-primary/50 bg-primary/10 text-primary"
								: "border-white/10 bg-white/[0.02] text-dim-foreground/60",
						].join(" ")}
						title={h.source.name}
					>
						{h.source.name}
					</span>
				);
			})}
		</div>
	);
}

function EmptyResult({
	query,
	errorCount,
	total,
}: {
	query: string;
	errorCount: number;
	total: number;
}) {
	return (
		<div className="mt-10 flex flex-col items-center py-16 text-center">
			<div className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-dim-foreground/40">
				NO SIGNAL
			</div>
			<p className="mb-2 text-sm text-dim-foreground/70">
				未找到「{query}」的相关内容
			</p>
			{errorCount > 0 ? (
				<p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffb0b0]/70">
					{errorCount} / {total} 源返回失败 · 详情见上方状态栏
				</p>
			) : null}
		</div>
	);
}
