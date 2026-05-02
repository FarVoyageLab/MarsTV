"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react";
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
	const [focused, setFocused] = useState(false);
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setValue(defaultValue);
	}, [defaultValue]);

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

	// Keyboard shortcut: Ctrl+K / ⌘K to focus
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
	const showClear = value.length > 0;

	return (
		<div className={["w-full", className].filter(Boolean).join(" ")}>
			<form
				onSubmit={submit}
				className={[
					"group relative flex items-center rounded-2xl transition-all duration-300",
					"glass-card border",
					focused
						? "border-primary/30 shadow-[0_0_24px_rgba(255,107,53,0.10)]"
						: "border-border/40 hover:border-border-strong",
					big ? "h-14" : "h-11",
				].join(" ")}
			>
				{/* Search icon */}
				<div
					className={[
						"pointer-events-none absolute left-0 flex items-center justify-center text-dim-foreground transition-colors duration-300",
						focused ? "text-primary/70" : "",
						big ? "h-14 w-12" : "h-11 w-10",
					].join(" ")}
				>
					<MagnifyingGlass
						weight={focused ? "fill" : "regular"}
						className={big ? "h-5 w-5" : "h-4 w-4"}
					/>
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
					placeholder="搜索电影、电视剧、动漫…"
					autoFocus={autoFocus}
					autoComplete="off"
					className={[
						"h-full flex-1 bg-transparent pl-0 pr-2 text-foreground placeholder:text-dim-foreground/50",
						"outline-none",
						big ? "text-base" : "text-sm",
						showClear ? "pr-2" : "pr-4",
					].join(" ")}
					style={{ paddingLeft: big ? "3rem" : "2.5rem" }}
				/>

				{/* Clear button */}
				{showClear ? (
					<button
						type="button"
						onClick={() => {
							setValue("");
							inputRef.current?.focus();
						}}
						className={[
							"flex shrink-0 items-center justify-center rounded-full text-dim-foreground transition-all hover:text-foreground",
							big ? "h-8 w-8" : "h-7 w-7",
						].join(" ")}
					>
						<X className={big ? "h-4 w-4" : "h-3.5 w-3.5"} />
					</button>
				) : null}

				{/* Divider + Submit button */}
				{showClear || true ? (
					<div className="flex shrink-0 items-center self-stretch pr-2">
						<div className="mr-2 h-5 w-px bg-border/40" />
						<button
							type="submit"
							disabled={loading || value.trim().length === 0}
							className={[
								"flex shrink-0 items-center gap-1.5 rounded-xl px-4 font-medium transition-all disabled:opacity-40",
								"bg-primary/15 text-primary hover:bg-primary/25 active:scale-95",
								big ? "h-9 text-sm" : "h-8 text-xs",
							].join(" ")}
						>
							{loading ? (
								<span className="inline-flex items-center gap-1.5">
									<span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
									搜索中
								</span>
							) : (
								<>
									<MagnifyingGlass className="h-3 w-3" />
									搜索
								</>
							)}
						</button>
					</div>
				) : null}

				{/* Subtle loading bar */}
				{loading ? (
					<div className="pointer-events-none absolute inset-x-3 -bottom-px h-[2px] overflow-hidden rounded-full">
						<div className="h-full w-1/3 animate-[marstv-progress_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary via-orange-400 to-primary" />
					</div>
				) : null}
			</form>

			{/* Keyboard shortcut hint */}
			<p className="mt-2 text-center text-[10px] text-dim-foreground/50">
				按{" "}
				<kbd className="rounded border border-border/40 bg-surface/40 px-1 py-px font-mono text-[10px]">
					⌘K
				</kbd>{" "}
				快速聚焦搜索
			</p>
		</div>
	);
}
