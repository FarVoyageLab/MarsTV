import { useState } from "react";

export function SettingsPage() {
  const [skipIntro, setSkipIntro] = useState(true);
  const [skipOutro, setSkipOutro] = useState(false);
  const [continuousPlay, setContinuousPlay] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [danmakuDefault, setDanmakuDefault] = useState(true);
  const [activeLang, setActiveLang] = useState("zh-CN");

  const langs = [
    { id: "zh-CN", label: "简体中文" },
    { id: "en", label: "English" },
    { id: "zh-TW", label: "繁體中文" },
    { id: "ja", label: "日本語" },
    { id: "ko", label: "한국어" },
  ];

  return (
    <div>
      <div className="setting-group">
        <h3>播放设置</h3>
        <div className="setting-row">
          <div>
            <div className="setting-label">默认画质</div>
            <div className="setting-desc">自动选择最佳可用画质</div>
          </div>
          <span className="tag-chip active">自动 (4K)</span>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">自动跳过片头</div>
            <div className="setting-desc">自动跳过每集的片头动画</div>
          </div>
          <button
            className={`tag-chip${skipIntro ? " active" : ""}`}
            onClick={() => setSkipIntro(!skipIntro)}
          >
            {skipIntro ? "ON" : "OFF"}
          </button>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">自动跳过片尾</div>
            <div className="setting-desc">自动跳过每集的片尾字幕</div>
          </div>
          <button
            className={`tag-chip${skipOutro ? " active" : ""}`}
            onClick={() => setSkipOutro(!skipOutro)}
          >
            {skipOutro ? "ON" : "OFF"}
          </button>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">连续播放</div>
            <div className="setting-desc">播完一集自动播放下一集</div>
          </div>
          <button
            className={`tag-chip${continuousPlay ? " active" : ""}`}
            onClick={() => setContinuousPlay(!continuousPlay)}
          >
            {continuousPlay ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div className="setting-group">
        <h3>字幕与语言</h3>
        <div className="setting-row">
          <div><div className="setting-label">默认字幕语言</div></div>
          <span className="tag-chip active">简体中文</span>
        </div>
        <div className="setting-row">
          <div><div className="setting-label">默认音轨语言</div></div>
          <span className="tag-chip">原声 (英语)</span>
        </div>
      </div>

      <div className="setting-group">
        <h3>界面语言</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {langs.map((lang) => (
            <button
              key={lang.id}
              className={`tag-chip${activeLang === lang.id ? " active" : ""}`}
              onClick={() => setActiveLang(lang.id)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-group">
        <h3>外观</h3>
        <div className="setting-row">
          <div>
            <div className="setting-label">深色模式</div>
            <div className="setting-desc">暗色界面，减少眼部疲劳</div>
          </div>
          <button
            className={`tag-chip${darkMode ? " active" : ""}`}
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div className="setting-group">
        <h3>弹幕</h3>
        <div className="setting-row">
          <div>
            <div className="setting-label">默认开启弹幕</div>
            <div className="setting-desc">播放时自动显示弹幕</div>
          </div>
          <button
            className={`tag-chip${danmakuDefault ? " active" : ""}`}
            onClick={() => setDanmakuDefault(!danmakuDefault)}
          >
            {danmakuDefault ? "ON" : "OFF"}
          </button>
        </div>
        <div className="setting-row">
          <div><div className="setting-label">弹幕透明度</div></div>
          <span className="tag-chip">70%</span>
        </div>
        <div className="setting-row">
          <div><div className="setting-label">弹幕速度</div></div>
          <span className="tag-chip">正常</span>
        </div>
      </div>

      <div className="setting-group">
        <h3>关于 MarsTV</h3>
        <div className="setting-row">
          <div><div className="setting-label">版本</div></div>
          <span style={{ fontSize: 13, color: "var(--cinema-muted)" }}>v1.0.0-beta</span>
        </div>
        <div className="setting-row">
          <div><div className="setting-label">GitHub</div></div>
          <a href="https://github.com/FarVoyageLab/MarsTV" style={{ fontSize: 13, color: "var(--accent)" }}>FarVoyageLab/MarsTV</a>
        </div>
      </div>
    </div>
  );
}
