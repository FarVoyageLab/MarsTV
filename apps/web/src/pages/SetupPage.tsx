import { useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON
} from "@simplewebauthn/browser";
import { CheckCircle2, KeyRound, LogIn, Server, ShieldCheck } from "lucide-react";
import { setApiOrigin, setSessionToken } from "../lib/runtime";

export function SetupPage() {
  const [origin, setOrigin] = useState("http://localhost:8787");
  const [bootstrapToken, setBootstrapToken] = useState("");
  const [displayName, setDisplayName] = useState("Owner");
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState("");

  function endpoint(path: string): string {
    return `${origin.replace(/\/$/u, "")}${path}`;
  }

  function persistSession(token: string): void {
    setApiOrigin(origin);
    setSessionToken(token);
    setSession(token);
  }

  async function bootstrap(event: React.FormEvent) {
    event.preventDefault();
    setState("working");
    try {
      const response = await fetch(endpoint("/v1/auth/bootstrap"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-marstv-bootstrap-token": bootstrapToken
        },
        body: JSON.stringify({ displayName })
      });
      const body = await response.json() as { token?: string; error?: { message?: string } };
      if (!response.ok || !body.token) throw new Error(body.error?.message ?? "无法初始化实例");
      persistSession(body.token);
      setState("done");
      setMessage("实例已连接。现在为 Owner 创建 Passkey，并妥善保存恢复码。");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "连接失败");
    }
  }

  async function createPasskey() {
    if (!session) return;
    setState("working");
    try {
      const optionsResponse = await fetch(endpoint("/v1/auth/passkeys/register/options"), {
        method: "POST",
        headers: { authorization: `Bearer ${session}` }
      });
      const options = await optionsResponse.json() as PublicKeyCredentialCreationOptionsJSON & {
        error?: { message?: string };
      };
      if (!optionsResponse.ok) throw new Error(options.error?.message ?? "无法创建 Passkey 选项");
      const response = await startRegistration({ optionsJSON: options });
      const verify = await fetch(endpoint("/v1/auth/passkeys/register/verify"), {
        method: "POST",
        headers: {
          authorization: `Bearer ${session}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ response })
      });
      if (!verify.ok) throw new Error("Passkey 验证失败");
      const recovery = await fetch(endpoint("/v1/auth/recovery-codes"), {
        method: "POST",
        headers: { authorization: `Bearer ${session}` }
      });
      const recoveryBody = await recovery.json() as { codes?: string[] };
      setMessage(
        recoveryBody.codes?.length
          ? `Passkey 已启用。恢复码只显示一次：${recoveryBody.codes.join("  ")}`
          : "Passkey 已启用。"
      );
      setState("done");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Passkey 创建失败");
    }
  }

  async function signInWithPasskey() {
    setState("working");
    try {
      const optionsResponse = await fetch(endpoint("/v1/auth/passkeys/authenticate/options"), {
        method: "POST"
      });
      const challenge = await optionsResponse.json() as {
        requestId: string;
        options: PublicKeyCredentialRequestOptionsJSON;
      };
      if (!optionsResponse.ok) throw new Error("无法开始 Passkey 登录");
      const response = await startAuthentication({ optionsJSON: challenge.options });
      const verify = await fetch(endpoint("/v1/auth/passkeys/authenticate/verify"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: challenge.requestId, response })
      });
      const body = await verify.json() as { token?: string };
      if (!verify.ok || !body.token) throw new Error("Passkey 登录失败");
      persistSession(body.token);
      setState("done");
      setMessage("已安全登录，可以进入内容端或管理后台。");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Passkey 登录失败");
    }
  }

  async function signInWithRecoveryCode() {
    setState("working");
    try {
      const response = await fetch(endpoint("/v1/auth/recovery"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: recoveryCode })
      });
      const body = await response.json() as { token?: string; error?: { message?: string } };
      if (!response.ok || !body.token) throw new Error(body.error?.message ?? "恢复码无效");
      persistSession(body.token);
      setRecoveryCode("");
      setState("done");
      setMessage("恢复码已消费并登录；请尽快重新生成一组恢复码。");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "恢复码登录失败");
    }
  }

  return (
    <div className="setup-page">
      <section>
        <Server aria-hidden="true" />
        <h1>连接 MarsTV 实例</h1>
        <p>使用一次性引导密钥创建家庭 Owner。MarsTV 不需要邮件服务。</p>
        <form onSubmit={bootstrap}>
          <label><span>Edge API 地址</span><input type="url" required value={origin} onChange={(event) => setOrigin(event.target.value)} /></label>
          <label><span>Owner 显示名称</span><input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
          <label><span>一次性引导密钥</span><input type="password" required value={bootstrapToken} onChange={(event) => setBootstrapToken(event.target.value)} /></label>
          <button className="button button--primary" type="submit" disabled={state === "working"}>
            <KeyRound /> {state === "working" ? "正在连接…" : "创建并连接"}
          </button>
        </form>
        {state === "done" || state === "error" ? (
          <div className={`setup-result setup-result--${state}`} role="status">
            {state === "done" ? <CheckCircle2 /> : null}{message}
          </div>
        ) : null}
        {session ? (
          <button className="button button--secondary" type="button" onClick={createPasskey}>
            <ShieldCheck /> 为当前设备创建 Passkey
          </button>
        ) : (
          <div className="setup-signin" aria-label="登录已有实例">
            <button className="button button--secondary" type="button" onClick={signInWithPasskey}>
              <LogIn /> 使用 Passkey 登录
            </button>
            <div>
              <input
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                placeholder="一次性恢复码"
                aria-label="一次性恢复码"
              />
              <button type="button" disabled={!recoveryCode} onClick={signInWithRecoveryCode}>恢复登录</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
