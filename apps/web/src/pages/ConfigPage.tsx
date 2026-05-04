import type { CmsSource } from "@marstv/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { refreshSources } from "../lib/sources";

// Local form-row type — extends CmsSource with a stable editing id.
type Row = CmsSource & { _rowId: string };

function rowId(): string {
	return Math.random().toString(36).slice(2, 10);
}

function toRow(s: CmsSource): Row {
	return { ...s, _rowId: rowId() };
}

function toSource(r: Row): CmsSource {
	const { _rowId: _, ...rest } = r;
	void _;
	return rest;
}

export function ConfigPage() {
	const [authState, setAuthState] = useState<
		"loading" | "anonymous" | "authed" | "disabled"
	>("loading");
	const [password, setPassword] = useState("");
	const [loginError, setLoginError] = useState<string | null>(null);
	const [loggingIn, setLoggingIn] = useState(false);

	const [rows, setRows] = useState<Row[] | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState<string | null>(null);
	const [importOpen, setImportOpen] = useState(false);
	const pwInputRef = useRef<HTMLInputElement | null>(null);

	// Check session on mount.
	useEffect(() => {
		const ctrl = new AbortController();
		(async () => {
			try {
				const res = await fetch("/api/config/auth", { signal: ctrl.signal });
				const body = (await res.json()) as {
					success: boolean;
					data?: { authenticated: boolean; configured: boolean };
				};
				if (ctrl.signal.aborted) return;
				if (!body.data?.configured) {
					setAuthState("disabled");
					return;
				}
				setAuthState(body.data.authenticated ? "authed" : "anonymous");
			} catch {
				if (ctrl.signal.aborted) return;
				setAuthState("anonymous");
			}
		})();
		return () => ctrl.abort();
	}, []);

	// Load sources once authed.
	const loadSources = useCallback(async () => {
		setLoadError(null);
		try {
			const res = await fetch("/api/config/sources");
			if (res.status === 401) {
				setAuthState("anonymous");
				return;
			}
			const body = (await res.json()) as {
				success: boolean;
				error?: string;
				data?: { sources: CmsSource[] };
			};
			if (!body.success) {
				setLoadError(body.error ?? "加载失败");
				return;
			}
			setRows((body.data?.sources ?? []).map(toRow));
		} catch (err) {
			setLoadError(err instanceof Error ? err.message : "网络错误");
		}
	}, []);

	useEffect(() => {
		if (authState === "authed") {
			// Fire-and-forget — internal state updates happen asynchronously.
			// eslint-disable-next-line react-hooks/set-state-in-effect
			void loadSources();
		}
	}, [authState, loadSources]);

	useEffect(() => {
		if (authState === "anonymous") pwInputRef.current?.focus();
	}, [authState]);

	const submitLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!password) return;
		setLoggingIn(true);
		setLoginError(null);
		try {
			const res = await fetch("/api/config/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ password }),
			});
			const body = (await res.json()) as { success: boolean; error?: string };
			if (!body.success) {
				setLoginError(body.error ?? "登录失败");
				return;
			}
			setPassword("");
			setAuthState("authed");
		} catch (err) {
			setLoginError(err instanceof Error ? err.message : "网络错误");
		} finally {
			setLoggingIn(false);
		}
	};

	const logout = async () => {
		await fetch("/api/config/logout", { method: "POST" });
		setAuthState("anonymous");
		setRows(null);
	};

	const addRow = () => {
		setRows((prev) => [
			...(prev ?? []),
			{
				_rowId: rowId(),
				key: "",
				name: "",
				api: "",
				detail: "",
				adult: false,
				enabled: true,
			},
		]);
	};

	const removeRow = (id: string) => {
		setRows((prev) => (prev ?? []).filter((r) => r._rowId !== id));
	};

	const updateRow = (id: string, patch: Partial<Row>) => {
		setRows((prev) =>
			(prev ?? []).map((r) => (r._rowId === id ? { ...r, ...patch } : r)),
		);
	};

	const moveRow = (id: string, dir: -1 | 1) => {
		setRows((prev) => {
			if (!prev) return prev;
			const idx = prev.findIndex((r) => r._rowId === id);
			if (idx < 0) return prev;
			const target = idx + dir;
			if (target < 0 || target >= prev.length) return prev;
			const next = prev.slice();
			[next[idx], next[target]] = [next[target]!, next[idx]!];
			return next;
		});
	};

	// Apply imported sources to the in-memory rows. User still needs to click
	// "保存全部" afterward to persist — this matches the behavior of add/remove.
	const applyImport = (incoming: CmsSource[], mode: "replace" | "append") => {
		if (mode === "replace") {
			setRows(incoming.map(toRow));
			setSaveMsg(`已导入 ${incoming.length} 个源,点击"保存全部"以生效`);
			return;
		}
		// Append — skip rows whose key matches an existing row.
		setRows((prev) => {
			const existing = prev ?? [];
			const existingKeys = new Set(existing.map((r) => r.key));
			const fresh = incoming.filter((s) => !existingKeys.has(s.key));
			const skipped = incoming.length - fresh.length;
			const summary =
				skipped > 0
					? `已追加 ${fresh.length} 个源,跳过 ${skipped} 个重复 key`
					: `已追加 ${fresh.length} 个源`;
			setSaveMsg(`${summary},点击"保存全部"以生效`);
			return [...existing, ...fresh.map(toRow)];
		});
	};

	const exportJson = () => {
		if (!rows) return;
		const payload = {
			sources: rows.map((r) => {
				const s = toSource(r);
				if (!s.detail) delete s.detail;
				return s;
			}),
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		const stamp = new Date().toISOString().slice(0, 10);
		a.download = `marstv-sources-${stamp}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const save = async () => {
		if (!rows) return;
		// Client-side validation.
		for (const r of rows) {
			if (!r.key.trim() || !r.name.trim() || !r.api.trim()) {
				setSaveMsg("每一行必须填写 key、名称和 API");
				return;
			}
			if (!/^https?:\/\//.test(r.api)) {
				setSaveMsg(`API 必须以 http:// 或 https:// 开头: ${r.key}`);
				return;
			}
		}
		const keys = new Set<string>();
		for (const r of rows) {
			if (keys.has(r.key)) {
				setSaveMsg(`重复的 key: ${r.key}`);
				return;
			}
			keys.add(r.key);
		}

		setSaving(true);
		setSaveMsg(null);
		try {
			const payload = {
				sources: rows.map((r) => {
					const s = toSource(r);
					// Drop empty optional fields.
					if (!s.detail) delete s.detail;
					return s;
				}),
			};
			const res = await fetch("/api/config/sources", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});
			const body = (await res.json()) as {
				success: boolean;
				error?: string;
				data?: { sources: CmsSource[] };
			};
			if (!body.success) {
				setSaveMsg(body.error ?? "保存失败");
				return;
			}
			setRows((body.data?.sources ?? []).map(toRow));
			setSaveMsg("已保存");
			setTimeout(() => setSaveMsg(null), 2200);
			// Notify the SPA so useSources() subscribers re-render with the new list.
			void refreshSources();
		} catch (err) {
			setSaveMsg(err instanceof Error ? err.message : "网络错误");
		} finally {
			setSaving(false);
		}
	};

	// ── Render ──

	if (authState === "loading") {
		return (
			<div className="mx-auto flex w-full max-w-[640px] items-center justify-center px-6 py-24">
				<p className="hint">检查会话…</p>
			</div>
		);
	}

	if (authState === "disabled") {
		return (
			<div className="mx-auto w-full max-w-[640px] px-6 py-20">
				<h1 className="text-[clamp(24px,3vw,32px)] font-semibold tracking-[-0.02em] text-[var(--fg)]">
					未启用管理后台
				</h1>
				<p className="mt-3 text-[14px] leading-relaxed text-[var(--fg-dim)]">
					请在 Cloudflare Worker 上配置{" "}
					<code className="cmd-key">ADMIN_PASSWORD</code> 与{" "}
					<code className="cmd-key">SESSION_SECRET</code> 密钥，并绑定{" "}
					<code className="cmd-key">MARSTV_CMS</code> KV 命名空间后重试。
				</p>
				<pre className="mt-6 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-2)] p-4 font-mono text-[12px] leading-relaxed text-[var(--fg-dim)]">
					{`wrangler kv namespace create MARSTV_CMS
wrangler secret put ADMIN_PASSWORD
wrangler secret put SESSION_SECRET
pnpm -F @marstv/web cf-typegen
wrangler deploy`}
				</pre>
			</div>
		);
	}

	if (authState === "anonymous") {
		return (
			<div className="mx-auto flex w-full max-w-[440px] flex-col px-6 py-24">
				<div className="mb-8 text-center">
					<div className="micro-label mb-3">管理员入口</div>
					<h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg)]">
						CMS 源配置
					</h1>
					<p className="mt-3 text-[13px] leading-relaxed text-[var(--fg-dim)]">
						输入管理员密码以编辑视频源
					</p>
				</div>
				<form onSubmit={submitLogin} className="relative">
					<input
						ref={pwInputRef}
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="管理员密码"
						className="cmd-input !py-4 !pl-6 !text-[16px]"
						autoComplete="current-password"
					/>
					{loginError && (
						<p className="mt-3 text-center text-[12px] text-[#ff6b6b]">
							{loginError}
						</p>
					)}
					<button
						type="submit"
						disabled={loggingIn || !password}
						className="glass-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loggingIn ? "验证中…" : "登录"}
					</button>
				</form>
			</div>
		);
	}

	// Authed
	return (
		<div className="mx-auto w-full max-w-[1100px] px-6 pt-14 pb-24 md:px-8">
			<header className="mb-10 flex items-end justify-between gap-4">
				<div>
					<div className="micro-label mb-2">管理后台</div>
					<h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg)]">
						CMS 源配置
					</h1>
					<p className="mt-2 text-[13px] text-[var(--fg-dim)]">
						在此管理所有 Apple CMS V10 视频源，保存后所有访问者立即生效。
					</p>
				</div>
				<button
					type="button"
					onClick={logout}
					className="quick-action"
					title="退出登录"
				>
					退出
				</button>
			</header>

			{loadError && (
				<div className="mb-6 rounded-[var(--radius-md)] border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-4 py-3 text-[13px] text-[#ffb0b0]">
					加载失败：{loadError}
				</div>
			)}

			{rows === null ? (
				<p className="hint">加载中…</p>
			) : rows.length === 0 ? (
				<div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-1)] px-6 py-10 text-center">
					<p className="text-[14px] text-[var(--fg-dim)]">尚未配置任何视频源</p>
					<button type="button" onClick={addRow} className="glass-button mt-5">
						添加第一个源
					</button>
				</div>
			) : (
				<div className="space-y-3">
					{rows.map((r, i) => (
						<SourceRow
							key={r._rowId}
							row={r}
							index={i}
							total={rows.length}
							onChange={(patch) => updateRow(r._rowId, patch)}
							onRemove={() => removeRow(r._rowId)}
							onMove={(dir) => moveRow(r._rowId, dir)}
						/>
					))}
				</div>
			)}

			<div className="mt-8 flex flex-wrap items-center gap-3">
				<button type="button" onClick={addRow} className="quick-action">
					<span className="dot" />
					添加源
				</button>
				<button
					type="button"
					onClick={() => setImportOpen(true)}
					className="quick-action"
					title="从 JSON 批量导入"
				>
					导入 JSON
				</button>
				<button
					type="button"
					onClick={exportJson}
					disabled={!rows || rows.length === 0}
					className="quick-action disabled:cursor-not-allowed disabled:opacity-40"
					title="导出当前配置为 JSON"
				>
					导出 JSON
				</button>
				<div className="ml-auto flex items-center gap-3">
					{saveMsg && (
						<span
							className={
								saveMsg === "已保存"
									? "text-[12px] text-[var(--ember)]"
									: saveMsg.startsWith("已导入") || saveMsg.startsWith("已追加")
										? "text-[12px] text-[var(--ember)]"
										: "text-[12px] text-[#ffb0b0]"
							}
						>
							{saveMsg}
						</span>
					)}
					<button
						type="button"
						onClick={save}
						disabled={saving || !rows}
						className="glass-button disabled:cursor-not-allowed disabled:opacity-50"
					>
						{saving ? "保存中…" : "保存全部"}
					</button>
				</div>
			</div>

			{importOpen && (
				<ImportDialog
					onClose={() => setImportOpen(false)}
					onImport={(sources, mode) => {
						applyImport(sources, mode);
						setImportOpen(false);
					}}
				/>
			)}
		</div>
	);
}

