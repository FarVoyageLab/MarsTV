import { useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Check, Play, Server, Star } from "lucide-react";
import { artworkStyle } from "../components/Poster";
import { demoDetail, demoMedia } from "../data/demo";
import { api } from "../lib/runtime";

export function DetailPage() {
  const { sourceId, itemId } = useParams({ from: "/detail/$sourceId/$itemId" });
  const media = demoMedia.find((item) => item.sourceId === sourceId && item.sourceItemId === itemId)
    ?? demoMedia[0]!;
  const remote = useQuery({
    queryKey: ["detail", sourceId, itemId],
    queryFn: () => api.detail(sourceId, itemId),
    enabled: sourceId !== "demo",
    retry: 1,
    staleTime: 5 * 60_000
  });
  const [line, setLine] = useState("main");
  const [saved, setSaved] = useState(false);
  const detail = remote.data ?? { ...demoDetail, ...media };
  const lines = [...new Map(detail.episodes.map((episode) => [
    episode.lineId,
    { id: episode.lineId, label: episode.lineLabel }
  ])).values()];
  const episodes = detail.episodes.filter((episode) => episode.lineId === line);

  useEffect(() => {
    if (lines.length > 0 && !lines.some((entry) => entry.id === line)) {
      setLine(lines[0]!.id);
    }
  }, [line, lines]);

  return (
    <div className="detail-page">
      <section className="detail-hero">
        <div className="detail-hero__art" style={artworkStyle(media)} />
        <div className="detail-hero__body">
          <span className="provenance"><Server aria-hidden="true" /> {sourceId === "demo" ? "原创演示源" : "家庭共享源 · MacCMS"}</span>
          <h1>{detail.title}</h1>
          <p className="detail-hero__subtitle">{detail.subtitle}</p>
          <div className="detail-hero__meta">
            <strong><Star aria-hidden="true" fill="currentColor" /> {detail.score}</strong>
            <span>{detail.year}</span><span>{detail.category}</span><span>共 {detail.episodes.length} 集</span><span>5.1</span>
          </div>
          <p className="detail-hero__description">{detail.description}</p>
          <dl className="metadata-list">
            <div><dt>导演</dt><dd>{detail.director.join("、")}</dd></div>
            <div><dt>主演</dt><dd>{detail.actors.join("、")}</dd></div>
            <div><dt>地区</dt><dd>{detail.area.join("、")}</dd></div>
          </dl>
          <div className="hero__actions">
            <Link
              to="/player/$sourceId/$itemId/$episodeId"
              params={{ sourceId, itemId, episodeId: detail.episodes[0]?.id ?? "unavailable" }}
              className="button button--primary"
            >
              <Play aria-hidden="true" fill="currentColor" /> 播放第 01 集
            </Link>
            <button className="button button--secondary" type="button" onClick={() => setSaved((value) => !value)}>
              {saved ? <Check aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
              {saved ? "已收藏" : "收藏"}
            </button>
          </div>
        </div>
      </section>

      <section className="episode-section">
        <header>
          <div>
            <h2>选集</h2>
            <p>线路与剧集来自原始资源站，不跨来源自动合并。</p>
          </div>
          <label>
            <span>播放来源</span>
            <select value={line} onChange={(event) => setLine(event.target.value)}>
              {lines.map((entry, index) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}{index === 0 ? "（推荐）" : ""}
                </option>
              ))}
            </select>
          </label>
        </header>
        <div className="episode-grid">
          {episodes.map((episode, index) => (
            <Link
              key={episode.id}
              to="/player/$sourceId/$itemId/$episodeId"
              params={{ sourceId, itemId, episodeId: episode.id }}
              data-current={index === 3}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{episode.label}</strong>
              {index === 3 ? <small>继续 28:17</small> : null}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
