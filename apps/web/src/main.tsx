import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { initSources } from "./lib/sources";
import { ConfigPage } from "./pages/ConfigPage";
import { DoubanPage } from "./pages/DoubanPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PlayPage } from "./pages/PlayPage";
import { SearchPage } from "./pages/SearchPage";

// Self-hosted fonts via fontsource — no network call to fonts.googleapis.com,
// works in restricted regions. Variable fonts cover all weights in one file.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";

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

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);

// Hydrate CMS sources from the Worker in the background. Pages that need the
// list subscribe via useSources(); anything calling loadSources() at render
// time will see an empty list on the first frame and re-render when this
// resolves.
void initSources();
