import { Link, NavLink, Outlet, useNavigation } from "react-router";

const NAV_ITEMS = [
	{ to: "/", label: "首页" },
	{ to: "/search", label: "搜索" },
	{ to: "/douban", label: "豆瓣" },
	{ to: "/history", label: "历史" },
	{ to: "/favorites", label: "收藏" },
] as const;

export function RootLayout() {
	const navigation = useNavigation();
	const isLoading = navigation.state === "loading";

	return (
		<div className="relative flex min-h-screen flex-col text-[var(--fg)]">
			{/* Route-loading top bar */}
			{isLoading && (
				<div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] overflow-hidden bg-[var(--border)]">
					<div
						className="h-full w-1/3"
						style={{
							background: "var(--ember)",
							animation: "marstv-progress 1.2s ease-in-out infinite",
						}}
					/>
				</div>
			)}

			{/* ═══ 顶栏 · 极简 ═══ */}
			<header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(8,10,16,0.72)] backdrop-blur-xl">
				<div className="mx-auto flex h-[56px] w-full max-w-[1280px] items-center gap-6 px-6 md:px-8">
					{/* Wordmark */}
					<Link
						to="/"
						className="group flex items-center gap-2.5"
						aria-label="MarsTV 首页"
					>
						<img
							src="/logo.svg"
							alt=""
							aria-hidden
							className="h-6 w-6 opacity-95 transition-opacity group-hover:opacity-100"
						/>
						<span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--fg)]">
							MarsTV
						</span>
					</Link>

					{/* 导航 */}
					<nav className="ml-4 hidden items-center gap-1 md:flex">
						{NAV_ITEMS.map((item) => (
							<NavLink key={item.to} to={item.to} end={item.to === "/"}>
								{({ isActive }) => (
									<span
										className="nav-link"
										data-active={isActive ? "true" : undefined}
									>
										{item.label}
									</span>
								)}
							</NavLink>
						))}
					</nav>

					{/* 右侧 · 快捷键提示 */}
					<div className="ml-auto flex items-center gap-2">
						<span className="hint hidden md:inline">搜索</span>
						<span className="cmd-key">⌘</span>
						<span className="cmd-key">K</span>
					</div>
				</div>
			</header>

			{/* ═══ 主内容 ═══ */}
			<main className="relative z-[1] flex flex-1 flex-col">
				<Outlet />
			</main>

			{/* ═══ 极简页脚 ═══ */}
			<footer className="mt-16 border-t border-[var(--border)]">
				<div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-8">
					<div className="flex items-center gap-3">
						<img
							src="/logo.svg"
							alt=""
							aria-hidden
							className="h-4 w-4 opacity-80"
						/>
						<span className="text-[12px] text-[var(--fg-mute)]">
							MarsTV · 开源影视聚合
						</span>
					</div>
					<div className="flex items-center gap-4 text-[11px] text-[var(--fg-mute)]">
						<span>本地 · 私有</span>
						<span className="h-3 w-px bg-[var(--border-strong)]" />
						<span>无追踪 · 无广告</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
