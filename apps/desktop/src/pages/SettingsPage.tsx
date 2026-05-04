import type { CmsSource } from "@marstv/core";
import { useEffect, useState } from "react";
import { saveSources, useSources } from "../lib/sources";

// Local form-row type — mirrors the web ConfigPage pattern.
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

export function SettingsPage() {
	const sources = useSources();
	const [rows, setRows] = useState<Row[]>(() => sources.map(toRow));
	const [saveMsg, setSaveMsg] = useState<string | null>(null);

	// Keep the form in sync if sources change externally (e.g. first hydration
	// after mount arrives). We only overwrite local state when sources differs
	// in length — avoids clobbering unsaved edits.
	useEffect(() => {
		setRows((prev) =>
			prev.length === 0 && sources.length > 0 ? sources.map(toRow) : prev,
		);
	}, [sources]);

	const addRow = () => {
		setRows((prev) => [
			...prev,
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
		setRows((prev) => prev.filter((r) => r._rowId !== id));
	};

	const updateRow = (id: string, patch: Partial<Row>) => {
		setRows((prev) =>
			prev.map((r) => (r._rowId === id ? { ...r, ...patch } : r)),
		);
	};

	const moveRow = (id: string, dir: -1 | 1) => {
		setRows((prev) => {
			const idx = prev.findIndex((r) => r._rowId === id);
			if (idx < 0) return prev;
			const target = idx + dir;
			if (target < 0 || target >= prev.length) return prev;
			const next = prev.slice();
			[next[idx], next[target]] = [next[target]!, next[idx]!];
			return next;
		});
	};

	const save = () => {
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
		const cleaned = rows.map((r) => {
			const s = toSource(r);
			if (!s.detail) delete s.detail;
			return s;
		});
		saveSources(cleaned);
		setSaveMsg("已保存");
		setTimeout(() => setSaveMsg(null), 2200);
	};

	return (
		<div className="mx-auto w-full max-w-[1100px] px-6 pt-14 pb-24 md:px-8">
			<header className="mb-10">
				<div className="micro-label mb-2">本地设置</div>
				<h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg)]">
					CMS 源配置
				</h1>
				<p className="mt-2 text-[13px] text-[var(--fg-dim)]">
					所有源仅保存在本机，不会上传到任何服务器。
				</p>
			</header>

			{rows.length === 0 ? (
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
				<div className="ml-auto flex items-center gap-3">
					{saveMsg && (
						<span
							className={
								saveMsg === "已保存"
									? "text-[12px] text-[var(--ember)]"
									: "text-[12px] text-[#ffb0b0]"
							}
						>
							{saveMsg}
						</span>
					)}
					<button type="button" onClick={save} className="glass-button">
						保存全部
					</button>
				</div>
			</div>
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
