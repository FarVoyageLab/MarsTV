import { useState } from "react";
import { Activity, ArchiveRestore, CheckCircle2, CircleAlert, Cloud, Database, KeyRound, Link2, ListChecks } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/runtime";

export function SystemPage() {
  const [pairingCode, setPairingCode] = useState("");
  const [deviceName, setDeviceName] = useState("客厅设备");
  const health = useQuery({ queryKey: ["health"], queryFn: () => api.health(), retry: 1 });
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => api.audit(), retry: 1 });
  const backup = useMutation({ mutationFn: () => api.createBackup() });
  const pairing = useMutation({
    mutationFn: () => api.claimPairing(pairingCode, deviceName, "native"),
    onSuccess: () => {
      setPairingCode("");
      void audit.refetch();
    }
  });
  const snapshot = health.data as {
    status?: string;
    runtime?: string;
    bindings?: { d1?: boolean; queue?: boolean; r2?: boolean; sqlite?: boolean; objectStorage?: string };
  } | undefined;
  const connected = health.isSuccess;
  const healthy = connected && snapshot?.status === "healthy";
  const services = [
    {
      name: snapshot?.runtime === "node" ? "Node API" : "Edge API",
      detail: connected ? (snapshot?.runtime === "node" ? "自托管运行时已响应" : "Cloudflare Workers 已响应") : "等待实例响应",
      icon: Cloud,
      ready: connected
    },
    {
      name: "权威数据库",
      detail: snapshot?.bindings?.d1 ? "D1 · 权威状态可用" : snapshot?.bindings?.sqlite ? "SQLite WAL · 权威状态可用" : "尚未验证",
      icon: Database,
      ready: Boolean(snapshot?.bindings?.d1 || snapshot?.bindings?.sqlite)
    },
    {
      name: "后台任务",
      detail: snapshot?.bindings?.queue ? "Queues 绑定可用" : connected ? "当前运行时未声明队列绑定" : "尚未验证",
      icon: ListChecks,
      ready: Boolean(snapshot?.bindings?.queue)
    },
    {
      name: "备份存储",
      detail: snapshot?.bindings?.r2 ? "R2 绑定可用" : snapshot?.bindings?.objectStorage === "filesystem" ? "加密文件存储可用" : "尚未验证",
      icon: ArchiveRestore,
      ready: Boolean(snapshot?.bindings?.r2 || snapshot?.bindings?.objectStorage)
    }
  ];

  return (
    <div className="standard-page">
      <header className="page-heading"><div><h1>系统状态</h1><p>不含播放 URL、搜索词或观看历史明文的运行状态。</p></div></header>
      <section className="system-overview">
        <div className="system-score"><Activity /><strong>{healthy ? "健康" : "需检查"}</strong><span>{healthy ? "所有核心服务可用" : "无法读取实例健康状态"}</span></div>
        <div className="service-list">
          {services.map(({ name, detail, icon: Icon, ready }) => (
            <article key={name} data-ready={ready}><Icon /><div><strong>{name}</strong><span>{detail}</span></div>{ready ? <CheckCircle2 /> : <CircleAlert />}</article>
          ))}
        </div>
      </section>
      <section className="pair-device" aria-labelledby="pair-device-title">
        <div>
          <Link2 aria-hidden="true" />
          <div>
            <h2 id="pair-device-title">认领新设备</h2>
            <p>输入 TV、Desktop 或 Mobile 上显示的六位短码；短码五分钟后失效且只能使用一次。</p>
          </div>
        </div>
        <form onSubmit={(event) => {
          event.preventDefault();
          pairing.mutate();
        }}>
          <label>
            <span>设备名称</span>
            <input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} required />
          </label>
          <label>
            <span>六位短码</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              value={pairingCode}
              onChange={(event) => setPairingCode(event.target.value.replace(/\D/gu, "").slice(0, 6))}
              placeholder="000000"
              required
            />
          </label>
          <button className="button button--primary" type="submit" disabled={pairing.isPending || pairingCode.length !== 6}>
            {pairing.isPending ? "正在认领…" : "确认配对"}
          </button>
        </form>
        {pairing.isSuccess ? <p className="pair-device__status pair-device__status--ok" role="status">设备已授权；它将在下一次轮询中安全取得会话。</p> : null}
        {pairing.isError ? <p className="pair-device__status pair-device__status--error" role="alert">{pairing.error.message}</p> : null}
      </section>
      <section className="audit-section">
        <header>
          <h2>最近操作</h2>
          <button className="text-button" type="button" onClick={() => backup.mutate()} disabled={backup.isPending}>
            {backup.isPending ? "正在排队…" : backup.isSuccess ? "备份已排队" : "创建加密备份"}
          </button>
        </header>
        <table>
          <tbody>
            {audit.data?.length ? audit.data.map((event) => (
              <tr key={event.id}>
                <td><KeyRound /></td>
                <td>{event.action}</td>
                <td>{event.subject}</td>
                <td>{new Date(event.created_at).toLocaleString()}</td>
              </tr>
            )) : (
              <tr><td><ArchiveRestore /></td><td>尚无审计记录</td><td>连接实例后显示真实事件</td><td>—</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
