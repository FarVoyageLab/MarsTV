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
			<form onSubmit={submit} className="group relative">
				{/* Focus burst ring */}
				<div
					className={[
						"pointer-events-none absolute -inset-2 rounded-2xl transition-all duration-700",
						focused ? "opacity-100 ring-1 ring-primary/15" : "opacity-0",
					].join(" ")}
				/>

				{/* Main input container */}
				<div
					className={[
						"relative flex items-center overflow-hidden transition-all duration-500",
						"border bg-black/50 backdrop-blur-sm",
						big ? "h-16 rounded-2xl" : "h-12 rounded-xl",
						focused
							? "border-primary/25 shadow-[0_0_48px_rgba(255,106,0,0.06),0_0_0_1px_rgba(255,106,0,0.12)] bg-black/70"
							: "border-white/[0.05] hover:border-white/[0.08]",
					].join(" ")}
				>
					{/* Inner corona glow */}
					<div
						className={[
							"pointer-events-none absolute inset-0 transition-opacity duration-1000",
							focused ? "opacity-100" : "opacity-0",
						].join(" ")}
						style={{
							background:
								"radial-gradient(ellipse 120% 90% at 50% 50%, rgba(255,106,0,0.05) 0%, transparent 70%)",
						}}
					/>

					{/* Scan line on loading */}
					{loading ? (
						<div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px animate-[scan-line_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary to-transparent" />
					) : null}

					{/* Search icon */}
					<div
						className={[
							"pointer-events-none absolute left-0 z-10 flex items-center justify-center transition-all duration-500",
							big ? "h-16 w-14" : "h-12 w-11",
							focused ? "text-primary" : "text-dim-foreground/70",
						].join(" ")}
					>
						<MagnifyingGlass
							weight={focused ? "fill" : "regular"}
							className={[
								"transition-all duration-500",
								big ? "h-5 w-5" : "h-4 w-4",
								focused ? "scale-110" : "",
							].join(" ")}
						/>
					</div>

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
						placeholder="搜索..."
						autoFocus={autoFocus}
						autoComplete="off"
						spellCheck={false}
						className={[
							"relative z-10 h-full flex-1 bg-transparent font-medium tracking-wide text-foreground outline-none",
							"placeholder:font-normal placeholder:tracking-normal placeholder:text-dim-foreground/35",
							big ? "text-lg" : "text-sm",
						].join(" ")}
						style={{
							paddingLeft: big ? "3.5rem" : "2.75rem",
							paddingRight: "4.5rem",
							fontFamily: "'Space Grotesk', system-ui, sans-serif",
						}}
					/>

					{/* Right actions */}
					<div className="absolute right-1.5 z-10 flex items-center gap-1">
						{value.length > 0 ? (
							<button
								type="button"
								onClick={() => {
									setValue("");
									inputRef.current?.focus();
								}}
								className="flex h-8 w-8 items-center justify-center rounded-lg text-dim-foreground/50 transition-colors hover:text-foreground"
								aria-label="清除"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						) : null}
						<button
							type="submit"
							disabled={loading || value.trim().length === 0}
							className={[
								"flex items-center gap-1.5 rounded-xl font-medium tracking-wide transition-all disabled:opacity-25",
								"bg-primary/8 text-primary/80 border border-primary/15",
								"hover:bg-primary/15 hover:text-primary hover:border-primary/30 hover:shadow-[0_0_20px_rgba(255,106,0,0.10)]",
								"active:scale-95",
								big ? "h-10 px-4 text-sm" : "h-9 px-3 text-xs",
							].join(" ")}
						>
							{loading ? (
								<span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-primary/30 border-t-primary" />
							) : (
								<>
									<MagnifyingGlass className="h-3 w-3" />
									<span className="hidden sm:inline">搜索</span>
								</>
							)}
						</button>
					</div>
				</div>
			</form>

			{/* Shortcut hint */}
			<p
				className={[
					"mt-2.5 text-center font-mono text-[10px] tracking-widest uppercase transition-all duration-300",
					focused ? "opacity-0 translate-y-1" : "opacity-30",
				].join(" ")}
			>
				<kbd className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px]">
					⌘K
				</kbd>
				<span className="ml-1.5 text-dim-foreground">聚焦搜索</span>
			</p>
		</div>
	);
}
