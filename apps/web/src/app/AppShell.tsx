import {
  Activity,
  Bookmark,
  ChevronLeft,
  CircleUserRound,
  Clock3,
  Film,
  HardDrive,
  Heart,
  Home,
  Library,
  Search,
  Settings,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";

const primaryNav = [
  { to: "/", label: "首页", icon: Home },
  { to: "/search", label: "搜索", icon: Search },
  { to: "/library", label: "影视库", icon: Library },
  { to: "/favorites", label: "我的收藏", icon: Heart },
  { to: "/history", label: "继续观看", icon: Clock3 }
] as const;

const adminNav = [
  { to: "/admin/sources", label: "资源站", icon: HardDrive },
  { to: "/admin/profiles", label: "家庭档案", icon: UsersRound },
  { to: "/admin/system", label: "系统", icon: Activity }
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const compact = pathname.startsWith("/player/");

  if (compact) {
    return (
      <main className="player-shell">
        <Link to="/" className="player-shell__back" aria-label="返回首页">
          <ChevronLeft aria-hidden="true" />
        </Link>
        <Outlet />
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <Link to="/" className="brand" aria-label="MarsTV 首页">
          <Film aria-hidden="true" />
          <span>MarsTV</span>
        </Link>
        <nav aria-label="主要导航">
          {primaryNav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeProps={{ "data-active": "true" }}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-nav__divider" />
        <nav aria-label="管理导航">
          {adminNav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeProps={{ "data-active": "true" }}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-nav__spacer" />
        <div className="source-summary">
          <span><i /> 来源状态 · 良好</span>
          <small>在线 6/7 · 延迟 82ms</small>
        </div>
        <Link to="/settings" className="side-nav__utility">
          <Settings aria-hidden="true" />
          <span>设置</span>
        </Link>
        <Link to="/setup" className="side-nav__utility">
          <ShieldCheck aria-hidden="true" />
          <span>实例连接</span>
        </Link>
      </aside>
      <header className="top-bar">
        <div className="mobile-brand">MarsTV</div>
        <Link to="/search" className="top-bar__search">
          <Search aria-hidden="true" />
          <span>搜索影片、剧集与演员</span>
          <kbd>⌘ K</kbd>
        </Link>
        <button className="profile-button" type="button">
          <CircleUserRound aria-hidden="true" />
          <span>管理员</span>
        </button>
      </header>
      <main className="page-canvas">
        <Outlet />
      </main>
      <nav className="mobile-nav" aria-label="移动导航">
        <Link to="/" activeProps={{ "data-active": "true" }}><Home /><span>首页</span></Link>
        <Link to="/search" activeProps={{ "data-active": "true" }}><Search /><span>搜索</span></Link>
        <Link to="/favorites" activeProps={{ "data-active": "true" }}><Bookmark /><span>收藏</span></Link>
        <Link to="/settings" activeProps={{ "data-active": "true" }}><Settings /><span>设置</span></Link>
      </nav>
    </div>
  );
}
