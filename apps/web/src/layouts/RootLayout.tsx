import { Link, Outlet, useNavigation } from "react-router";

const NAV_ITEMS = [
	{ to: "/", label: "首页" },
	{ to: "/search", label: "搜索" },
	{ to: "/douban", label: "豆瓣" },
	{ to: "/subscriptions", label: "追剧" },
	{ to: "/history", label: "历史" },
	{ to: "/favorites", label: "收藏" },
] as const;

export function RootLayout() {
	const navigation = useNavigation();
	const isLoading = navigation.state === "loading";

	return (
		<div className="marstv-space-bg flex min-h-screen flex-col text-foreground">
			{isLoading ? (
				<div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden">
					<div className="h-full w-1/3 animate-[marstv-progress_1.2s_ease-in-out_infinite] bg-primary" />
				</div>
			) : null}

			<header className="glass-header sticky top-0 z-30">
				<div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-8">
					<Link to="/" className="flex items-center gap-2.5">
						<img
							src="/logo.svg"
							alt="MarsTV"
							className="h-8 w-8 drop-shadow-[0_0_12px_rgba(255,122,0,0.3)]"
						/>
						<span className="font-semibold tracking-tight">MarsTV</span>
					</Link>
					<nav className="hidden items-center gap-1 text-sm sm:flex">
						{NAV_ITEMS.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className="rounded-lg px-3 py-1.5 text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
							>
								{item.label}
							</Link>
						))}
					</nav>
				</div>
			</header>

			<main className="relative z-[1] flex flex-1 flex-col">
				<Outlet />
			</main>

			<footer className="glass-footer relative z-[1] py-5">
				<div className="mx-auto w-full max-w-7xl px-4 text-center text-[11px] text-dim-foreground">
					MarsTV · 仅限个人学习研究 · 不提供、不存储、不分发任何视频内容
				</div>
			</footer>
		</div>
	);
}
