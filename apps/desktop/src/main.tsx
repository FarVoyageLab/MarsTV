import { CategoriesPage } from "@marstv/ui/app/pages/CategoriesPage";
import { DetailPage } from "@marstv/ui/app/pages/DetailPage";
import { DoubanPage } from "@marstv/ui/app/pages/DoubanPage";
import { HomePage } from "@marstv/ui/app/pages/HomePage";
import { LibraryPage } from "@marstv/ui/app/pages/LibraryPage";
import { NotFoundPage } from "@marstv/ui/app/pages/NotFoundPage";
import { PlayPage } from "@marstv/ui/app/pages/PlayPage";
import { SearchPage } from "@marstv/ui/app/pages/SearchPage";
import { SettingsPage } from "@marstv/ui/app/pages/SettingsPage";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { DesktopRoot } from "./layouts/DesktopRoot";
import { initDesktopRuntime } from "./lib/douban";
import { initSources } from "./lib/sources";
import "@marstv/ui/app/styles/shell.css";
import "./index.css";

initSources();
initDesktopRuntime();

const router = createBrowserRouter([
  {
    element: <DesktopRoot />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "search", element: <SearchPage /> },
      { path: "play/:source/:id", element: <PlayPage /> },
      { path: "detail/:source/:id", element: <DetailPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "douban", element: <DoubanPage /> },
      { path: "favorites", element: <LibraryPage /> },
      { path: "history", element: <LibraryPage /> },
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
