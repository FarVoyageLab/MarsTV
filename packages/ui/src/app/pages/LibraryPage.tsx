import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { localStorageBackend } from "@marstv/core";
import type { PlayRecord, FavoriteRecord } from "@marstv/core";
import { invalidateCardMarkers } from "../../widgets/card-markers";

type TabKey = "history" | "favorites" | "playlists";


function HistoryTab() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PlayRecord[] | null>(null);

  useEffect(() => {
    localStorageBackend.listPlayRecords().then(setRecords);
  }, []);

  const handleRemove = useCallback(async (source: string, id: string) => {
    await localStorageBackend.removePlayRecord(source, id);
    invalidateCardMarkers();
    setRecords((prev) => (prev ?? []).filter((r) => r.source !== source || r.id !== id));
  }, []);

  if (records === null) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--cinema-muted)" }}>加载中…</div>;
  }

  if (records.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: 48 }}>🕐</div>
        <p style={{ fontWeight: 600 }}>暂无观看历史</p>
        <p style={{ fontSize: 13 }}>开始观看影片，这里会记录你的进度</p>
      </div>
    );
  }

  return (
    <div>
      {records.map((item) => {
        const pct = item.durationSec ? Math.round((item.positionSec / item.durationSec) * 100) : 0;
        const playUrl = `/play/${encodeURIComponent(item.source)}/${encodeURIComponent(item.id)}?line=${item.lineIdx}&ep=${item.epIdx}`;
        return (
          <div key={`${item.source}:${item.id}`} className="history-item">
            <div className="history-poster">{(item.title ?? "?").charAt(0)}</div>
            <div className="history-info">
              <div className="history-title">{item.title ?? "未知"}</div>
              <div className="history-meta">
                {item.lineName ? `${item.lineName} · ` : ""}
                {item.epIdx >= 0 ? `第${item.epIdx + 1}集` : ""}
              </div>
              {pct > 0 && (
                <div className="history-progress">
                  <div className="history-progress-bar" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
            <button className="btn-cinema-icon" onClick={() => navigate(playUrl)} style={{ opacity: 0.5 }}>▶</button>
            <button className="btn-cinema-icon" onClick={() => handleRemove(item.source, item.id)} style={{ opacity: 0.3, fontSize: 12 }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function FavoritesTab() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<FavoriteRecord[] | null>(null);

  useEffect(() => {
    localStorageBackend.listFavorites().then(setRecords);
  }, []);

  const handleRemove = useCallback(async (source: string, id: string) => {
    await localStorageBackend.removeFavorite(source, id);
    invalidateCardMarkers();
    setRecords((prev) => (prev ?? []).filter((r) => r.source !== source || r.id !== id));
  }, []);

  if (records === null) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--cinema-muted)" }}>加载中…</div>;
  }

  if (records.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: 48 }}>❤️</div>
        <p style={{ fontWeight: 600 }}>还没有收藏</p>
        <p style={{ fontSize: 13 }}>浏览影片时点击收藏按钮</p>
      </div>
    );
  }

  return (
    <div className="poster-grid">
      {records.map((item) => {
        const detailUrl = `/detail/${encodeURIComponent(item.source)}/${encodeURIComponent(item.id)}`;
        return (
          <div key={`${item.source}:${item.id}`} className="glass-card" onClick={() => navigate(detailUrl)} style={{ cursor: "pointer" }}>
            <div style={{ aspectRatio: "2/3", background: "var(--cinema-surface)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>
              {(item.title ?? "?").charAt(0)}
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{item.title ?? "未知"}</div>
              <div style={{ fontSize: 11, color: "var(--cinema-muted)", marginTop: 4 }}>
                收藏于 {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("zh-CN") : ""}
              </div>
            </div>
            <button className="btn-cinema-icon" style={{ position: "absolute", top: 4, right: 4, opacity: 0, fontSize: 10 }} onClick={(e) => { e.stopPropagation(); handleRemove(item.source, item.id); }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function PlaylistsTab() {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 48 }}>📋</div>
      <p style={{ fontWeight: 600 }}>还没有片单</p>
      <p style={{ fontSize: 13 }}>创建你的第一个片单，整理想看的影片</p>
      <button className="btn-cinema btn-cinema-primary">+ 新建片单</button>
    </div>
  );
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "history", label: "观看历史" },
  { key: "favorites", label: "我的收藏" },
  { key: "playlists", label: "片单" },
];

export function LibraryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("history");

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tag-chip${activeTab === tab.key ? " active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "history" && <HistoryTab />}
      {activeTab === "favorites" && <FavoritesTab />}
      {activeTab === "playlists" && <PlaylistsTab />}
    </div>
  );
}
