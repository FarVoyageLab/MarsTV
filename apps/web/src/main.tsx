import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { DoubanPage } from "./pages/DoubanPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PlayPage } from "./pages/PlayPage";
import { SearchPage } from "./pages/SearchPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route element={<RootLayout />}>
					<Route index element={<HomePage />} />
					<Route path="search" element={<SearchPage />} />
					<Route path="play/:source/:id" element={<PlayPage />} />
					<Route path="douban" element={<DoubanPage />} />
					<Route path="favorites" element={<FavoritesPage />} />
					<Route path="history" element={<HistoryPage />} />
					<Route path="subscriptions" element={<SubscriptionsPage />} />
					<Route path="login" element={<LoginPage />} />
					<Route path="*" element={<NotFoundPage />} />
				</Route>
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);
