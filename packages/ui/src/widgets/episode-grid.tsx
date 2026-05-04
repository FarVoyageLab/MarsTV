"use client";

// Per-episode "已看" bullet on the episode grid. Reads localStorage
// `marstv:progress:<source>:<id>:<line>:<ep>` (written by PlayerEmbed) for
// every episode; anything with a non-zero value is considered watched.

import { useEffect, useState } from "react";
import type { LinkComponent } from "../lib/link-component";
import { DefaultLink } from "../lib/link-component";
import { cn } from "../lib/utils";

interface Episode {
	title: string;
	url: string;
}

interface Props {
	source: string;
	id: string;
	lineIdx: number;
	currentEpIdx: number;
	episodes: Episode[];
	/** Link component for episode navigation. Defaults to plain <a>. */
	LinkComponent?: LinkComponent;
	/** Callback to build the episode URL. */
	getEpisodeUrl?: (
		source: string,
		id: string,
		lineIdx: number,
		epIdx: number,
	) => string;
}

const PROGRESS_PREFIX = "marstv:progress:";

function readAllProgress(
	source: string,
	id: string,
	lineIdx: number,
	count: number,
): Set<number> {
	const watched = new Set<number>();
	try {
		const prefix = `${PROGRESS_PREFIX}${source}:${id}:${lineIdx}:`;
		for (let i = 0; i < count; i++) {
			const raw = localStorage.getItem(prefix + i);
			if (!raw) continue;
			const n = Number.parseFloat(raw);
			if (Number.isFinite(n) && n > 0) watched.add(i);
		}
	} catch {
		// ignore
	}
	return watched;
}

function defaultGetEpisodeUrl(
	source: string,
	id: string,
	lineIdx: number,
	epIdx: number,
): string {
	return `/play/${encodeURIComponent(source)}/${encodeURIComponent(id)}?line=${lineIdx}&ep=${epIdx}`;
}

export function EpisodeGrid({
	source,
	id,
	lineIdx,
	currentEpIdx,
	episodes,
	LinkComponent = DefaultLink,
	getEpisodeUrl = defaultGetEpisodeUrl,
}: Props) {
	const [watched, setWatched] = useState<Set<number>>(() => new Set());

	useEffect(() => {
		setWatched(readAllProgress(source, id, lineIdx, episodes.length));

		// Pick up cross-tab updates. Own-tab writes from PlayerEmbed don't fire
		// 'storage' events, but the user is unlikely to be scrubbing through the
		// episode grid while simultaneously playing.
		const onStorage = (e: StorageEvent) => {
			if (e.key?.startsWith(`${PROGRESS_PREFIX}${source}:${id}:${lineIdx}:`)) {
				setWatched(readAllProgress(source, id, lineIdx, episodes.length));
			}
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, [source, id, lineIdx, episodes.length]);

	return (
		<div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
			{episodes.map((ep, i) => {
				const isActive = i === currentEpIdx;
				const isWatched = !isActive && watched.has(i);
				return (
					<LinkComponent
						key={`${ep.title}:${i}`}
						href={getEpisodeUrl(source, id, lineIdx, i)}
						scroll={false}
						className={cn(
							"relative truncate rounded border px-1.5 py-1 text-center text-[11px] leading-tight transition-colors",
							isActive
								? "border-primary bg-primary/15 text-primary"
								: isWatched
									? "border-primary/40 bg-primary/10 text-primary/80 hover:border-primary hover:text-primary"
									: "border-border/60 bg-surface/60 text-muted-foreground hover:border-border-strong hover:text-foreground",
						)}
						title={isWatched ? `${ep.title} · 已看` : ep.title}
					>
						{ep.title}
						{isWatched ? (
							<svg
								aria-hidden="true"
								viewBox="0 0 12 12"
								className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-primary"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M2 6.5l2.5 2.5L10 3.5" />
							</svg>
						) : null}
					</LinkComponent>
				);
			})}
		</div>
	);
}
