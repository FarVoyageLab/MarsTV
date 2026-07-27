import { ArrowRight, Play, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Poster } from "../components/Poster";
import { demoMedia } from "../data/demo";

export function HomePage() {
  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="featured-title">
        <img src="/art/hero-eclipse.png" alt="" fetchPriority="high" />
        <div className="hero__content">
          <h1 id="featured-title">遗落之环</h1>
          <div className="hero__meta">
            <span>2026</span><span>科幻 / 悬疑</span><span>2 小时 12 分</span><strong>8.6</strong>
          </div>
          <p>在遥远的未来，一座沉睡于荒原的环形遗迹重新启动。一个家庭必须在时间耗尽前，理解它与失落文明之间的联系。</p>
          <div className="hero__actions">
            <Link
              to="/player/$sourceId/$itemId/$episodeId"
              params={{ sourceId: "demo", itemId: "1", episodeId: "demo:1:main:0" }}
              className="button button--primary"
            >
              <Play aria-hidden="true" fill="currentColor" /> 播放
            </Link>
            <button className="button button--secondary" type="button">
              <Plus aria-hidden="true" /> 我的收藏
            </button>
          </div>
        </div>
        <div className="hero__pager" aria-label="精选内容位置">
          <span data-active="true" /><span /><span /><span />
        </div>
      </section>

      <MediaRail title="继续观看" items={demoMedia.slice(0, 5)} />
      <MediaRail title="最近添加" items={demoMedia.slice(3)} poster />
      <MediaRail title="家庭精选" items={[...demoMedia.slice(5), ...demoMedia.slice(0, 3)]} poster />
    </div>
  );
}

function MediaRail({
  title,
  items,
  poster = false
}: {
  title: string;
  items: typeof demoMedia;
  poster?: boolean;
}) {
  return (
    <section className="media-rail" aria-labelledby={`rail-${title}`}>
      <header>
        <h2 id={`rail-${title}`}>{title}</h2>
        <Link to="/library">查看全部 <ArrowRight aria-hidden="true" /></Link>
      </header>
      <div className={`media-rail__track${poster ? " media-rail__track--poster" : ""}`}>
        {items.map((media) => (
          <Poster key={media.id} media={media} variant={poster ? "poster" : "landscape"} />
        ))}
      </div>
    </section>
  );
}
