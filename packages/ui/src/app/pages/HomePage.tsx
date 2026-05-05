import { createApiClient, fetchDouban } from "@marstv/api";
import type { DoubanItem } from "@marstv/api";
import type { VideoItem } from "@marstv/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { VideoCard } from "../../widgets/video-card";
import { HeroMars } from "../components/HeroMars";
import {
	doubanImagePath,
	getApiOrigin,
	getRuntimeDoubanHandler,
	resolveDoubanImage,
} from "../lib/runtime";
import { useSources } from "../lib/sources";

const api = createApiClient(getApiOrigin());

const QUICK_ACTIONS = [
	{ num: "01", label: "今日热门", to: "/douban" },
	{ num: "02", label: "继续观看", to: "/history" },
	{ num: "03", label: "稍后再看", to: "/favorites" },
];

type DoubanRowDef = {
	key: string;
	title: string;
	type: "movie" | "tv";
	tag: string;
};

const DOUBAN_ROWS: DoubanRowDef[] = [
	{ key: "tv-hot", title: "热门剧集", type: "tv", tag: "热门" },
	{ key: "movie-hot", title: "热门电影", type: "movie", tag: "热门" },
	{ key: "tv-cn", title: "国产剧", type: "tv", tag: "国产剧" },
	{ key: "movie-top", title: "豆瓣高分电影", type: "movie", tag: "豆瓣高分" },
];

const PAGE_SIZE = 12;

