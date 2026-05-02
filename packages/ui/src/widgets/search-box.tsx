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

	// ⌘K / Ctrl+K to focus
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
			<form
				onSubmit={submit}
				className={[
					"group relative flex items-center transition-all duration-500",
					"rounded-2xl border",
					// Liquid glass surface
					"bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-white/[0.04]",
					"backdrop-blur-xl",
					// Iridescent border
					focused
						? "border-white/[0.12] shadow-[0_0_32px_rgba(255,122,0,0.08),0_0_0_1px_rgba(255,122,0,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]"
						: "border-white/[0.06] hover:border-white/[0.09]",
					big ? "h-14" : "h-11",
				].join(" ")}
			>
				{/* Iridescent edge glow on focus */}
				<div
					className={[
						"pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-700",
						focused ? "opacity-100" : "",
					].join(" ")}
					style={{
						background:
							"linear-gradient(135deg, rgba(255,122,0,0.15) 0%, rgba(61,214,208,0.08) 50%, rgba(229,46,113,0.06) 100%)",
						filter: "blur(1px)",
						zIndex: -1,
					}}
				/>

				{/* Search icon */}
				<div
					className={[
						"pointer-events-none absolute left-0 flex items-center justify-center transition-all duration-500",
						focused ? "text-primary/80" : "text-dim-foreground/60",
						big ? "h-14 w-12" : "h-11 w-10",
					].join(" ")}
				>
					<MagnifyingGlass
						weight={focused ? "fill" : "regular"}
						className={[
							"transition-all duration-500",
							big ? "h-5 w-5" : "h-4 w-4",
							focused
								? "scale-110 drop-shadow-[0_0_8px_rgba(255,122,0,0.3)]"
								: "",
						].join(" ")}
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
						"peer h-full flex-1 bg-transparent text-foreground outline-none",
						"placeholder:text-dim-foreground/40",
						big ? "text-base" : "text-sm",
					].join(" ")}
					style={{ paddingLeft: big ? "3rem" : "2.5rem" }}
				/>

				{/* Clear button */}
				<button
					type="button"
					onClick={() => {
						setValue("");
						inputRef.current?.focus();
					}}
					className={[
						"flex shrink-0 items-center justify-center rounded-full",
						"text-dim-foreground/50 transition-all hover:text-foreground",
						"opacity-0 peer-[:not(:placeholder-shown)]:opacity-100",
						big ? "h-8 w-8" : "h-7 w-7",
					].join(" ")}
				>
					<X className={big ? "h-4 w-4" : "h-3.5 w-3.5"} />
				</button>

				{/* Divider + Submit */}
				<div className="flex shrink-0 items-center self-stretch pr-2">
					<div className="mr-2 h-5 w-px bg-white/[0.06]" />
					<button
						type="submit"
						disabled={loading || value.trim().length === 0}
						className={[
							"flex shrink-0 items-center gap-1.5 rounded-xl font-medium",
							"transition-all duration-300 disabled:opacity-30",
							// Liquid glass button styling
							"bg-gradient-to-br from-primary/20 via-primary/15 to-accent-liquid/10",
							"border border-primary/20",
							"hover:from-primary/30 hover:to-accent-liquid/15 hover:border-primary/30",
							"hover:shadow-[0_4px_16px_rgba(255,122,0,0.15)]",
							"active:scale-95",
							big ? "h-9 px-4 text-sm" : "h-8 px-3 text-xs",
						].join(" ")}
					>
						{loading ? (
							<span className="inline-flex items-center gap-1.5">
								<span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
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

				{/* Bottom loading bar */}
				{loading ? (
					<div className="pointer-events-none absolute inset-x-3 -bottom-px h-[2px] overflow-hidden rounded-full">
						<div className="h-full w-1/3 animate-[marstv-progress_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary via-accent-liquid to-primary" />
					</div>
				) : null}
			</form>

			{/* Shortcut hint */}
			<p className="mt-2 text-center text-[10px] text-dim-foreground/40 transition-opacity group-focus-within:opacity-0">
				<kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px]">
					⌘K
				</kbd>{" "}
				快速搜索
			</p>
		</div>
	);
}
