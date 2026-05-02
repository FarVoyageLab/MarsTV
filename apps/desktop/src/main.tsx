import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
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
