import { DoubanPage } from "@marstv/ui/app/pages/DoubanPage";
import { FavoritesPage } from "@marstv/ui/app/pages/FavoritesPage";
import { HistoryPage } from "@marstv/ui/app/pages/HistoryPage";
import { HomePage } from "@marstv/ui/app/pages/HomePage";
import { NotFoundPage } from "@marstv/ui/app/pages/NotFoundPage";
import { PlayPage } from "@marstv/ui/app/pages/PlayPage";
import { SearchPage } from "@marstv/ui/app/pages/SearchPage";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { DesktopRoot } from "./layouts/DesktopRoot";
import { initDesktopRuntime } from "./lib/douban";
import { initSources } from "./lib/sources";
import { SettingsPage } from "./pages/SettingsPage";
import "@marstv/ui/app/styles/shell.css";
import "./index.css";

// Hydrate sources from the Tauri app config file so useSources() in the reused
// shared pages can render the local desktop source list.
initSources();
initDesktopRuntime();

const router = createBrowserRouter([
	{
		element: <DesktopRoot />,
		children: [
			{ index: true, element: <HomePage /> },
			{ path: "search", element: <SearchPage /> },
			{ path: "play/:source/:id", element: <PlayPage /> },
			{ path: "douban", element: <DoubanPage /> },
			{ path: "favorites", element: <FavoritesPage /> },
			{ path: "history", element: <HistoryPage /> },
			{ path: "settings", element: <SettingsPage /> },
			{ path: "*", element: <NotFoundPage /> },
		],
	},
]);

const root = document.getElementById("root");
if (!root) {
	throw new Error("MarsTV desktop root element was not found.");
}

createRoot(root).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
