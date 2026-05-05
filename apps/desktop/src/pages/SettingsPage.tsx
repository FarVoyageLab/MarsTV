import type { CmsSource } from "@marstv/core";
import {
	getStoredApiOrigin,
	setStoredApiOrigin,
} from "@marstv/ui/app/lib/runtime";
import { useEffect, useRef, useState } from "react";
import { saveSources, useSources } from "../lib/sources";

type Row = CmsSource & { _rowId: string };

type SettingsExport = {
	version: 1;
	apiOrigin: string;
	sources: CmsSource[];
};

function rowId(): string {
	return Math.random().toString(36).slice(2, 10);
}

function toRow(source: CmsSource): Row {
	return { ...source, _rowId: rowId() };
}

function toSource(row: Row): CmsSource {
	const { _rowId: _, ...source } = row;
	void _;
	return source;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseSource(value: unknown): CmsSource | null {
	if (!isRecord(value)) return null;
	const key = typeof value.key === "string" ? value.key.trim() : "";
	const name = typeof value.name === "string" ? value.name.trim() : "";
	const api = typeof value.api === "string" ? value.api.trim() : "";
	if (!key || !name || !api) return null;

	const source: CmsSource = { key, name, api };
	if (typeof value.detail === "string" && value.detail.trim()) {
		source.detail = value.detail.trim();
	}
	if (typeof value.adult === "boolean") source.adult = value.adult;
	if (typeof value.enabled === "boolean") source.enabled = value.enabled;
	return source;
}

function parseImportPayload(value: unknown): SettingsExport | null {
	const rawSources = Array.isArray(value)
		? value
		: isRecord(value) && Array.isArray(value.sources)
			? value.sources
			: null;
	if (!rawSources) return null;

	const sources = rawSources.map(parseSource);
	if (sources.some((source) => !source)) return null;

	const apiOrigin =
		isRecord(value) && typeof value.apiOrigin === "string"
			? value.apiOrigin
			: "";

	return {
		version: 1,
		apiOrigin,
		sources: sources as CmsSource[],
	};
}

export function SettingsPage() {
	const sources = useSources();
	const [rows, setRows] = useState<Row[]>(() => sources.map(toRow));
	const [apiOrigin, setApiOrigin] = useState(() => getStoredApiOrigin());
	const [saveMsg, setSaveMsg] = useState<string | null>(null);
	const [jsonText, setJsonText] = useState("");
	const importRef = useRef<HTMLInputElement | null>(null);

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
		setRows((prev) => prev.filter((row) => row._rowId !== id));
	};

	const updateRow = (id: string, patch: Partial<Row>) => {
		setRows((prev) =>
			prev.map((row) => (row._rowId === id ? { ...row, ...patch } : row)),
		);
	};

	const moveRow = (id: string, dir: -1 | 1) => {
		setRows((prev) => {
			const index = prev.findIndex((row) => row._rowId === id);
			const target = index + dir;
			if (index < 0 || target < 0 || target >= prev.length) return prev;
			const next = prev.slice();
			const current = next[index];
			const swap = next[target];
			if (!current || !swap) return prev;
			next[index] = swap;
			next[target] = current;
			return next;
		});
	};

	const save = async () => {
		const trimmedOrigin = apiOrigin.trim();
		if (trimmedOrigin) {
			try {
				const url = new URL(trimmedOrigin);
				if (url.protocol !== "http:" && url.protocol !== "https:") {
					setSaveMsg("API 服务地址必须以 http:// 或 https:// 开头");
					return;
				}
			} catch {
				setSaveMsg("API 服务地址格式不正确");
				return;
			}
		}

		for (const row of rows) {
			if (!row.key.trim() || !row.name.trim() || !row.api.trim()) {
				setSaveMsg("每一行都需要填写 key、名称和 API");
				return;
			}
			if (!/^https?:\/\//.test(row.api)) {
				setSaveMsg(`源 API 必须以 http:// 或 https:// 开头：${row.key}`);
				return;
			}
		}

		const keys = new Set<string>();
		for (const row of rows) {
			if (keys.has(row.key)) {
				setSaveMsg(`重复的 key：${row.key}`);
				return;
			}
			keys.add(row.key);
		}

		const cleaned = rows.map((row) => {
			const source = toSource(row);
			if (!source.detail) delete source.detail;
			return source;
		});
		try {
			await saveSources(cleaned, apiOrigin);
			setStoredApiOrigin(apiOrigin);
			setSaveMsg("已保存");
			setTimeout(() => {
				window.location.reload();
			}, 500);
		} catch (error) {
			setSaveMsg(error instanceof Error ? error.message : "保存失败");
		}
	};

	const currentSources = () =>
		rows.map((row) => {
			const source = toSource(row);
			if (!source.detail) delete source.detail;
			return source;
		});

	const exportSettings = () => {
		const payload: SettingsExport = {
			version: 1,
			apiOrigin,
			sources: currentSources(),
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: "application/json;charset=utf-8",
		});
		const href = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const date = new Date().toISOString().slice(0, 10);
		link.href = href;
		link.download = `marstv-desktop-settings-${date}.json`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(href);
		setSaveMsg("已导出配置");
	};

	const applyImportedText = (text: string) => {
		try {
			const parsed = parseImportPayload(JSON.parse(text));
			if (!parsed) {
				setSaveMsg("导入文件格式不正确");
				return;
			}
			setRows(parsed.sources.map(toRow));
			setApiOrigin(parsed.apiOrigin);
			setJsonText("");
			setSaveMsg("已导入，请保存生效");
		} catch {
			setSaveMsg("导入失败，请检查 JSON 文件");
		}
	};

	const importSettings = async (file: File | undefined) => {
		if (!file) return;
		try {
			applyImportedText(await file.text());
		} finally {
			if (importRef.current) importRef.current.value = "";
		}
	};

	const importJsonText = () => {
		if (!jsonText.trim()) {
			setSaveMsg("请先粘贴 JSON 配置");
			return;
		}
		applyImportedText(jsonText);
	};

	return (
		<div className="mx-auto w-full max-w-[1120px] px-6 pt-10 pb-24 md:px-8">
			<header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div>
					<div className="micro-label mb-2">桌面端设置</div>
					<h1 className="text-[30px] font-semibold tracking-[-0.02em] text-[var(--fg)]">
						CMS 源与 API
					</h1>
					<p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--fg-dim)]">
						设置只保存在当前设备。桌面端可以连接部署后的 Web / Worker
						API，也可以维护本地 CMS 源列表。
					</p>
				</div>
				<div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-1)] px-3 py-2 font-mono text-[11px] text-[var(--fg-mute)]">
					{rows.length.toString().padStart(2, "0")} SOURCES
				</div>
			</header>

			<section className="mb-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-1)] p-4">
				<Field
					label="API 服务地址"
					value={apiOrigin}
					onChange={setApiOrigin}
					placeholder="https://marstv-web.example.workers.dev"
					mono
				/>
				<p className="mt-2 text-[12px] text-[var(--fg-mute)]">
					留空时使用同源地址；桌面端建议填写已部署的 Web / Worker 地址。
				</p>
			</section>

			<section className="mb-5 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-1)] p-4">
				<div className="mr-auto">
					<div className="micro-label mb-1">配置备份</div>
					<p className="text-[12px] text-[var(--fg-mute)]">
						导出或导入当前 API 地址与 CMS 源列表。
					</p>
				</div>
				<input
					ref={importRef}
					type="file"
					accept="application/json,.json"
					className="hidden"
					onChange={(event) => {
						void importSettings(event.target.files?.[0]);
					}}
				/>
				<button
					type="button"
					onClick={() => importRef.current?.click()}
					className="quick-action"
				>
					<span className="dot" />
					导入
				</button>
				<button type="button" onClick={exportSettings} className="quick-action">
					<span className="dot" />
					导出
				</button>
				<div className="mt-3 flex w-full flex-col gap-3">
					<textarea
						value={jsonText}
						onChange={(event) => setJsonText(event.target.value)}
						placeholder='粘贴 JSON 配置，例如 {"version":1,"apiOrigin":"","sources":[...]}'
						spellCheck={false}
						className="min-h-28 w-full resize-y rounded-[8px] border border-[var(--border)] bg-[var(--bg-2)] px-3 py-2 font-mono text-[12px] text-[var(--fg)] placeholder:text-[var(--fg-mute)] focus:border-[var(--ember-ring)] focus:ring-2 focus:ring-[rgba(255,122,0,0.15)]"
					/>
					<div className="flex justify-end">
						<button
							type="button"
							onClick={importJsonText}
							className="glass-button"
						>
							导入 JSON
						</button>
					</div>
				</div>
			</section>

			{rows.length === 0 ? (
				<div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-1)] px-6 py-12 text-center">
					<p className="text-[14px] text-[var(--fg-dim)]">还没有配置视频源</p>
					<button type="button" onClick={addRow} className="glass-button mt-5">
						添加第一个源
					</button>
				</div>
			) : (
				<div className="space-y-3">
					{rows.map((row, index) => (
						<SourceRow
							key={row._rowId}
							row={row}
							index={index}
							total={rows.length}
							onChange={(patch) => updateRow(row._rowId, patch)}
							onRemove={() => removeRow(row._rowId)}
							onMove={(dir) => moveRow(row._rowId, dir)}
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
					{saveMsg ? (
						<span
							className={
								saveMsg === "已保存"
									? "text-[12px] text-[var(--ember)]"
									: "text-[12px] text-[#ffb0b0]"
							}
						>
							{saveMsg}
						</span>
					) : null}
					<button
						type="button"
						onClick={() => {
							void save();
						}}
						className="glass-button"
					>
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
				onChange={(value) => onChange({ key: value })}
				placeholder="唯一标识"
				mono
			/>
			<Field
				label="名称"
				value={row.name}
				onChange={(value) => onChange({ name: value })}
				placeholder="显示名称"
			/>
			<Field
				label="API"
				value={row.api}
				onChange={(value) => onChange({ api: value })}
				placeholder="https://.../api.php/provide/vod"
				mono
			/>
			<Field
				label="详情页"
				value={row.detail ?? ""}
				onChange={(value) => onChange({ detail: value })}
				placeholder="可选"
				mono
			/>
			<div className="flex flex-row items-center gap-2 md:flex-col md:items-end md:gap-2">
				<div className="flex items-center gap-3">
					<Toggle
						label="启用"
						checked={row.enabled ?? true}
						onChange={(value) => onChange({ enabled: value })}
					/>
					<Toggle
						label="成人"
						checked={row.adult ?? false}
						onChange={(value) => onChange({ adult: value })}
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
	onChange: (value: string) => void;
	placeholder?: string;
	mono?: boolean;
}) {
	return (
		<label className="flex flex-col gap-1">
			<span className="micro-label">{label}</span>
			<input
				type="text"
				value={value}
				onChange={(event) => onChange(event.target.value)}
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
	onChange: (value: boolean) => void;
}) {
	return (
		<label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-[var(--fg-dim)]">
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
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
