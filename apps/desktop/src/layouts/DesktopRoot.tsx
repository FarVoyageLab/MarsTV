
import { RootLayout } from "@marstv/ui/app/layouts/RootLayout";
import { DesktopTitlebar } from "../components/DesktopTitlebar";

export function DesktopRoot() {
  return (
    <div className="desktop-window-content">
      <DesktopTitlebar />
      <RootLayout />
    </div>
  );
}
