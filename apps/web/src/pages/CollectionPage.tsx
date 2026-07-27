import { useMemo, useState } from "react";
import { Clock3, Heart, Library } from "lucide-react";
import { Poster } from "../components/Poster";
import { demoMedia } from "../data/demo";
import { StateView } from "../components/StateView";

export function CollectionPage({ kind }: { kind: "library" | "favorites" | "history" }) {
  const [sort, setSort] = useState("recent");
  const items = useMemo(() => {
    const base = kind === "favorites" ? demoMedia.slice(1, 7) : kind === "history" ? demoMedia.slice(0, 5) : demoMedia;
    return sort === "score" ? base.toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0)) : base;
  }, [kind, sort]);
  const Icon = kind === "library" ? Library : kind === "favorites" ? Heart : Clock3;
  const title = kind === "library" ? "影视库" : kind === "favorites" ? "我的收藏" : "继续观看";

  return (
    <div className="standard-page">
      <header className="page-heading">
        <div>
          <Icon aria-hidden="true" />
          <h1>{title}</h1>
          <p>{kind === "library" ? "浏览家庭共享源的可用内容。" : kind === "favorites" ? "收藏会加密同步到已配对设备。" : "从上次停止的位置继续播放。"}</p>
        </div>
        <label className="compact-select">
          <span>排序</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="recent">最近更新</option>
            <option value="score">评分最高</option>
          </select>
        </label>
      </header>
      {items.length ? (
        <div className="poster-grid">{items.map((media) => <Poster key={media.id} media={media} />)}</div>
      ) : (
        <StateView kind="empty" title="这里还是空的" description="开始播放或收藏内容后，它会出现在这里。" />
      )}
    </div>
  );
}
