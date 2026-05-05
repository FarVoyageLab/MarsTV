import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { RootLayout } from "@marstv/ui/app/layouts/RootLayout";
import { DoubanPage } from "@marstv/ui/app/pages/DoubanPage";
import { FavoritesPage } from "@marstv/ui/app/pages/FavoritesPage";
import { HistoryPage } from "@marstv/ui/app/pages/HistoryPage";
import { HomePage } from "@marstv/ui/app/pages/HomePage";
import { NotFoundPage } from "@marstv/ui/app/pages/NotFoundPage";
import { PlayPage } from "@marstv/ui/app/pages/PlayPage";
import { SearchPage } from "@marstv/ui/app/pages/SearchPage";
import { initSources } from "./lib/sources";
import { ConfigPage } from "./pages/ConfigPage";
import { LoginPage } from "./pages/LoginPage";

// Self-hosted fonts via fontsource — no network call to fonts.googleapis.com,
// works in restricted regions. Variable fonts cover all weights in one file.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";

import "@marstv/ui/app/styles/shell.css";
import "./index.css";

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
			{ path: "config", element: <ConfigPage /> },
			{ path: "login", element: <LoginPage /> },
			{ path: "*", element: <NotFoundPage /> },
		],
	},
]);

const root = document.getElementById("root");
if (!root) {
	throw new Error("MarsTV web root element was not found.");
}

createRoot(root).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);

// Hydrate CMS sources from the Worker in the background. Pages that need the
// list subscribe via useSources(); anything calling loadSources() at render
// time will see an empty list on the first frame and re-render when this
// resolves.
void initSources();