export function HomePage() {
	const sources = useSources();
	const [cmsItems, setCmsItems] = useState<VideoItem[]>([]);
	const [doubanRows, setDoubanRows] = useState<
		Record<string, DoubanItem[] | null>
	>({});
	const [q, setQ] = useState("");
	const searchRef = useRef<HTMLInputElement | null>(null);
	const navigate = useNavigate();

	// 全局键盘焦点
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const inField =
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement;
			if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				searchRef.current?.focus();
				searchRef.current?.select();
				return;
			}
			if (e.key === "/" && !inField) {
				e.preventDefault();
				searchRef.current?.focus();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	// 拉取四行豆瓣数据（每行独立请求）
	useEffect(() => {
		const ctrl = new AbortController();
		// initialize loading
		setDoubanRows(
			Object.fromEntries(DOUBAN_ROWS.map((r) => [r.key, null])) as Record<
				string,
				DoubanItem[] | null
			>,
		);

		DOUBAN_ROWS.forEach(async (row) => {
			try {
				const request = {
					type: row.type,
					tag: row.tag,
					pageSize: PAGE_SIZE,
					pageStart: 0,
					sort: "recommend" as const,
				};
				const runtimeDouban = getRuntimeDoubanHandler();
				const data = runtimeDouban
					? await runtimeDouban(request, ctrl.signal)
					: await fetchDouban(api, request, ctrl.signal);
				if (ctrl.signal.aborted) return;
				setDoubanRows((prev) => ({ ...prev, [row.key]: data.items ?? [] }));
			} catch {
				// Swallow aborts from StrictMode double-invoke / unmount. Only
				// surface real failures as the "豆瓣暂不可用" fallback.
				if (ctrl.signal.aborted) return;
				setDoubanRows((prev) => ({ ...prev, [row.key]: [] }));
			}
		});

		return () => ctrl.abort();
	}, []);

	// CMS 源聚合流
	useEffect(() => {
		if (sources.length === 0) return;
		Promise.allSettled(
			sources.slice(0, 6).map(async (s) => {
				const { searchCms } = await import("@marstv/api");
				const { list } = await searchCms(api, s.key, "", 1);
				return list.slice(0, 8);
			}),
		).then((results) => {
			const merged: VideoItem[] = [];
			const seen = new Set<string>();
			for (const r of results) {
				if (r.status !== "fulfilled") continue;
				for (const v of r.value) {
					const k = `${v.source ?? ""}:${v.id}`;
					if (seen.has(k)) continue;
					seen.add(k);
					merged.push(v);
				}
			}
			setCmsItems(merged);
		});
	}, [sources]);

	const submitSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!q.trim()) return;
		navigate(`/search?q=${encodeURIComponent(q.trim())}`);
	};

	const feedStatus = useMemo(() => {
		if (sources.length === 0) return null;
		return `已连接 ${sources.length} 个视频源`;
	}, [sources.length]);

	return (
		<div className="relative w-full">
			{/* ═══ HERO · DEEP SPACE TRANSMISSION DECK ═══ */}
			<section className="hero-deck mx-auto w-full max-w-[1280px]">
				{/* Top telemetry strip */}
				<div className="telemetry-strip hero-reveal" data-delay="1">
					<span className="live-dot" aria-hidden />
					<span>LIVE</span>
					<span className="sep">/</span>
					<span>2026.05.04</span>
					<span className="sep">·</span>
					<span>UTC+08</span>
					{feedStatus && (
						<>
							<span className="sep">·</span>
							<span>{feedStatus}</span>
						</>
					)}
				</div>

				{/* Mars disc — inline SVG (background-stripped logo), bleeds off right edge */}
				<div className="mars-stage" aria-hidden>
					<HeroMars />
				</div>

				<div className="hero-grid">
					{/* Left column — content */}
					<div className="hero-col-left">
						<div className="hero-chapter hero-reveal" data-delay="2">
							CH · 00 / 透明传输
						</div>

						<h1 className="hero-title hero-reveal" data-delay="3">
							随时<span className="punct">、</span>随地
							<span className="punct">、</span>
							<br />
							随你的<span className="serif">频率</span>
							<span className="punct">。</span>
						</h1>

						<p className="hero-subtitle hero-reveal" data-delay="4">
							聚合任意 CMS 视频源的私人入口
							<span className="divider" />
							无追踪
							<span className="divider" />
							无广告
							<span className="divider" />
							无云端
						</p>

						{/* Transmission input — slim underline search */}
						<form
							onSubmit={submitSearch}
							className="hero-reveal"
							data-delay="5"
						>
							<label className="transmission">
								<input
									ref={searchRef}
									value={q}
									onChange={(e) => setQ(e.target.value)}
									placeholder="输入片名、演员或关键词"
									type="search"
									autoComplete="off"
									spellCheck={false}
									aria-label="搜索影视内容"
								/>
								<span className="cursor" aria-hidden />
								<span className="kbd-hint">
									{q ? (
										<span className="cmd-key">↵</span>
									) : (
										<>
											<span className="cmd-key">⌘</span>
											<span className="cmd-key">K</span>
										</>
									)}
								</span>
							</label>
							<p className="hint mt-3">
								按 <span className="cmd-key">/</span> 聚焦 ·{" "}
								<span className="cmd-key">↵</span> 发射信号
							</p>
						</form>

						{/* Channel list — mono-font quick actions */}
						<nav
							aria-label="快捷频道"
							className="channel-list hero-reveal"
							data-delay="6"
						>
							{QUICK_ACTIONS.map((a) => (
								<button
									key={a.to}
									type="button"
									onClick={() => navigate(a.to)}
									className="channel-link"
								>
									<span className="ch-num">CH.{a.num}</span>
									<span>{a.label}</span>
									<span className="ch-arrow" aria-hidden>
										→
									</span>
								</button>
							))}
						</nav>
					</div>

					{/* Right column — intentionally empty on desktop.
					    Mars disc lives in absolutely-positioned .mars-stage above. */}
					<div className="hero-col-right" aria-hidden />
				</div>

				{/* Bottom telemetry strip */}
				<div
					className="telemetry-strip hero-reveal mt-12"
					data-delay="6"
					style={{ marginTop: "clamp(48px, 8vh, 96px)" }}
				>
					<span>SIGNAL · STABLE</span>
					<span className="sep">·</span>
					<span>CH / 01 → 04</span>
					<span className="sep">·</span>
					<span>MARSTV / BEACON</span>
				</div>
			</section>

			{/* ═══ 豆瓣 4 行 · 每行独立横向滚动 ═══ */}
			<div className="mx-auto w-full max-w-[1280px] px-6 pb-4 md:px-8">
				{DOUBAN_ROWS.map((row, i) => (
					<DoubanRow
						key={row.key}
						def={row}
						items={doubanRows[row.key] ?? null}
						delay={i * 0.06}
					/>
				))}
			</div>

			{/* ═══ 你的源最新内容（有源时才显示） ═══ */}
			{cmsItems.length > 0 && (
				<section className="mx-auto w-full max-w-[1280px] px-6 pt-6 pb-20 md:px-8">
					<div className="row-heading">
						<h2>你的源最新内容</h2>
						<span className="more">{cmsItems.length} 部</span>
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5 lg:grid-cols-6">
						{cmsItems.map((v, i) => (
							<div
								key={`${v.source ?? "src"}:${v.id}`}
								style={{
									animation: `fade-up 0.4s ease-out ${Math.min(i * 0.02, 0.4)}s both`,
								}}
							>
								<VideoCard item={v} hideSourceBadge />
							</div>
						))}
					</div>
				</section>
			)}
		</div>
	);
}

