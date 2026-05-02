"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
	onSearch: (query: string) => void;
	defaultValue?: string;
	autoFocus?: boolean;
	className?: string;
	size?: "default" | "lg";
}

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

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				inputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const big = size === "lg";
	const canSubmit = value.trim().length > 0 && !loading;

	return (
		<div className={["w-full", className].filter(Boolean).join(" ")}>
			<form onSubmit={submit} className="group relative">
				{/* ── Focus aura ── */}
				<div
					className={[
						"pointer-events-none absolute -inset-[3px] rounded-3xl transition-all duration-700",
						focused ? "opacity-100 bg-primary/5 blur-md" : "opacity-0",
					].join(" ")}
				/>

				{/* ── The bar ── */}
				<div
					className={[
						"relative flex items-center transition-all duration-500",
						"bg-white/[0.025] backdrop-blur-xl",
						big ? "h-16 rounded-3xl pl-6" : "h-12 rounded-2xl pl-4",
						focused
							? "bg-white/[0.05] shadow-[0_0_0_1px_rgba(255,94,0,0.2),0_0_60px_rgba(255,94,0,0.06)]"
							: "shadow-[0_0_0_1px_rgba(255,255,255,0.06)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10)]",
					].join(" ")}
				>
					{/* Magnifying glass */}
					<svg
						width={big ? 20 : 16}
						height={big ? 20 : 16}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={focused ? 2.5 : 1.8}
						strokeLinecap="round"
						className={[
							"shrink-0 transition-all duration-500",
							focused ? "text-primary" : "text-dim-foreground/35",
						].join(" ")}
					>
						<circle cx="11" cy="11" r="8" />
						<path d="m21 21-4.35-4.35" />
					</svg>

					{/* Input */}
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
						placeholder="搜索电影、电视剧、动漫…"
						autoFocus={autoFocus}
						autoComplete="off"
						spellCheck={false}
						className={[
							"h-full flex-1 bg-transparent px-3 font-medium tracking-wide text-foreground/90 outline-none",
							"placeholder:font-normal placeholder:tracking-normal placeholder:text-dim-foreground/25",
							big ? "text-base" : "text-sm",
						].join(" ")}
						style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
					/>

					{/* Divider + CTA — appears when there's input */}
					<div
						className={[
							"flex items-center gap-3 transition-all duration-300",
							canSubmit ? "opacity-100 pr-4" : "opacity-0",
						].join(" ")}
					>
						<div className="h-6 w-px bg-white/[0.08]" />
						<button
							type="submit"
							className={[
								"group/btn relative flex items-center gap-2 overflow-hidden rounded-2xl font-semibold tracking-wide transition-all",
								big ? "h-11 px-6 text-sm" : "h-9 px-4 text-xs",
								"bg-primary text-white",
								"hover:shadow-[0_0_32px_rgba(255,94,0,0.3)]",
								"active:scale-[0.97]",
							].join(" ")}
						>
							{/* Inner highlight */}
							<div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/15 to-transparent" />
							<span className="relative">搜索</span>
							<svg
								width={big ? 14 : 12}
								height={big ? 14 : 12}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="relative transition-transform group-hover/btn:translate-x-0.5"
							>
								<path d="M5 12h14M12 5l7 7-7 7" />
							</svg>
						</button>
					</div>

					{/* Idle state — subtle hint */}
					<div
						className={[
							"flex items-center transition-all duration-300 pr-5",
							canSubmit ? "hidden" : "",
						].join(" ")}
					>
						<span className="font-mono text-[10px] tracking-widest text-dim-foreground/15">
							↵
						</span>
					</div>
				</div>
			</form>

			{/* Shortcut */}
			{big ? (
				<p className="mt-3 text-center font-mono text-[10px] tracking-[0.15em] text-dim-foreground/20">
					<kbd className="rounded border border-white/[0.04] bg-white/[0.01] px-1.5 py-0.5 text-[10px]">
						⌘K
					</kbd>
					<span className="ml-1.5">聚焦搜索</span>
				</p>
			) : null}
		</div>
	);
}
