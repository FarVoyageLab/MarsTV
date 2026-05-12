import { Outlet, useNavigation } from "react-router";
import { SidebarNav } from "./SidebarNav";
import { Topbar } from "./Topbar";
import { Bottombar } from "./Bottombar";

export function RootLayout() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  return (
    <div className="app-shell">
      {/* Route-loading progress bar */}
      {isLoading && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] overflow-hidden bg-[var(--border)]">
          <div
            className="h-full w-1/3"
            style={{
              background: "var(--accent)",
              animation: "marstv-progress 1.2s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* Sidebar (desktop/tablet) */}
      <SidebarNav />

      {/* Main area */}
      <div className="app-main">
        {/* Topbar */}
        <Topbar />

        {/* Content */}
        <main className="content-scroll">
          <Outlet />
        </main>

        {/* Bottombar (mobile) */}
        <Bottombar />
      </div>
    </div>
  );
}
