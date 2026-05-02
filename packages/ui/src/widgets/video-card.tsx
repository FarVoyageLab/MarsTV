"use client";

import type { VideoItem } from "@marstv/core";
import type { LinkComponent } from "../lib/link-component";
import { DefaultLink } from "../lib/link-component";
import { cn } from "../lib/utils";
import { CardMarkers } from "./card-markers";

interface Props {
	item: VideoItem;
	sourceName?: string;
	hideSourceBadge?: boolean;
	LinkComponent?: LinkComponent;
	imageProxy?: string;
	getPlayUrl?: (source: string, id: string) => string;
}

export function VideoCard({
	item,
	sourceName,
	hideSourceBadge,
	LinkComponent = DefaultLink,
	imageProxy = "/api/image/cms",
	getPlayUrl = (s, i) =>
		`/play/${encodeURIComponent(s)}/${encodeURIComponent(i)}`,
}: Props) {
	const href = getPlayUrl(item.source, item.id);
	const proxiedPoster = item.poster
		? `${imageProxy}?u=${encodeURIComponent(item.poster)}`
		: null;

	return (
		<LinkComponent
			href={href}
			className={cn("glass-card group relative flex flex-col overflow-hidden")}
		>
			{/* Poster */}
			<div className="relative aspect-[2/3] w-full bg-black">
				{proxiedPoster ? (
					<img
						src={proxiedPoster}
						alt={item.title}
						className="h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.04] group-hover:brightness-110"
						loading="lazy"
						sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 45vw"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<span className="font-mono text-[10px] tracking-widest text-white/[0.08] uppercase">
							no poster
						</span>
					</div>
				)}

				{/* Badge */}
				{item.remarks ? (
					<span className="absolute right-2 top-2 z-10 rounded-sm bg-black/80 px-2 py-0.5 font-mono text-[10px] tracking-wide text-primary/90 backdrop-blur-sm">
						{item.remarks}
					</span>
				) : null}

				{/* Watched markers */}
				<CardMarkers source={item.source} id={item.id} />
			</div>

			{/* Info */}
			<div className="relative z-10 flex flex-1 flex-col gap-1 p-3">
				<p className="line-clamp-2 text-sm font-medium leading-snug tracking-wide text-foreground/90 transition-colors group-hover:text-primary/90">
					{item.title}
				</p>
				<div className="mt-auto flex items-center justify-between text-[11px] text-dim-foreground">
					<span className="truncate tracking-wider">
						{[item.year, item.area, item.category]
							.filter(Boolean)
							.join(" · ") || "—"}
					</span>
					{!hideSourceBadge ? (
						<span className="shrink-0 font-mono text-[9px] tracking-widest text-dim-foreground/40 uppercase">
							{sourceName ?? item.source}
						</span>
					) : null}
				</div>
			</div>
		</LinkComponent>
	);
}
