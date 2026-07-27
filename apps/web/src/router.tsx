import {
  createRootRoute,
  createRoute,
  createRouter
} from "@tanstack/react-router";
import { AppShell } from "./app/AppShell";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { DetailPage } from "./pages/DetailPage";
import { PlayerPage } from "./pages/PlayerPage";
import { AdminSourcesPage } from "./pages/AdminSourcesPage";
import { CollectionPage } from "./pages/CollectionPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { SystemPage } from "./pages/SystemPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SetupPage } from "./pages/SetupPage";
import { StateView } from "./components/StateView";

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: () => (
    <StateView
      kind="empty"
      title="页面不存在"
      description="这个页面可能已移动，返回首页继续浏览。"
    />
  )
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage
});

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: () => <CollectionPage kind="library" />
});

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/favorites",
  component: () => <CollectionPage kind="favorites" />
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: () => <CollectionPage kind="history" />
});

const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/detail/$sourceId/$itemId",
  component: DetailPage
});

const playerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/player/$sourceId/$itemId/$episodeId",
  component: PlayerPage
});

const sourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/sources",
  component: AdminSourcesPage
});

const profilesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/profiles",
  component: ProfilesPage
});

const systemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/system",
  component: SystemPage
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage
});

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup",
  component: SetupPage
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  libraryRoute,
  favoritesRoute,
  historyRoute,
  detailRoute,
  playerRoute,
  sourcesRoute,
  profilesRoute,
  systemRoute,
  settingsRoute,
  setupRoute
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
