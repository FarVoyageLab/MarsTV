import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { RootLayout } from "@marstv/web/layouts/RootLayout";
import { DoubanPage } from "@marstv/web/pages/DoubanPage";
import { FavoritesPage } from "@marstv/web/pages/FavoritesPage";
import { HistoryPage } from "@marstv/web/pages/HistoryPage";
import { HomePage } from "@marstv/web/pages/HomePage";
import { NotFoundPage } from "@marstv/web/pages/NotFoundPage";
import { PlayPage } from "@marstv/web/pages/PlayPage";
import { SearchPage } from "@marstv/web/pages/SearchPage";
import { initSources } from "./lib/sources";
import { SettingsPage } from "./pages/SettingsPage";
import "./index.css";

// Hydrate sources from localStorage before the first render so useSources()
// in the reused web pages has the list ready on the initial paint.
initSources();

const router = createBrowserRouter([
	{
		element: <RootLayout />,
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

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