function SourceRow({
	row,
	index,
	total,
	onChange,
	onRemove,
	onMove,
}: {
	row: Row;
	index: number;
	total: number;
	onChange: (patch: Partial<Row>) => void;
	onRemove: () => void;
	onMove: (dir: -1 | 1) => void;
}) {
	return (
		<div className="grid grid-cols-1 gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-1)] p-4 md:grid-cols-[120px_1fr_1fr_1fr_auto]">
			<Field
				label="key"
				value={row.key}
				onChange={(v) => onChange({ key: v })}
				placeholder="唯一标识"
				mono
			/>
			<Field
				label="名称"
				value={row.name}
				onChange={(v) => onChange({ name: v })}
				placeholder="显示名"
			/>
			<Field
				label="API"
				value={row.api}
				onChange={(v) => onChange({ api: v })}
				placeholder="https://…/api.php/provide/vod"
				mono
			/>
			<Field
				label="详情页 (可选)"
				value={row.detail ?? ""}
				onChange={(v) => onChange({ detail: v })}
				placeholder="https://…"
				mono
			/>
			<div className="flex flex-row items-center gap-2 md:flex-col md:items-end md:gap-2">
				<div className="flex items-center gap-3">
					<Toggle
						label="启用"
						checked={row.enabled ?? true}
						onChange={(v) => onChange({ enabled: v })}
					/>
					<Toggle
						label="成人"
						checked={row.adult ?? false}
						onChange={(v) => onChange({ adult: v })}
					/>
				</div>
				<div className="flex items-center gap-1">
					<IconBtn
						title="上移"
						onClick={() => onMove(-1)}
						disabled={index === 0}
					>
						↑
					</IconBtn>
					<IconBtn
						title="下移"
						onClick={() => onMove(1)}
						disabled={index === total - 1}
					>
						↓
					</IconBtn>
					<IconBtn title="删除" onClick={onRemove} danger>
						×
					</IconBtn>
				</div>
			</div>
		</div>
	);
}

