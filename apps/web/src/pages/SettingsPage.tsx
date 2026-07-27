import { useState } from "react";
import { Bell, Captions, CloudCog, Eye, Languages, MonitorPlay } from "lucide-react";

export function SettingsPage() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sync, setSync] = useState(true);

  return (
    <div className="standard-page settings-page">
      <header className="page-heading"><div><h1>设置</h1><p>播放、无障碍、同步和隐私偏好。</p></div></header>
      <section className="settings-list">
        <SettingRow icon={MonitorPlay} title="默认播放质量" description="优先自动选择，限制蜂窝网络带宽">
          <select><option>自动</option><option>1080p</option><option>720p</option></select>
        </SettingRow>
        <SettingRow icon={Captions} title="字幕" description="默认启用简体中文字幕">
          <select><option>简体中文</option><option>跟随来源</option><option>关闭</option></select>
        </SettingRow>
        <SettingRow icon={Languages} title="界面语言" description="语言更改会同步到个人档案">
          <select><option>简体中文</option><option>English</option></select>
        </SettingRow>
        <SettingRow icon={Eye} title="减少动态效果" description="关闭大型过渡与自动播放预览">
          <input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} />
        </SettingRow>
        <SettingRow icon={CloudCog} title="端到端加密同步" description="收藏、历史、进度和本地源配置">
          <input type="checkbox" checked={sync} onChange={(event) => setSync(event.target.checked)} />
        </SettingRow>
        <SettingRow icon={Bell} title="后台任务通知" description="只报告同步冲突、来源持续故障和安全事件">
          <input type="checkbox" defaultChecked />
        </SettingRow>
      </section>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: typeof MonitorPlay;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <Icon aria-hidden="true" />
      <span><strong>{title}</strong><small>{description}</small></span>
      {children}
    </label>
  );
}
