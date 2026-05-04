// TypeScript 6 compat: phosphor-icons may not resolve correctly with "bundler" moduleResolution.
// This ensures the icons used by shadcn components are available.
declare module "@phosphor-icons/react" {
	import type { Icon } from "@phosphor-icons/react/dist/lib/types";
	export const CaretDown: Icon;
	export const CaretDownIcon: Icon;
	export const CaretUp: Icon;
	export const CaretUpIcon: Icon;
	export const CaretRight: Icon;
	export const CaretRightIcon: Icon;
	export const CaretLeft: Icon;
	export const CaretLeftIcon: Icon;
	export const DotsThree: Icon;
	export const DotsThreeIcon: Icon;
	export const Check: Icon;
	export const CheckIcon: Icon;
	export const X: Icon;
	export const XIcon: Icon;
	export const MagnifyingGlass: Icon;
	export const MagnifyingGlassIcon: Icon;
	export const Minus: Icon;
	export const MinusIcon: Icon;
	export const Sidebar: Icon;
	export const SidebarIcon: Icon;
	export const CheckCircle: Icon;
	export const CheckCircleIcon: Icon;
	export const Info: Icon;
	export const InfoIcon: Icon;
	export const Warning: Icon;
	export const WarningIcon: Icon;
	export const XCircle: Icon;
	export const XCircleIcon: Icon;
	export const Spinner: Icon;
	export const SpinnerIcon: Icon;
	export const BatteryWarning: Icon;
	export const BatteryWarningVertical: Icon;
	export const CalendarCheck: Icon;
}
