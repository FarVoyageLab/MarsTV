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
			<form onSubmit={submit} className="flex w-full items-center gap-2.5">
				<input
					ref={inputRef}
					type="search"
					inputMode="search"
					name="q"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") submit();
					}}
					placeholder="搜索电影、电视剧、动漫…"
					autoFocus={autoFocus}
					autoComplete="off"
					spellCheck={false}
					className={[
						"flex-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 font-medium tracking-wide",
						"text-foreground placeholder:text-dim-foreground/35 outline-none",
						"transition-all duration-300",
						"hover:border-white/[0.10]",
						"focus:border-primary/30 focus:bg-white/[0.05] focus:shadow-[0_0_32px_rgba(255,106,0,0.06)]",
						big ? "h-14 text-base" : "h-11 text-sm",
					].join(" ")}
				/>

				<button
					type="submit"
					disabled={loading || value.trim().length === 0}
					className={[
						"shrink-0 font-medium tracking-wide transition-all disabled:opacity-20",
						"bg-primary text-white",
						"hover:bg-primary-intense hover:shadow-[0_0_24px_rgba(255,106,0,0.2)]",
						"active:scale-[0.97]",
						big
							? "h-14 rounded-2xl px-8 text-base"
							: "h-11 rounded-xl px-5 text-sm",
					].join(" ")}
				>
					{loading ? (
						<span className="flex h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
					) : (
						"搜索"
					)}
				</button>
			</form>

			{/* Shortcut — only on hero size */}
			{big ? (
				<p className="mt-2.5 text-center font-mono text-[10px] tracking-[0.15em] text-dim-foreground/25 uppercase">
					<kbd className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px]">
						⌘K
					</kbd>
					<span className="ml-1.5">聚焦搜索</span>
				</p>
			) : null}
		</div>
	);
}
