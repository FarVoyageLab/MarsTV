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

	return (
		<div className={["w-full", className].filter(Boolean).join(" ")}>
			<form onSubmit={submit} className="relative">
				{/* Focus glow ring */}
				<div
					className={[
						"pointer-events-none absolute -inset-1 rounded-3xl transition-all duration-500",
						focused ? "opacity-100 ring-2 ring-primary/20" : "opacity-0",
					].join(" ")}
				/>

				<div
					className={[
						"flex items-center overflow-hidden transition-all duration-300",
						"bg-white/[0.025] backdrop-blur-xl border",
						big ? "h-16 rounded-3xl" : "h-12 rounded-2xl",
						focused
							? "border-primary/25 bg-white/[0.05] shadow-[0_0_48px_rgba(255,94,0,0.08),inset_0_0_0_1px_rgba(255,94,0,0.08)]"
							: "border-white/[0.06] hover:border-white/[0.10]",
					].join(" ")}
				>
					{/* Search icon — single, clean */}
					<div
						className={[
							"flex items-center justify-center transition-all duration-300",
							big ? "pl-5" : "pl-4",
						].join(" ")}
					>
						<svg
							width={big ? 20 : 16}
							height={big ? 20 : 16}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={focused ? 2.5 : 2}
							strokeLinecap="round"
							className={[
								"transition-all duration-300",
								focused ? "text-primary" : "text-dim-foreground/50",
							].join(" ")}
						>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.35-4.35" />
						</svg>
					</div>

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
							"h-full flex-1 bg-transparent px-3 font-medium tracking-wide text-foreground outline-none",
							"placeholder:font-normal placeholder:tracking-normal placeholder:text-dim-foreground/30",
							big ? "text-base" : "text-sm",
						].join(" ")}
						style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
					/>

					{/* Clear */}
					{value.length > 0 ? (
						<button
							type="button"
							onClick={() => {
								setValue("");
								inputRef.current?.focus();
							}}
							className={[
								"flex items-center justify-center rounded-full text-dim-foreground/40 transition-colors hover:text-foreground",
								big ? "h-8 w-8 mr-1" : "h-7 w-7",
							].join(" ")}
						>
							<svg
								width={big ? 16 : 14}
								height={big ? 16 : 14}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							>
								<path d="M18 6 6 18M6 6l12 12" />
							</svg>
						</button>
					) : null}

					{/* Submit button */}
					<button
						type="submit"
						disabled={loading || value.trim().length === 0}
						className={[
							"shrink-0 font-semibold tracking-wide transition-all disabled:opacity-20",
							"bg-primary text-white",
							"hover:bg-primary-intense hover:shadow-[0_4px_24px_rgba(255,94,0,0.25)]",
							"active:scale-[0.97]",
							big
								? "h-12 mr-2 rounded-2xl px-8 text-base"
								: "h-9 mr-1.5 rounded-xl px-5 text-sm",
						].join(" ")}
					>
						{loading ? (
							<span className="flex h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
						) : (
							"搜索"
						)}
					</button>
				</div>
			</form>

			{/* Shortcut hint */}
			{big ? (
				<p className="mt-3 text-center font-mono text-[10px] tracking-[0.15em] text-dim-foreground/25">
					<kbd className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px]">
						⌘K
					</kbd>
					<span className="ml-1.5">快速聚焦搜索</span>
				</p>
			) : null}
		</div>
	);
}
