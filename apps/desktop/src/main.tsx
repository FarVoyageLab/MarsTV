import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { RootLayout } from "../../web/src/layouts/RootLayout";
import { DoubanPage } from "../../web/src/pages/DoubanPage";
import { FavoritesPage } from "../../web/src/pages/FavoritesPage";
import { HistoryPage } from "../../web/src/pages/HistoryPage";
import { HomePage } from "../../web/src/pages/HomePage";
import { LoginPage } from "../../web/src/pages/LoginPage";
import { NotFoundPage } from "../../web/src/pages/NotFoundPage";
import { PlayPage } from "../../web/src/pages/PlayPage";
import { SearchPage } from "../../web/src/pages/SearchPage";
import { SubscriptionsPage } from "../../web/src/pages/SubscriptionsPage";
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
			{ path: "subscriptions", element: <SubscriptionsPage /> },
			{ path: "settings", element: <SettingsPage /> },
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
