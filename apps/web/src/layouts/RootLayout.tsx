import { Link, NavLink, Outlet, useNavigation } from "react-router";
import { useEffect, useState } from "react";

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="marstv-space-bg relative flex min-h-screen flex-col text-foreground selection:bg-primary/20 selection:text-primary-foreground">
      {/* Subtle scanline & atmospheric overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] opacity-20 mix-blend-overlay" />
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        <div className="h-[10vh] w-full animate-scanline bg-gradient-to-b from-transparent via-primary/5 to-transparent opacity-30 mix-blend-screen" />
      </div>

      {isLoading && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] overflow-hidden bg-white/5">
          <div className="h-full w-1/3 animate-[marstv-progress_1.2s_ease-in-out_infinite] bg-primary shadow-[0_0_12px_rgba(255,94,0,0.8)]" />
        </div>
      )}

      {/* Floating Glassmorphism Header */}
      <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <div
          className={`flex h-14 w-full max-w-4xl items-center justify-between rounded-2xl border px-4 transition-all duration-500 md:px-6 ${
            scrolled
              ? "border-white/10 bg-[#08080d]/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl saturate-150"
              : "border-white/5 bg-[#08080d]/40 shadow-none backdrop-blur-md"
          }`}
        >
          <Link to="/" className="group flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center">
              <div className="absolute inset-0 animate-martian-glow rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <img
                src="/logo.svg"
                alt="MarsTV"
                className="relative z-10 h-6 w-6 drop-shadow-[0_0_8px_rgba(255,94,0,0.5)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <span className="font-sans font-semibold tracking-wide text-white/90">
              Mars<span className="text-primary">TV</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-[inset_0_0_12px_rgba(255,94,0,0.1)]"
                      : "text-white/50 hover:bg-white/5 hover:text-white/90"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile Status Indicator */}
          <div className="flex items-center gap-3 sm:hidden">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary/80 shadow-[0_0_8px_rgba(255,94,0,0.6)]" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-[1] flex flex-1 flex-col pb-20 pt-28">
        <Outlet />
      </main>

      {/* Floating Glassmorphism Footer */}
      <footer className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
        <div className="flex h-10 items-center justify-center rounded-full border border-white/5 bg-[#08080d]/40 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all hover:border-primary/20">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            SYS.MARSTV.CORE // CLASSIFIED_ARCHIVE // V2.0
          </span>
        </div>
      </footer>
    </div>
  );
}