// ═════════════════════════════════════════════════════════════════════
// DoubanRow — 单行横向滚动，独立 scrollbar
// ═════════════════════════════════════════════════════════════════════

function DoubanRow({
	def,
	items,
	delay,
}: {
	def: DoubanRowDef;
	items: DoubanItem[] | null;
	delay: number;
}) {
	const moreHref = `/douban?type=${def.type}&tag=${encodeURIComponent(def.tag)}`;

	return (
		<section
			className="mt-10"
			style={{ animation: `fade-up 0.4s ease-out ${delay}s both` }}
		>
			<div className="row-heading">
				<h2>{def.title}</h2>
				<Link to={moreHref} className="more">
					更多 →
				</Link>
			</div>

			<div className="row-scroll row-fade">
				<div className="row-track">
					{items === null ? (
						Array.from({ length: PAGE_SIZE }).map((_, i) => (
							<div key={`sk-${def.key}-${i}`} className="row-skeleton-tile">
								<div className="ph" />
								<div className="ph-line" />
							</div>
						))
					) : items.length === 0 ? (
						<div className="flex h-[222px] w-full items-center rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-[12px] text-[var(--fg-mute)]">
							豆瓣暂不可用
						</div>
					) : (
						items.map((it) => <DoubanTile key={it.id} item={it} />)
					)}
				</div>
			</div>
		</section>
	);
}

function DoubanTile({ item }: { item: DoubanItem }) {
	const [proxied, setProxied] = useState(() =>
		item.cover ? doubanImagePath(item.cover) : "",
	);
	const params = new URLSearchParams({ q: item.title });
	if (item.cover) params.set("dbCover", item.cover);
	if (item.rate) params.set("dbRate", item.rate);
	if (item.url) params.set("db", item.url);

	useEffect(() => {
		if (!item.cover) {
			setProxied("");
			return;
		}
		const ctrl = new AbortController();
		setProxied(doubanImagePath(item.cover));
		resolveDoubanImage(item.cover, ctrl.signal)
			.then((src) => {
				if (!ctrl.signal.aborted) setProxied(src);
			})
			.catch(() => {
				if (!ctrl.signal.aborted) setProxied("");
			});
		return () => ctrl.abort();
	}, [item.cover]);

	return (
		<Link to={`/search?${params.toString()}`} className="db-tile">
			<div className="poster">
				{proxied ? (
					<img src={proxied} alt={item.title} loading="lazy" />
				) : (
					<div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--fg-faint)]">
						无封面
					</div>
				)}
				{item.rate ? <span className="rate">{item.rate}</span> : null}
				{item.isNew ? <span className="new">新</span> : null}
			</div>
			<div className="title">{item.title}</div>
		</Link>
	);
}
