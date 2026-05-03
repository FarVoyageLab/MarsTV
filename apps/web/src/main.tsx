import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
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
