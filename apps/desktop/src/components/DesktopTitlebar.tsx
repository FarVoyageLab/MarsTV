import { getCurrentWindow } from "@tauri-apps/api/window";
import { NavLink } from "react-router";

const appWindow = getCurrentWindow();

const NAV_ITEMS = [
	{ to: "/", label: "首页" },
	{ to: "/search", label: "搜索" },
	{ to: "/douban", label: "豆瓣" },
	{ to: "/history", label: "历史" },
	{ to: "/favorites", label: "收藏" },
] as const;

export function DesktopTitlebar() {
	const minimize = () => {
		void appWindow.minimize();
	};

	const toggleMaximize = () => {
		void appWindow.toggleMaximize();
	};

	const close = () => {
		void appWindow.close();
	};

	return (
		<div className="desktop-titlebar" data-tauri-drag-region>
			<div className="desktop-titlebar__brand">
				<span className="desktop-titlebar__mark" aria-hidden />
				<span>MarsTV</span>
			</div>
			<nav className="desktop-titlebar__nav" aria-label="主导航">
				{NAV_ITEMS.map((item) => (
					<NavLink key={item.to} to={item.to} end={item.to === "/"}>
						{({ isActive }) => (
							<span
								className="desktop-titlebar__nav-item"
								data-active={isActive ? "true" : undefined}
							>
								{item.label}
							</span>
						)}
					</NavLink>
				))}
			</nav>
			<button
				type="button"
				className="desktop-titlebar__drag-zone"
				data-tauri-drag-region
				aria-label="拖动窗口"
				onMouseDown={(event) => {
					if (event.button === 0) void appWindow.startDragging();
				}}
			/>
			<div className="desktop-titlebar__controls">
				<NavLink
					to="/settings"
					className="desktop-titlebar__settings"
					aria-label="设置"
					title="设置"
				>
					{({ isActive }) => (
						<span
							className="desktop-titlebar__settings-icon"
							data-active={isActive ? "true" : undefined}
							aria-hidden
						>
							⚙
						</span>
					)}
				</NavLink>
				<button type="button" onClick={minimize} aria-label="最小化窗口">
					-
				</button>
				<button type="button" onClick={toggleMaximize} aria-label="最大化窗口">
					▢
				</button>
				<button
					type="button"
					onClick={close}
					aria-label="关闭窗口"
					className="desktop-titlebar__close"
				>
					x
				</button>
			</div>
		</div>
	);
}
