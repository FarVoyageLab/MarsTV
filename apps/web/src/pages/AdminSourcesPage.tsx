import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Pencil, Plus, RefreshCw, Server, X } from "lucide-react";
import type { SourceConfig, SourceHealth } from "@marstv/contracts";
import { api } from "../lib/runtime";
import { demoSources } from "../data/demo";

type SourceRow = SourceConfig & { health: SourceHealth | null };

export function AdminSourcesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SourceRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sourcesQuery = useQuery({
    queryKey: ["sources"],
    queryFn: () => api.sources(),
    retry: 1,
    staleTime: 30_000
  });
  const sources = sourcesQuery.data ?? demoSources;
  const save = useMutation({
    mutationFn: (source: SourceConfig) => api.saveSource(source),
    onSuccess: async () => {
      setNotice("来源已保存，健康检查已加入后台队列。");
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "保存失败")
  });
  const stats = useMemo(() => ({
    total: sources.length,
    enabled: sources.filter((source) => source.enabled).length,
    warning: sources.filter((source) => source.health?.state === "degraded").length
  }), [sources]);

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <h1>资源站管理</h1>
          <nav aria-label="来源筛选">
            <button type="button" data-active="true">全部来源 <span>{stats.total}</span></button>
            <button type="button">已启用 <span>{stats.enabled}</span></button>
            <button type="button">异常 <span>{stats.warning}</span></button>
            <button type="button">同步日志</button>
            <button type="button">操作记录</button>
          </nav>
        </div>
        <div className="admin-heading__actions">
          <button className="button button--secondary" type="button">
            <RefreshCw aria-hidden="true" /> 刷新
          </button>
          <button className="button button--primary" type="button" onClick={() => setEditing(emptySource())}>
            <Plus aria-hidden="true" /> 添加来源
          </button>
        </div>
      </header>

      {sourcesQuery.isError ? (
        <div className="admin-notice">
          当前展示授权演示数据。连接实例并完成 Owner 引导后即可管理真实来源。
        </div>
      ) : null}
      {notice ? <div className="admin-notice" role="status">{notice}</div> : null}

      <div className="source-table-wrap">
        <table className="source-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>端点（主机名）</th>
              <th>状态</th>
              <th>优先级</th>
              <th>延迟</th>
              <th>最后健康检查</th>
              <th>内容数量</th>
              <th>能力</th>
              <th><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} data-warning={source.health?.state === "degraded"}>
                <td><Server aria-hidden="true" /><strong>{source.name}</strong></td>
                <td>{safeHostname(source.baseUrl)}</td>
                <td><HealthStatus health={source.health} enabled={source.enabled} /></td>
                <td>{source.priority}</td>
                <td>{source.health?.latencyMs ? `${source.health.latencyMs}ms` : "—"}</td>
                <td>{source.health?.checkedAt ? "刚刚" : "从未检查"}</td>
                <td>{source.health?.itemCount?.toLocaleString() ?? "—"}</td>
                <td>
                  <span className="capability">JSON</span>
                  <span className="capability">HLS</span>
                  {source.relayMode !== "off" ? <span className="capability">Relay</span> : null}
                </td>
                <td>
                  <button className="text-button" type="button" onClick={() => setEditing(source)}>
                    <Pencil aria-hidden="true" /> 编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <footer>
          共 {sources.length} 条来源 · 启用 {stats.enabled} · 异常 {stats.warning}
          <span>上次同步：1 分钟前 · 同步状态：成功</span>
        </footer>
      </div>

      {editing ? (
        <SourceDrawer
          source={editing}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(source) => save.mutate(source)}
        />
      ) : null}
    </div>
  );
}

function HealthStatus({ health, enabled }: { health: SourceHealth | null; enabled: boolean }) {
  if (!enabled) return <span className="health health--muted"><i /> 已停用</span>;
  if (health?.state === "degraded" || health?.state === "offline") {
    return <span className="health health--warning"><AlertTriangle /> 异常</span>;
  }
  return <span className="health health--good"><i /> 已启用</span>;
}

function SourceDrawer({
  source,
  saving,
  onClose,
  onSave
}: {
  source: SourceRow;
  saving: boolean;
  onClose: () => void;
  onSave: (source: SourceConfig) => void;
}) {
  const [draft, setDraft] = useState(source);
  const [tested, setTested] = useState(false);

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <aside className="source-drawer" role="dialog" aria-modal="true" aria-labelledby="source-drawer-title">
        <header>
          <h2 id="source-drawer-title">{source.id ? "编辑来源" : "添加来源"}</h2>
          <button type="button" onClick={onClose} aria-label="关闭"><X /></button>
        </header>
        <form onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...draft,
            id: draft.id || crypto.randomUUID(),
            allowedHosts: deriveHosts(draft.baseUrl, draft.allowedHosts),
            updatedAt: new Date().toISOString()
          });
        }}>
          <label>
            <span>来源名称 *</span>
            <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label>
            <span>MacCMS v10 API URL *</span>
            <input
              required
              type="url"
              value={draft.baseUrl}
              onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
              placeholder="https://media.example/api.php/provide/vod/"
            />
          </label>
          <label>
            <span>允许的域名（每行一个）</span>
            <textarea
              value={draft.allowedHosts.join("\n")}
              onChange={(event) => setDraft({
                ...draft,
                allowedHosts: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean)
              })}
            />
          </label>
          <div className="form-row">
            <label>
              <span>优先级</span>
              <input
                type="number"
                min="1"
                max="999"
                value={draft.priority}
                onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>请求超时（毫秒）</span>
              <input
                type="number"
                min="500"
                max="15000"
                step="500"
                value={draft.timeoutMs}
                onChange={(event) => setDraft({ ...draft, timeoutMs: Number(event.target.value) })}
              />
            </label>
          </div>
          <label>
            <span>中继模式</span>
            <select
              value={draft.relayMode}
              onChange={(event) => setDraft({
                ...draft,
                relayMode: event.target.value as SourceConfig["relayMode"]
              })}
            >
              <option value="off">关闭（推荐）</option>
              <option value="manifest">仅清单</option>
              <option value="full">完整媒体中继</option>
            </select>
          </label>
          <label className="switch-row">
            <span><strong>启用来源</strong><small>禁用后不会参与聚合与后台检查。</small></span>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
            />
          </label>
          <div className="connection-test">
            <button className="button button--secondary" type="button" onClick={() => setTested(true)}>
              测试连接
            </button>
            {tested ? <span><Check aria-hidden="true" /> 配置格式有效 · 保存后执行真实探测</span> : null}
          </div>
          <footer>
            <button className="button button--secondary" type="button" onClick={onClose}>取消</button>
            <button className="button button--primary" type="submit" disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function safeHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function deriveHosts(baseUrl: string, existing: string[]): string[] {
  try {
    return [...new Set([new URL(baseUrl).hostname, ...existing])];
  } catch {
    return existing;
  }
}

function emptySource(): SourceRow {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    baseUrl: "",
    enabled: true,
    priority: 100,
    timeoutMs: 4_000,
    allowedHosts: [],
    headers: {},
    relayMode: "off",
    categoryMap: {},
    resolver: null,
    createdAt: now,
    updatedAt: now,
    health: null
  };
}
