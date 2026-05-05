import { RootLayout } from "@marstv/ui/app/layouts/RootLayout";
import { DesktopTitlebar } from "../components/DesktopTitlebar";

export function DesktopRoot() {
	return (
		<>
			<DesktopTitlebar />
			<div className="desktop-window-content">
				<RootLayout />
			</div>
		</>
	);
}