function Field({
	label,
	value,
	onChange,
	placeholder,
	mono,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	mono?: boolean;
}) {
	return (
		<label className="flex flex-col gap-1">
			<span className="micro-label">{label}</span>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={`h-9 rounded-[8px] border border-[var(--border)] bg-[var(--bg-2)] px-3 text-[13px] text-[var(--fg)] placeholder:text-[var(--fg-mute)] focus:border-[var(--ember-ring)] focus:ring-2 focus:ring-[rgba(255,122,0,0.15)] ${mono ? "font-mono" : ""}`}
			/>
		</label>
	);
}

function Toggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-[var(--fg-dim)]">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="h-3.5 w-3.5 cursor-pointer accent-[var(--ember)]"
			/>
			{label}
		</label>
	);
}

function IconBtn({
	children,
	onClick,
	title,
	disabled,
	danger,
}: {
	children: React.ReactNode;
	onClick: () => void;
	title: string;
	disabled?: boolean;
	danger?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			className={`flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--border)] font-mono text-[13px] transition-colors ${
				danger
					? "text-[#ff8b8b] hover:border-[#ff6b6b]/50 hover:bg-[#ff6b6b]/10"
					: "text-[var(--fg-dim)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.04)]"
			} disabled:cursor-not-allowed disabled:opacity-30`}
		>
			{children}
		</button>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Import dialog — paste JSON or pick a .json file, pick merge mode, confirm.

// Parse raw JSON text into a validated CmsSource[] or return a list of issues.
// Accepts either `CmsSource[]` directly or `{ sources: CmsSource[] }` wrapper
// (matches the shape used by save() and exportJson()).
function parseSources(raw: string): {
	sources?: CmsSource[];
	errors: string[];
} {
	const errors: string[] = [];
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch (err) {
		return {
			errors: [
				`JSON 解析失败: ${err instanceof Error ? err.message : "未知错误"}`,
			],
		};
	}

	let arr: unknown;
	if (Array.isArray(data)) {
		arr = data;
	} else if (
		data &&
		typeof data === "object" &&
		Array.isArray((data as { sources?: unknown }).sources)
	) {
		arr = (data as { sources: unknown[] }).sources;
	} else {
		return {
			errors: ["顶层必须是数组或包含 `sources` 字段的对象"],
		};
	}

	const list = arr as unknown[];
	const sources: CmsSource[] = [];
	const seenKeys = new Set<string>();

	list.forEach((item, i) => {
		const label = `第 ${i + 1} 项`;
		if (!item || typeof item !== "object") {
			errors.push(`${label}: 必须是对象`);
			return;
		}
		const s = item as Record<string, unknown>;
		const key = typeof s.key === "string" ? s.key.trim() : "";
		const name = typeof s.name === "string" ? s.name.trim() : "";
		const api = typeof s.api === "string" ? s.api.trim() : "";

		if (!key) errors.push(`${label}: 缺少 key`);
		if (!name) errors.push(`${label}: 缺少 name`);
		if (!api) errors.push(`${label}: 缺少 api`);
		if (api && !/^https?:\/\//.test(api)) {
			errors.push(
				`${label} (${key || "?"}): api 必须以 http:// 或 https:// 开头`,
			);
		}
		if (key && seenKeys.has(key)) {
			errors.push(`${label}: 重复的 key "${key}"`);
		}
		seenKeys.add(key);

		if (!key || !name || !api) return;

		const detail =
			typeof s.detail === "string" && s.detail.trim()
				? s.detail.trim()
				: undefined;

		sources.push({
			key,
			name,
			api,
			...(detail ? { detail } : {}),
			adult: Boolean(s.adult),
			enabled: s.enabled === undefined ? true : Boolean(s.enabled),
		});
	});

	if (errors.length > 0) return { errors };
	return { sources, errors };
}

function ImportDialog({
	onClose,
	onImport,
}: {
	onClose: () => void;
	onImport: (sources: CmsSource[], mode: "replace" | "append") => void;
}) {
	const [text, setText] = useState("");
	const [mode, setMode] = useState<"replace" | "append">("append");
	const [errors, setErrors] = useState<string[]>([]);
	const [preview, setPreview] = useState<CmsSource[] | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	// Re-parse on every text change so the preview updates live.
	useEffect(() => {
		if (!text.trim()) {
			setErrors([]);
			setPreview(null);
			return;
		}
		const { sources, errors: errs } = parseSources(text);
		setErrors(errs);
		setPreview(sources ?? null);
	}, [text]);

	const onFile = (file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === "string") setText(result);
		};
		reader.onerror = () => setErrors(["文件读取失败"]);
		reader.readAsText(file);
	};

	const canImport =
		preview !== null && preview.length > 0 && errors.length === 0;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-label="批量导入 JSON"
		>
			<button
				type="button"
				aria-label="关闭对话框"
				onClick={onClose}
				className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
			/>
			<div className="relative w-full max-w-[720px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-1)] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
					<div>
						<div className="micro-label mb-1">BULK IMPORT</div>
						<h2 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--fg)]">
							批量导入 JSON
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="关闭"
						className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--border)] font-mono text-[14px] text-[var(--fg-dim)] transition-colors hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.04)]"
					>
						×
					</button>
				</div>

				{/* Body */}
				<div className="px-6 py-5">
					<p className="mb-3 text-[12px] leading-relaxed text-[var(--fg-dim)]">
						粘贴 JSON 或上传 <code className="cmd-key">.json</code>{" "}
						文件。顶层可以是
						<code className="cmd-key">CmsSource[]</code> 数组,或包含{" "}
						<code className="cmd-key">sources</code>{" "}
						字段的对象(与导出格式一致)。
					</p>

					<div className="mb-3 flex flex-wrap items-center gap-3">
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="quick-action"
						>
							选择文件…
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept="application/json,.json"
							className="hidden"
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) onFile(f);
								// Reset so selecting the same file twice still fires onChange.
								e.target.value = "";
							}}
						/>
						<button
							type="button"
							onClick={() => setText("")}
							disabled={!text}
							className="quick-action disabled:cursor-not-allowed disabled:opacity-40"
						>
							清空
						</button>
						<span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-mute)]">
							{text ? `${text.length} CHARS` : "EMPTY"}
						</span>
					</div>

					<textarea
						ref={textareaRef}
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder={`[\n  {\n    "key": "example",\n    "name": "示例源",\n    "api": "https://example.com/api.php/provide/vod",\n    "adult": false,\n    "enabled": true\n  }\n]`}
						spellCheck={false}
						className="h-[260px] w-full resize-none rounded-[8px] border border-[var(--border)] bg-[var(--bg-2)] p-3 font-mono text-[12px] leading-relaxed text-[var(--fg)] placeholder:text-[var(--fg-mute)] focus:border-[var(--ember-ring)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,122,0,0.15)]"
					/>

					{/* Error list */}
					{errors.length > 0 && (
						<div className="mt-3 max-h-[140px] overflow-y-auto rounded-[8px] border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 p-3 text-[12px] leading-relaxed text-[#ffb0b0]">
							<div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffb0b0]/70">
								VALIDATION ERRORS · {errors.length}
							</div>
							<ul className="list-inside list-disc space-y-0.5">
								{errors.map((err, i) => (
									<li key={i}>{err}</li>
								))}
							</ul>
						</div>
					)}

					{/* Preview */}
					{preview && preview.length > 0 && (
						<div className="mt-3 rounded-[8px] border border-[var(--ember)]/30 bg-[rgba(255,122,0,0.06)] p-3 text-[12px] text-[var(--fg-dim)]">
							<div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ember)]">
								READY · {preview.length} 个源
							</div>
							<div className="line-clamp-2 text-[var(--fg-dim)]">
								{preview.map((s) => s.key).join(", ")}
							</div>
						</div>
					)}

					{/* Mode selector */}
					<div className="mt-5">
						<div className="micro-label mb-2">导入模式</div>
						<div className="flex flex-col gap-2">
							<ModeOption
								checked={mode === "append"}
								onChange={() => setMode("append")}
								title="追加"
								desc="添加到现有源列表,跳过 key 已存在的项"
							/>
							<ModeOption
								checked={mode === "replace"}
								onChange={() => setMode("replace")}
								title="替换"
								desc="清空所有现有源,仅保留导入的内容"
							/>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-4">
					<span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--fg-mute)]">
						{canImport
							? `READY · ${mode === "replace" ? "REPLACE ALL" : "APPEND"}`
							: "AWAITING INPUT"}
					</span>
					<div className="flex items-center gap-2">
						<button type="button" onClick={onClose} className="quick-action">
							取消
						</button>
						<button
							type="button"
							onClick={() => {
								if (preview && canImport) onImport(preview, mode);
							}}
							disabled={!canImport}
							className="glass-button disabled:cursor-not-allowed disabled:opacity-40"
						>
							导入 {preview?.length ?? 0} 个源
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function ModeOption({
	checked,
	onChange,
	title,
	desc,
}: {
	checked: boolean;
	onChange: () => void;
	title: string;
	desc: string;
}) {
	return (
		<label
			className={`flex cursor-pointer items-start gap-3 rounded-[8px] border px-3 py-2.5 transition-colors ${
				checked
					? "border-[var(--ember)]/50 bg-[rgba(255,122,0,0.06)]"
					: "border-[var(--border)] bg-[var(--bg-2)] hover:border-[var(--border-strong)]"
			}`}
		>
			<input
				type="radio"
				name="import-mode"
				checked={checked}
				onChange={onChange}
				className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-[var(--ember)]"
			/>
			<div className="flex flex-col gap-0.5">
				<span className="text-[13px] font-medium text-[var(--fg)]">
					{title}
				</span>
				<span className="text-[11px] leading-relaxed text-[var(--fg-dim)]">
					{desc}
				</span>
			</div>
		</label>
	);
}
