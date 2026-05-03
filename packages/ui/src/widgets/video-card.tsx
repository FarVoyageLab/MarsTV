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
    <LinkComponent href={href} className="glass-card group block">
      {/* Poster — grayscale by default, blooms on hover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0a0a10]">
        {proxiedPoster ? (
          <img
            src={proxiedPoster}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
            sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#0e0e16]">
            <span className="font-mono text-[10px] tracking-[0.15em] text-white/[0.06] uppercase">
              no poster
            </span>
          </div>
        )}

        {/* Badge */}
        {item.remarks ? (
          <span className="absolute left-2 top-2 z-10 rounded-sm bg-black/80 px-2 py-0.5 font-mono text-[10px] tracking-wide text-primary/90 backdrop-blur-sm">
            {item.remarks}
          </span>
        ) : null}

        <CardMarkers source={item.source} id={item.id} />
      </div>

      {/* Info footer */}
      <div className="p-3">
        <p className="line-clamp-2 text-[13px] font-medium leading-snug tracking-wide text-foreground/85 transition-colors group-hover:text-primary/90">
          {item.title}
        </p>
        <div className="mt-1.5 flex items-center justify-between text-[10px] tracking-wider text-dim-foreground/50">
          <span>
            {[item.year, item.area].filter(Boolean).join(" · ") || "—"}
          </span>
        </div>
      </div>
    </LinkComponent>
  );
}
