import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { createApiClient, getDetail } from "@marstv/api";
import type { VideoDetail } from "@marstv/core";
import { getApiOrigin, getRuntimeCmsDetailHandler } from "../lib/runtime";
import { useSources } from "../lib/sources";

const PLACEHOLDER_GRADIENT = "linear-gradient(135deg, oklch(20% 0.05 20), oklch(15% 0.08 10), oklch(12% 0.015 255))";

export function DetailPage() {
  const { source, id } = useParams();
  const navigate = useNavigate();
  const sources = useSources();
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source || !id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const srcObj = sources.find((s) => s.key === source);
    const handler = getRuntimeCmsDetailHandler();
    const fetchDetail = handler && srcObj
      ? handler(srcObj, id)
      : getDetail(createApiClient(getApiOrigin()), source, id);

    fetchDetail
      .then((d) => { if (!cancelled) { setDetail(d); setLoading(false); } })
      .catch((e: unknown) => { if (!cancelled) { setError(e instanceof Error ? e.message : "加载失败"); setLoading(false); } });

    return () => { cancelled = true; };
  }, [source, id, sources]);

  if (!source || !id) return <div className="empty-state">无效的源或视频ID</div>;

  if (loading) {
    return (
      <div>
        <div className="detail-hero" style={{ background: PLACEHOLDER_GRADIENT }}>
          <div className="detail-gradient" />
          <div className="detail-info">
            <div className="detail-poster" style={{ background: "var(--cinema-surface)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 32, width: "60%", background: "var(--cinema-surface)", borderRadius: 8, marginBottom: 16 }} />
              <div style={{ height: 14, width: "40%", background: "var(--cinema-surface)", borderRadius: 4 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="empty-state">
        <h2>加载失败</h2>
        <p>{error ?? "未找到影片信息"}</p>
        <button className="btn-cinema btn-cinema-primary" onClick={() => navigate(-1)}>返回</button>
      </div>
    );
  }

  const currentSource = sources.find((s) => s.key === source);
  const sourceName = currentSource?.name ?? source;
  const playUrl = `/play/${encodeURIComponent(source)}/${encodeURIComponent(id)}`;

  return (
    <div>
      <div className="detail-hero">
        <div className="detail-bg" style={{ background: PLACEHOLDER_GRADIENT }} />
        <div className="detail-gradient" />
        <div className="detail-info">
          <div className="detail-poster" style={{ background: PLACEHOLDER_GRADIENT }}>
            {(detail.title ?? "?").charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
              {detail.title ?? "未知影片"}
            </h1>
            <div className="detail-meta-row" style={{ marginTop: 8 }}>
              {detail.year && <><span>{detail.year}</span><span className="dot-sep" /></>}
              {detail.area && <><span>{detail.area}</span><span className="dot-sep" /></>}
              {detail.category && <span>{detail.category}</span>}
              {detail.rating && <><span className="dot-sep" /><span style={{ color: "var(--accent)" }}>★ {detail.rating}</span></>}
            </div>
            {detail.desc && <p className="detail-desc" style={{ marginTop: 16 }}>{detail.desc}</p>}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <div className="setting-group"><h3>选择播放源</h3></div>
        <div className="source-list">
          <button className="source-btn" onClick={() => navigate(playUrl)}>
            <span className="source-dot" style={{ background: "oklch(62% 0.2 25)" }} />
            {sourceName}
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <button className="btn-cinema btn-cinema-secondary" onClick={() => navigate("/")}>返回首页</button>
      </div>
    </div>
  );
}
