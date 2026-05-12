import { useLocation, useNavigate } from "react-router";

function SearchMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <polyline points="15,18 9,12 15,6"/>
    </svg>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/": "首页",
  "/search": "搜索",
  "/categories": "分类浏览",
  "/library": "片库",
  "/settings": "设置",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/play/")) return "正在播放";
  if (pathname.startsWith("/detail/")) return "影片详情";
  return PAGE_TITLES[pathname] ?? "MarsTV";
}

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSubPage = location.pathname.startsWith("/play/") || location.pathname.startsWith("/detail/");

  return (
    <div className="topbar">
      {isSubPage && (
        <button
          onClick={() => navigate(-1)}
          className="btn-cinema-icon"
          aria-label="返回"
        >
          <BackIcon />
        </button>
      )}
      <span className="page-title">{getPageTitle(location.pathname)}</span>
      <div className="search-mini" onClick={() => navigate("/search")}>
        <SearchMiniIcon />
        <span>搜索影片、导演、演员…</span>
      </div>
    </div>
  );
}
