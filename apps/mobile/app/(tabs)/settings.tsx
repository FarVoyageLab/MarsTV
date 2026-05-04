import type { CmsSource } from "@marstv/core";
import { useMemo, useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	TextInput,
	View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { saveSources, useSources } from "@/lib/sources-store";

// Signal Console — broadcast-equipment aesthetic, portrait-optimized.
const EMBER = "#e8813a";
const EMBER_SOFT = "rgba(232,129,58,0.12)";
const EMBER_GLOW = "rgba(232,129,58,0.38)";
const DANGER = "#e85454";
const DANGER_SOFT = "rgba(232,84,84,0.1)";
const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

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
function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

type Palette = {
	bg: string;
	surface: string;
	surfaceMute: string;
	border: string;
	borderStrong: string;
	text: string;
	ink: string;
	inkDim: string;
	inkMute: string;
	placeholder: string;
};

function makePalette(scheme: "light" | "dark"): Palette {
	const dark = scheme === "dark";
	return {
		bg: dark ? "#0e0e10" : "#f7f5f0",
		surface: dark ? "rgba(255,255,255,0.04)" : "rgba(20,15,10,0.04)",
		surfaceMute: dark ? "rgba(255,255,255,0.02)" : "rgba(20,15,10,0.02)",
		border: dark ? "rgba(255,255,255,0.1)" : "rgba(20,15,10,0.12)",
		borderStrong: dark ? "rgba(255,255,255,0.2)" : "rgba(20,15,10,0.24)",
		text: dark ? "#f4f2ed" : "#14100c",
		ink: dark ? "#f4f2ed" : "#14100c",
		inkDim: dark ? "rgba(244,242,237,0.5)" : "rgba(20,16,12,0.5)",
		inkMute: dark ? "rgba(244,242,237,0.3)" : "rgba(20,16,12,0.3)",
		placeholder: dark ? "rgba(244,242,237,0.25)" : "rgba(20,16,12,0.28)",
	};
}

export default function SettingsScreen() {
	const persisted = useSources();
	const scheme = useColorScheme() ?? "light";
	const palette = useMemo(() => makePalette(scheme), [scheme]);
	const styles = useMemo(() => makeStyles(palette), [palette]);

	const [rows, setRows] = useState<Row[]>(() => persisted.map(toRow));
	const [saving, setSaving] = useState(false);

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
	const removeRow = (id: string) =>
		setRows((prev) => prev.filter((r) => r._rowId !== id));
	const updateRow = (id: string, patch: Partial<Row>) =>
		setRows((prev) =>
			prev.map((r) => (r._rowId === id ? { ...r, ...patch } : r)),
		);

	const save = async () => {
		for (const r of rows) {
			if (!r.key.trim() || !r.name.trim() || !r.api.trim()) {
				Alert.alert("保存失败", "每一行必须填写 key、名称和 API");
				return;
			}
			if (!/^https?:\/\//.test(r.api)) {
				Alert.alert(
					"保存失败",
					`API 必须以 http:// 或 https:// 开头: ${r.key}`,
				);
				return;
			}
		}
		const keys = new Set<string>();
		for (const r of rows) {
			if (keys.has(r.key)) {
				Alert.alert("保存失败", `重复的 key: ${r.key}`);
				return;
			}
			keys.add(r.key);
		}
		setSaving(true);
		try {
			const cleaned = rows.map((r) => {
				const s = toSource(r);
				if (!s.detail) delete s.detail;
				return s;
			});
			await saveSources(cleaned);
			Alert.alert("已保存", "源列表已更新");
		} catch (err) {
			Alert.alert("保存失败", err instanceof Error ? err.message : "未知错误");
		} finally {
			setSaving(false);
		}
	};

	const activeCount = rows.filter((r) => r.enabled !== false).length;

	return (
		<ThemedView style={[styles.container, { backgroundColor: palette.bg }]}>
			<KeyboardAvoidingView
				style={styles.flex}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
				>
					{/* Console identity header */}
					<View style={styles.header}>
						<View style={styles.headerTopRow}>
							<ThemedText style={styles.bracket}>[</ThemedText>
							<ThemedText style={styles.title}>SRC.CFG</ThemedText>
							<ThemedText style={styles.bracket}>]</ThemedText>
							<View style={styles.pulseBadge}>
								<View style={styles.pulseDot} />
								<ThemedText style={styles.pulseText}>LIVE</ThemedText>
							</View>
						</View>
						<View style={styles.headerBottomRow}>
							<ThemedText style={styles.readout}>
								CH {pad2(activeCount)} / {pad2(rows.length)} · ACTIVE
							</ThemedText>
							<View style={styles.readoutDivider} />
							<ThemedText style={styles.readout}>LOCAL · NO UPLINK</ThemedText>
						</View>
						<ThemedText style={styles.subtitle}>
							源配置 · 本机保存 · 不上传任何服务器
						</ThemedText>
					</View>

					{rows.length === 0 ? (
						<EmptyState onAdd={addRow} palette={palette} />
					) : (
						<View style={styles.rack}>
							{rows.map((r, i) => (
								<SourceCard
									key={r._rowId}
									row={r}
									index={i + 1}
									palette={palette}
									onChange={(patch) => updateRow(r._rowId, patch)}
									onRemove={() => removeRow(r._rowId)}
								/>
							))}
						</View>
					)}

					{rows.length > 0 ? (
						<View style={styles.footer}>
							<Pressable
								style={({ pressed }) => [
									styles.secondaryBtn,
									pressed && styles.pressed,
								]}
								onPress={addRow}
							>
								<ThemedText style={styles.secondaryBtnText}>
									+ NEW CH
								</ThemedText>
							</Pressable>
							<Pressable
								style={({ pressed }) => [
									styles.primaryBtn,
									pressed && styles.pressed,
									saving && styles.disabled,
								]}
								onPress={save}
								disabled={saving}
							>
								<View style={styles.btnLed} />
								<ThemedText style={styles.primaryBtnText}>
									{saving ? "COMMITTING…" : "COMMIT"}
								</ThemedText>
							</Pressable>
						</View>
					) : null}
				</ScrollView>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// SourceCard
// ═════════════════════════════════════════════════════════════════════════════

function SourceCard({
	row,
	index,
	palette,
	onChange,
	onRemove,
}: {
	row: Row;
	index: number;
	palette: Palette;
	onChange: (patch: Partial<Row>) => void;
	onRemove: () => void;
}) {
	const styles = makeStyles(palette);
	const enabled = row.enabled !== false;

	return (
		<View style={[styles.card, !enabled && styles.cardDim]}>
			<View
				style={[
					styles.cardStripe,
					{ backgroundColor: enabled ? EMBER : palette.border },
				]}
			/>

			{/* Number + status column */}
			<View style={styles.cardNumberCol}>
				<ThemedText style={styles.cardNumberLabel}>CH</ThemedText>
				<ThemedText
					style={[
						styles.cardNumberValue,
						{ color: enabled ? palette.ink : palette.inkMute },
					]}
				>
					{pad2(index)}
				</ThemedText>
				<View
					style={[styles.statusPill, enabled ? styles.pillOn : styles.pillOff]}
				>
					<ThemedText
						style={[
							styles.statusPillText,
							{ color: enabled ? EMBER : palette.inkDim },
						]}
					>
						{enabled ? "ON" : "OFF"}
					</ThemedText>
				</View>
				{row.adult ? (
					<View style={styles.adultPill}>
						<ThemedText style={styles.adultPillText}>NSFW</ThemedText>
					</View>
				) : null}
			</View>

			{/* Body */}
			<View style={styles.cardBody}>
				<View style={styles.cardHeadRow}>
					<ThemedText style={styles.cardTitle} numberOfLines={1}>
						{row.name || row.key || "UNTITLED SIGNAL"}
					</ThemedText>
					<Switch
						value={enabled}
						onValueChange={(v) => onChange({ enabled: v })}
						trackColor={{ false: palette.border, true: EMBER }}
						thumbColor="#ffffff"
						ios_backgroundColor={palette.border}
					/>
				</View>

				<Field
					label="KEY"
					value={row.key}
					onChange={(v) => onChange({ key: v })}
					placeholder="heimuer"
					mono
					palette={palette}
				/>
				<Field
					label="DISPLAY NAME"
					value={row.name}
					onChange={(v) => onChange({ name: v })}
					placeholder="显示名"
					palette={palette}
				/>
				<Field
					label="API ENDPOINT"
					value={row.api}
					onChange={(v) => onChange({ api: v })}
					placeholder="https://…/api.php/provide/vod"
					mono
					palette={palette}
				/>
				<Field
					label="DETAIL · OPTIONAL"
					value={row.detail ?? ""}
					onChange={(v) => onChange({ detail: v })}
					placeholder="https://…"
					mono
					palette={palette}
				/>

				<View style={styles.cardFooter}>
					<View style={styles.adultToggleGroup}>
						<ThemedText style={[styles.toggleLabel, { color: DANGER }]}>
							ADULT FILTER
						</ThemedText>
						<Switch
							value={row.adult ?? false}
							onValueChange={(v) => onChange({ adult: v })}
							trackColor={{ false: palette.border, true: DANGER }}
							thumbColor="#ffffff"
							ios_backgroundColor={palette.border}
						/>
					</View>
					<Pressable
						onPress={onRemove}
						style={({ pressed }) => [
							styles.dangerBtn,
							pressed && styles.dangerBtnPressed,
						]}
					>
						<ThemedText style={styles.dangerBtnText}>EJECT</ThemedText>
					</Pressable>
				</View>
			</View>
		</View>
	);
}

function EmptyState({
	onAdd,
	palette,
}: {
	onAdd: () => void;
	palette: Palette;
}) {
	const styles = makeStyles(palette);
	return (
		<View style={styles.emptyFrame}>
			<View style={styles.emptyCornerTL} />
			<View style={styles.emptyCornerTR} />
			<View style={styles.emptyCornerBL} />
			<View style={styles.emptyCornerBR} />

			<ThemedText style={styles.emptySignal}>— NO SIGNAL —</ThemedText>
			<ThemedText style={styles.emptyTitle}>频道尚未登记</ThemedText>
			<ThemedText style={styles.emptyDesc}>
				添加一个 Apple CMS V10 频道以接收信号
			</ThemedText>
			<Pressable
				style={({ pressed }) => [
					styles.primaryBtn,
					styles.primaryBtnWide,
					pressed && styles.pressed,
				]}
				onPress={onAdd}
			>
				<View style={styles.btnLed} />
				<ThemedText style={styles.primaryBtnText}>INITIATE CHANNEL</ThemedText>
			</Pressable>
		</View>
	);
}

function Field({
	label,
	value,
	onChange,
	placeholder,
	mono,
	palette,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	mono?: boolean;
	palette: Palette;
}) {
	const styles = makeStyles(palette);
	const [focused, setFocused] = useState(false);
	return (
		<View style={styles.field}>
			<View style={styles.fieldLabelRow}>
				<ThemedText style={styles.fieldLabel}>{label}</ThemedText>
				{focused ? <View style={styles.fieldLabelDot} /> : null}
			</View>
			<TextInput
				value={value}
				onChangeText={onChange}
				placeholder={placeholder}
				placeholderTextColor={palette.placeholder}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				style={[
					styles.input,
					mono && styles.inputMono,
					{
						color: palette.text,
						borderBottomColor: focused ? EMBER : palette.border,
					},
				]}
				autoCapitalize="none"
				autoCorrect={false}
				spellCheck={false}
			/>
		</View>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════════════════════════════════════

function makeStyles(p: Palette) {
	return StyleSheet.create({
		container: { flex: 1 },
		flex: { flex: 1 },
		scroll: {
			paddingHorizontal: 18,
			paddingTop: 56,
			paddingBottom: 48,
			gap: 20,
		},

		// Header
		header: {
			paddingVertical: 14,
			borderTopWidth: StyleSheet.hairlineWidth,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderColor: p.border,
			gap: 8,
		},
		headerTopRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		bracket: {
			fontFamily: MONO,
			fontSize: 34,
			color: EMBER,
			fontWeight: "200",
			lineHeight: 40,
		},
		title: {
			fontFamily: MONO,
			fontSize: 34,
			fontWeight: "800",
			letterSpacing: 1.5,
			lineHeight: 40,
		},
		pulseBadge: {
			marginLeft: "auto",
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			paddingHorizontal: 8,
			paddingVertical: 3,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: EMBER_GLOW,
			backgroundColor: EMBER_SOFT,
			borderRadius: 2,
		},
		pulseDot: {
			width: 5,
			height: 5,
			borderRadius: 2.5,
			backgroundColor: EMBER,
		},
		pulseText: {
			fontFamily: MONO,
			fontSize: 9,
			fontWeight: "800",
			letterSpacing: 1.5,
			color: EMBER,
		},
		headerBottomRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		readout: {
			fontFamily: MONO,
			fontSize: 10,
			letterSpacing: 1.2,
			color: p.inkDim,
			fontWeight: "700",
		},
		readoutDivider: {
			width: 1,
			height: 10,
			backgroundColor: p.border,
		},
		subtitle: {
			fontSize: 12,
			color: p.inkDim,
			marginTop: 2,
		},

		// Rack
		rack: { gap: 12 },

		// Card
		card: {
			flexDirection: "row",
			backgroundColor: p.surface,
			borderRadius: 4,
			overflow: "hidden",
			paddingRight: 14,
			paddingVertical: 14,
		},
		cardDim: { opacity: 0.5 },
		cardStripe: {
			width: 3,
		},
		cardNumberCol: {
			width: 62,
			alignItems: "center",
			paddingHorizontal: 4,
			gap: 4,
			borderRightWidth: StyleSheet.hairlineWidth,
			borderRightColor: p.border,
		},
		cardNumberLabel: {
			fontFamily: MONO,
			fontSize: 9,
			letterSpacing: 1.5,
			color: p.inkDim,
			fontWeight: "800",
		},
		cardNumberValue: {
			fontFamily: MONO,
			fontSize: 36,
			fontWeight: "800",
			lineHeight: 40,
			letterSpacing: -1.5,
		},
		statusPill: {
			paddingHorizontal: 5,
			paddingVertical: 1,
			borderRadius: 2,
			borderWidth: StyleSheet.hairlineWidth,
			marginTop: 2,
		},
		pillOn: {
			backgroundColor: EMBER_SOFT,
			borderColor: EMBER_GLOW,
		},
		pillOff: {
			backgroundColor: "transparent",
			borderColor: p.border,
		},
		statusPillText: {
			fontFamily: MONO,
			fontSize: 8,
			fontWeight: "800",
			letterSpacing: 1.2,
		},
		adultPill: {
			paddingHorizontal: 5,
			paddingVertical: 1,
			borderRadius: 2,
			borderWidth: StyleSheet.hairlineWidth,
			backgroundColor: DANGER_SOFT,
			borderColor: DANGER,
		},
		adultPillText: {
			fontFamily: MONO,
			fontSize: 8,
			fontWeight: "800",
			letterSpacing: 1.2,
			color: DANGER,
		},

		cardBody: {
			flex: 1,
			paddingLeft: 14,
			gap: 10,
		},
		cardHeadRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			paddingBottom: 8,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: p.border,
		},
		cardTitle: {
			flex: 1,
			fontSize: 15,
			fontWeight: "700",
			letterSpacing: 0.2,
		},
		cardFooter: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 10,
			paddingTop: 10,
			borderTopWidth: StyleSheet.hairlineWidth,
			borderTopColor: p.border,
		},
		adultToggleGroup: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		toggleLabel: {
			fontFamily: MONO,
			fontSize: 9,
			letterSpacing: 1.3,
			fontWeight: "800",
			color: p.inkDim,
		},

		// Field
		field: { gap: 3 },
		fieldLabelRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		fieldLabel: {
			fontFamily: MONO,
			fontSize: 9,
			letterSpacing: 1.5,
			color: p.inkDim,
			fontWeight: "800",
		},
		fieldLabelDot: {
			width: 4,
			height: 4,
			borderRadius: 2,
			backgroundColor: EMBER,
		},
		input: {
			borderBottomWidth: 1,
			paddingVertical: 8,
			paddingHorizontal: 0,
			fontSize: 14,
		},
		inputMono: {
			fontFamily: MONO,
			fontSize: 13,
		},

		// Buttons
		footer: {
			flexDirection: "row",
			gap: 10,
			marginTop: 8,
		},
		primaryBtn: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			paddingVertical: 14,
			paddingHorizontal: 18,
			backgroundColor: EMBER,
			borderRadius: 2,
		},
		primaryBtnWide: {
			flex: 0,
			alignSelf: "stretch",
			marginTop: 4,
		},
		primaryBtnText: {
			fontFamily: MONO,
			color: "#111",
			fontSize: 13,
			fontWeight: "800",
			letterSpacing: 1.5,
		},
		btnLed: {
			width: 5,
			height: 5,
			borderRadius: 2.5,
			backgroundColor: "#111",
		},
		secondaryBtn: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 14,
			paddingHorizontal: 18,
			borderWidth: 1,
			borderColor: p.borderStrong,
			backgroundColor: "transparent",
			borderRadius: 2,
		},
		secondaryBtnText: {
			fontFamily: MONO,
			fontSize: 13,
			fontWeight: "700",
			letterSpacing: 1.5,
		},

		dangerBtn: {
			paddingVertical: 7,
			paddingHorizontal: 14,
			borderWidth: 1,
			borderColor: DANGER,
			backgroundColor: "transparent",
			borderRadius: 2,
		},
		dangerBtnPressed: {
			backgroundColor: DANGER_SOFT,
		},
		dangerBtnText: {
			fontFamily: MONO,
			color: DANGER,
			fontSize: 11,
			fontWeight: "800",
			letterSpacing: 1.5,
		},

		pressed: { opacity: 0.75 },
		disabled: { opacity: 0.5 },

		// Empty
		emptyFrame: {
			position: "relative",
			alignItems: "center",
			paddingVertical: 48,
			paddingHorizontal: 28,
			gap: 12,
			backgroundColor: p.surfaceMute,
		},
		emptyCornerTL: {
			position: "absolute",
			top: 0,
			left: 0,
			width: 18,
			height: 18,
			borderTopWidth: 2,
			borderLeftWidth: 2,
			borderColor: EMBER,
		},
		emptyCornerTR: {
			position: "absolute",
			top: 0,
			right: 0,
			width: 18,
			height: 18,
			borderTopWidth: 2,
			borderRightWidth: 2,
			borderColor: EMBER,
		},
		emptyCornerBL: {
			position: "absolute",
			bottom: 0,
			left: 0,
			width: 18,
			height: 18,
			borderBottomWidth: 2,
			borderLeftWidth: 2,
			borderColor: EMBER,
		},
		emptyCornerBR: {
			position: "absolute",
			bottom: 0,
			right: 0,
			width: 18,
			height: 18,
			borderBottomWidth: 2,
			borderRightWidth: 2,
			borderColor: EMBER,
		},
		emptySignal: {
			fontFamily: MONO,
			fontSize: 11,
			letterSpacing: 3,
			fontWeight: "800",
			color: EMBER,
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: "700",
			letterSpacing: 0.3,
			marginTop: 2,
		},
		emptyDesc: {
			fontSize: 12,
			color: p.inkDim,
			textAlign: "center",
			marginBottom: 8,
		},
	});
}
