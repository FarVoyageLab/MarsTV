interface PlayerControlsProps {
  playing: boolean;
  currentTime?: string;
  duration?: string;
  progress?: number;
  danmakuOn?: boolean;
  onPlayPause: () => void;
  onDanmakuToggle?: () => void;
  sourceLabel?: string;
}

export function PlayerControls({
  playing,
  currentTime = "00:00",
  duration = "00:00",
  progress = 0,
  danmakuOn = true,
  onPlayPause,
  onDanmakuToggle,
  sourceLabel,
}: PlayerControlsProps) {
  return (
    <div>
      <div className="player-progress-bar" style={{ marginBottom: 8 }}>
        <div className="player-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--cinema-muted)", marginBottom: 16 }}>
        <span>{currentTime}</span>
        <span>{duration}</span>
      </div>
      <div className="player-controls">
        <button className="btn-cinema-icon" title="上一个">⏮</button>
        <button className="btn-cinema btn-cinema-primary" onClick={onPlayPause} style={{ padding: "8px 20px" }}>
          {playing ? "⏸ 暂停" : "▶ 播放"}
        </button>
        <button className="btn-cinema-icon" title="下一个">⏭</button>
        <span style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />
        <button className="btn-cinema-icon" title="音量">🔊</button>
        <span style={{ flex: 1 }} />
        {onDanmakuToggle && (
          <button className={`tag-chip${danmakuOn ? " active" : ""}`} onClick={onDanmakuToggle} style={{ fontSize: 12 }}>
            {danmakuOn ? "弹幕 ON" : "弹幕 OFF"}
          </button>
        )}
        <span className="tag-chip" style={{ fontSize: 12 }}>字幕</span>
        {sourceLabel && <span className="tag-chip" style={{ fontSize: 12 }}>{sourceLabel}</span>}
      </div>
    </div>
  );
}
