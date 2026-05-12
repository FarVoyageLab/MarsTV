import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { RootLayout } from "@marstv/ui/app/layouts/RootLayout";
import { CategoriesPage } from "@marstv/ui/app/pages/CategoriesPage";
import { DetailPage } from "@marstv/ui/app/pages/DetailPage";
import { DoubanPage } from "@marstv/ui/app/pages/DoubanPage";
import { HomePage } from "@marstv/ui/app/pages/HomePage";
import { LibraryPage } from "@marstv/ui/app/pages/LibraryPage";
import { NotFoundPage } from "@marstv/ui/app/pages/NotFoundPage";
import { PlayPage } from "@marstv/ui/app/pages/PlayPage";
import { SearchPage } from "@marstv/ui/app/pages/SearchPage";
import { SettingsPage } from "@marstv/ui/app/pages/SettingsPage";
import { initSources } from "./lib/sources";
import { ConfigPage } from "./pages/ConfigPage";
import { LoginPage } from "./pages/LoginPage";

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
      { path: "detail/:source/:id", element: <DetailPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "douban", element: <DoubanPage /> },
      { path: "config", element: <ConfigPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "favorites", element: <LibraryPage /> },
      { path: "history", element: <LibraryPage /> },
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

void initSources();
