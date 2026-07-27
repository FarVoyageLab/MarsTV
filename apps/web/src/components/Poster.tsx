import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import type { DemoMedia } from "../data/demo";

interface PosterProps {
  media: DemoMedia;
  variant?: "poster" | "landscape";
  focused?: boolean;
}

export function artworkStyle(media: Pick<DemoMedia, "artwork">): CSSProperties {
  return {
    backgroundImage: "url('/art/poster-sheet.png')",
    backgroundSize: "400% 200%",
    backgroundPosition: `${media.artwork.column * 33.333}% ${media.artwork.row * 100}%`
  };
}

export function Poster({ media, variant = "poster", focused = false }: PosterProps) {
  return (
    <Link
      to="/detail/$sourceId/$itemId"
      params={{ sourceId: media.sourceId, itemId: media.sourceItemId }}
      className={`poster poster--${variant}${focused ? " poster--focused" : ""}`}
      aria-label={`${media.title}，${media.year}，评分 ${media.score}`}
    >
      <div className="poster__art" style={artworkStyle(media)}>
        {media.progress !== undefined ? (
          <span className="poster__progress" aria-label={`已观看 ${media.progress}%`}>
            <span style={{ width: `${media.progress}%` }} />
          </span>
        ) : null}
      </div>
      <strong>{media.title}</strong>
      <span>{media.remarks} · {media.score}</span>
    </Link>
  );
}
