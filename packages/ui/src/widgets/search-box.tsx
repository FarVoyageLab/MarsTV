"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Props {
	onSearch: (query: string) => void;
	defaultValue?: string;
	autoFocus?: boolean;
	className?: string;
	size?: "default" | "lg";
}

// SearchBox — "Signal Receiver" panel.
//
// Top rail: mono telemetry (FREQ · CH · STATUS).
// Middle row: crosshair prefix + very large input + clear (×) + transmit arrow.
// Bottom rail: kbd hints in mono + live char count.
//
// Visual language mirrors the HeroMars transmission deck on the home page:
// slim mono caps, underline-as-baseline, orange accent on focus, minimal chrome.
export function SearchBox({
	onSearch,
	defaultValue = "",
	autoFocus = false,
	className,
	size = "default",
}: Props) {
	const [value, setValue] = useState(defaultValue);
	const [loading, setLoading] = useState(false);
	const [focused, setFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => setValue(defaultValue), [defaultValue]);

	const submit = useCallback(
		(e?: React.FormEvent) => {
			e?.preventDefault();
			const q = value.trim();
			if (!q || loading) return;
			setLoading(true);
			Promise.resolve(onSearch(q)).finally(() => setLoading(false));
		},
		[value, loading, onSearch],
	);

	const clear = useCallback(() => {
		setValue("");
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				inputRef.current?.focus();
			}
			if (
				e.key === "Escape" &&
				document.activeElement === inputRef.current &&
				value
			) {
				e.preventDefault();
				setValue("");
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [value]);

	const big = size === "lg";
	const canSubmit = value.trim().length > 0 && !loading;

	// Pseudo-channel number derived from input length — purely decorative.
	const channel = useMemo(() => {
		if (!value) return "∅∅";
		const n = (value.length * 7 + 11) % 100;
		return String(n).padStart(2, "0");
	}, [value]);

	const status = loading
		? "TRANSMITTING"
		: focused
			? value
				? "LOCKED"
				: "LISTENING"
			: "STANDBY";

	return (
		<div
			className={["marstv-scanner w-full", className].filter(Boolean).join(" ")}
		>
			<form onSubmit={submit}>
				{/* ───────── Top rail · telemetry ───────── */}
				<div
					className={[
						"flex items-center gap-2 pb-3 font-mono text-[10px] uppercase tracking-[0.28em] transition-colors duration-500",
						focused ? "text-primary/90" : "text-dim-foreground/40",
					].join(" ")}
				>
					<span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
						<span
							className={[
								"absolute inset-0 rounded-full transition-all duration-500",
								focused ? "bg-primary" : "bg-white/25",
							].join(" ")}
						/>
						{focused ? (
							<span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
						) : null}
					</span>
					<span>SCAN</span>
					<span className="opacity-40">·</span>
					<span>CH · {channel}</span>
					<span className="opacity-40">·</span>
					<span>{status}</span>
					<span className="ml-auto hidden sm:inline opacity-60">
						{loading ? "SENDING…" : canSubmit ? "PRESS ↵ TO TRANSMIT" : ""}
					</span>
				</div>

				{/* ───────── Main panel ───────── */}
				<div
					className={[
						"relative flex items-center gap-3 pl-1 sm:gap-5",
						big ? "py-4" : "py-3",
					].join(" ")}
				>
					{/* Crosshair + FREQ label */}
					<div
						className={[
							"hidden shrink-0 items-center gap-2.5 pr-1 font-mono text-[11px] uppercase tracking-[0.3em] transition-colors duration-500 sm:flex",
							focused ? "text-primary" : "text-dim-foreground/45",
						].join(" ")}
						aria-hidden
					>
						<svg
							width={big ? 22 : 18}
							height={big ? 22 : 18}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							aria-hidden="true"
							focusable="false"
						>
							<circle cx="12" cy="12" r="8" />
							<circle cx="12" cy="12" r="2" fill="currentColor" />
							<path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
						</svg>
						<span>FREQ</span>
					</div>

					{/* Vertical divider */}
					<div
						className={[
							"hidden h-10 w-px transition-colors duration-500 sm:block",
							focused ? "bg-primary/40" : "bg-white/10",
						].join(" ")}
						aria-hidden
					/>

					{/* Input */}
					<div className="relative flex-1">
						<input
							ref={inputRef}
							type="search"
							inputMode="search"
							name="q"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							onFocus={() => setFocused(true)}
							onBlur={() => setFocused(false)}
							onKeyDown={(e) => {
								if (e.key === "Enter") submit();
							}}
							placeholder="搜索片名、演员、关键词…"
							// biome-ignore lint/a11y/noAutofocus: opt-in via prop; callers decide
							autoFocus={autoFocus}
							autoComplete="off"
							spellCheck={false}
							data-scanner-input
							className={[
								"w-full bg-transparent font-light tracking-tight text-foreground outline-none caret-primary",
								big
									? "text-[32px] leading-[1.2] md:text-[40px]"
									: "text-[22px] leading-[1.3] md:text-[26px]",
							].join(" ")}
						/>
					</div>

					{/* Clear (×) */}
					{value && !loading ? (
						<button
							type="button"
							onClick={clear}
							aria-label="清除"
							className="shrink-0 rounded-full p-2 text-dim-foreground/50 transition-colors hover:bg-white/[0.04] hover:text-foreground"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								aria-hidden="true"
								focusable="false"
							>
								<path d="M18 6 6 18M6 6l12 12" />
							</svg>
						</button>
					) : null}

					{/* Transmit */}
					<button
						type="submit"
						disabled={!canSubmit}
						aria-label={loading ? "搜索中" : "搜索"}
						className={[
							"group/tx flex shrink-0 items-center gap-3 transition-all duration-300",
							canSubmit ? "cursor-pointer" : "cursor-not-allowed opacity-40",
						].join(" ")}
					>
						<span
							className={[
								"hidden font-mono text-[11px] uppercase tracking-[0.28em] sm:inline",
								canSubmit ? "text-primary" : "text-dim-foreground/40",
							].join(" ")}
						>
							{loading ? "SENDING" : "TRANSMIT"}
						</span>
						<span
							className={[
								"relative flex items-center justify-center rounded-full border transition-all duration-300",
								big ? "h-14 w-14" : "h-12 w-12",
								canSubmit
									? "border-primary/60 bg-primary/10 text-primary group-hover/tx:bg-primary group-hover/tx:text-white group-hover/tx:shadow-[0_0_28px_rgba(255,94,0,0.35)] group-active/tx:scale-95"
									: "border-white/10 text-dim-foreground/40",
							].join(" ")}
						>
							{loading ? (
								<svg
									className="animate-spin"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
									focusable="false"
								>
									<circle
										cx="12"
										cy="12"
										r="9"
										stroke="currentColor"
										strokeOpacity="0.25"
										strokeWidth="2"
									/>
									<path
										d="M21 12a9 9 0 0 0-9-9"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
									/>
								</svg>
							) : (
								<svg
									width={big ? 20 : 18}
									height={big ? 20 : 18}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="transition-transform duration-300 group-hover/tx:translate-x-0.5"
									aria-hidden="true"
									focusable="false"
								>
									<path d="M5 12h14M13 5l7 7-7 7" />
								</svg>
							)}
						</span>
					</button>
				</div>

				{/* Animated baseline */}
				<div className="relative h-px w-full overflow-hidden">
					{/* Resting line */}
					<span
						className={[
							"absolute inset-0 transition-colors duration-500",
							focused || value ? "bg-white/20" : "bg-white/10",
						].join(" ")}
					/>
					{/* Focus bar — grows from center */}
					<span
						className={[
							"absolute inset-y-0 left-1/2 -translate-x-1/2 bg-primary transition-all duration-500 ease-out",
							focused ? "w-full" : "w-0",
						].join(" ")}
					/>
					{/* Scanning sweep — runs while typing */}
					{focused && value ? (
						<span
							className="marstv-scanner-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent"
							aria-hidden
						/>
					) : null}
				</div>

				{/* ───────── Bottom rail · kbd hints ───────── */}
				<div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.25em] text-dim-foreground/35">
					<Hint label="聚焦" keys={["⌘", "K"]} />
					<Hint label="发射" keys={["↵"]} />
					<Hint label="清除" keys={["ESC"]} />
					<span className="ml-auto tabular-nums">
						{value.length > 0
							? `${value.length.toString().padStart(3, "0")} CHARS`
							: ""}
					</span>
				</div>
			</form>

			{/* Component-local styles:
			    - serif italic placeholder (uses Instrument Serif loaded in web main.tsx)
			    - sweep keyframes */}
			<style>{`
				.marstv-scanner [data-scanner-input]::placeholder {
					font-family: 'Instrument Serif', 'Noto Serif SC', Georgia, serif;
					font-style: italic;
					font-weight: 400;
					letter-spacing: 0;
					color: rgba(255, 255, 255, 0.18);
				}
				.marstv-scanner [data-scanner-input]::-webkit-search-cancel-button { display: none; }
				@keyframes marstv-scanner-sweep {
					0%   { transform: translateX(0); opacity: 0; }
					15%  { opacity: 1; }
					85%  { opacity: 1; }
					100% { transform: translateX(450%); opacity: 0; }
				}
				.marstv-scanner-sweep {
					animation: marstv-scanner-sweep 1.8s ease-in-out infinite;
				}
				@media (prefers-reduced-motion: reduce) {
					.marstv-scanner-sweep { animation: none; }
				}
			`}</style>
		</div>
	);
}

function Hint({ keys, label }: { keys: string[]; label: string }) {
	return (
		<span className="flex items-center gap-1.5">
			{keys.map((k) => (
				<kbd
					key={k}
					className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-white/[0.08] bg-white/[0.02] px-1.5 text-[10px] font-medium normal-case tracking-normal text-dim-foreground/70"
				>
					{k}
				</kbd>
			))}
			<span>{label}</span>
		</span>
	);
}
