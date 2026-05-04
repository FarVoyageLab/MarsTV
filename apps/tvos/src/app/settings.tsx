import type { CmsSource } from "@marstv/core";
import React, { useMemo, useState } from "react";
import {
	Alert,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TVFocusGuideView } from "@/components/tv-focus-guide";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";
import { saveSources, useSources } from "@/lib/sources-store";

// Signal Console — broadcast-equipment aesthetic. Ember on charcoal,
// monospaced channel IDs, LED pulses, underline inputs, corner brackets.
const EMBER = "#e8813a";
const EMBER_SOFT = "rgba(232,129,58,0.14)";
const EMBER_GLOW = "rgba(232,129,58,0.42)";
const OFFLINE = "rgba(255,255,255,0.14)";
const DANGER = "#e85454";
const DANGER_SOFT = "rgba(232,84,84,0.12)";
const INK_DIM = "rgba(255,255,255,0.44)";
const INK_MUTE = "rgba(255,255,255,0.24)";

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

export default function SettingsScreen() {
	const persisted = useSources();
	const theme = useTheme();
	const { scale, spacing } = useScreenDimensions();
	const insets = useSafeAreaInsets();
	const styles = useMemo(
		() => makeStyles(theme, scale, spacing),
		[theme, scale, spacing],
	);

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
	const removeRow = (id: string) => {
		setRows((prev) => prev.filter((r) => r._rowId !== id));
	};
	const updateRow = (id: string, patch: Partial<Row>) => {
		setRows((prev) =>
			prev.map((r) => (r._rowId === id ? { ...r, ...patch } : r)),
		);
	};

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
		<TVFocusGuideView
			style={[styles.container, { backgroundColor: theme.background }]}
		>
			<ScrollView
				contentContainerStyle={[
					styles.scroll,
					{
						paddingTop: insets.top + spacing.four,
						paddingBottom: insets.bottom + spacing.five,
					},
				]}
			>
				{/* Console identity header */}
				<View style={[styles.header, { borderColor: OFFLINE }]}>
					<View style={styles.headerTopRow}>
						<Text style={styles.bracket}>[</Text>
						<Text style={[styles.title, { color: theme.text }]}>SRC.CFG</Text>
						<Text style={styles.bracket}>]</Text>
						<View style={styles.headerPulse}>
							<View style={styles.pulseDot} />
							<Text style={styles.pulseText}>LIVE</Text>
						</View>
					</View>
					<View style={styles.headerBottomRow}>
						<Text style={styles.readout}>
							CH {pad2(activeCount)} / {pad2(rows.length)} · ACTIVE
						</Text>
						<View style={styles.readoutDivider} />
						<Text style={styles.readout}>LOCAL STORAGE · NO UPLINK</Text>
					</View>
					<Text style={[styles.subtitle, { color: theme.textSecondary }]}>
						源配置 · 本机保存 · 不上传任何服务器
					</Text>
				</View>

				{rows.length === 0 ? (
					<EmptyState onAdd={addRow} theme={theme} styles={styles} />
				) : (
					<TVFocusGuideView style={styles.rack}>
						{rows.map((r, i) => (
							<SourceCard
								key={r._rowId}
								row={r}
								index={i + 1}
								theme={theme}
								scale={scale}
								styles={styles}
								onChange={(patch) => updateRow(r._rowId, patch)}
								onRemove={() => removeRow(r._rowId)}
							/>
						))}
					</TVFocusGuideView>
				)}

				{rows.length > 0 ? (
					<TVFocusGuideView style={styles.footer}>
						<SecondaryButton
							label="+  NEW CHANNEL"
							onPress={addRow}
							theme={theme}
							styles={styles}
						/>
						<PrimaryButton
							label={saving ? "COMMITTING…" : "COMMIT CONFIG"}
							onPress={save}
							disabled={saving}
							styles={styles}
						/>
					</TVFocusGuideView>
				) : null}
			</ScrollView>
		</TVFocusGuideView>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// SourceCard — rack-mount channel strip
// ═════════════════════════════════════════════════════════════════════════════

function SourceCard({
	row,
	index,
	theme,
	scale: _scale,
	styles,
	onChange,
	onRemove,
}: {
	row: Row;
	index: number;
	theme: ReturnType<typeof useTheme>;
	scale: number;
	styles: ReturnType<typeof makeStyles>;
	onChange: (patch: Partial<Row>) => void;
	onRemove: () => void;
}) {
	const enabled = row.enabled !== false;

	return (
		<View
			style={[
				styles.card,
				{ backgroundColor: theme.backgroundElement },
				!enabled && styles.cardDim,
			]}
		>
			<View
				style={[
					styles.cardStripe,
					{ backgroundColor: enabled ? EMBER : OFFLINE },
				]}
			/>

			{/* Channel number column */}
			<View style={[styles.cardNumber, { borderRightColor: OFFLINE }]}>
				<Text style={styles.cardNumberLabel}>CH</Text>
				<Text
					style={[
						styles.cardNumberValue,
						{ color: enabled ? theme.text : INK_MUTE },
					]}
				>
					{pad2(index)}
				</Text>
				<View
					style={[styles.statusPill, enabled ? styles.pillOn : styles.pillOff]}
				>
					<Text
						style={[
							styles.statusPillText,
							{ color: enabled ? EMBER : INK_DIM },
						]}
					>
						{enabled ? "ONLINE" : "OFFLINE"}
					</Text>
				</View>
				{row.adult ? (
					<View style={styles.adultPill}>
						<Text style={styles.adultPillText}>NSFW</Text>
					</View>
				) : null}
			</View>

			{/* Content column */}
			<View style={styles.cardBody}>
				<View style={[styles.cardHeadRow, { borderBottomColor: OFFLINE }]}>
					<Text
						style={[styles.cardTitle, { color: theme.text }]}
						numberOfLines={1}
					>
						{row.name || row.key || "UNTITLED SIGNAL"}
					</Text>
					<View style={styles.toggleGroup}>
						<Text style={styles.toggleLabel}>PWR</Text>
						<Switch
							value={enabled}
							onValueChange={(v) => onChange({ enabled: v })}
							trackColor={{ false: OFFLINE, true: EMBER }}
							thumbColor="#ffffff"
						/>
					</View>
				</View>

				<Field
					label="KEY"
					value={row.key}
					onChange={(v) => onChange({ key: v })}
					placeholder="heimuer"
					mono
					theme={theme}
					styles={styles}
				/>
				<Field
					label="DISPLAY NAME"
					value={row.name}
					onChange={(v) => onChange({ name: v })}
					placeholder="显示名"
					theme={theme}
					styles={styles}
				/>
				<Field
					label="API ENDPOINT"
					value={row.api}
					onChange={(v) => onChange({ api: v })}
					placeholder="https://…/api.php/provide/vod"
					mono
					theme={theme}
					styles={styles}
				/>
				<Field
					label="DETAIL · OPTIONAL"
					value={row.detail ?? ""}
					onChange={(v) => onChange({ detail: v })}
					placeholder="https://…"
					mono
					theme={theme}
					styles={styles}
				/>

				<View style={[styles.cardFooter, { borderTopColor: OFFLINE }]}>
					<View style={styles.toggleGroup}>
						<Text style={[styles.toggleLabel, { color: DANGER }]}>
							ADULT FILTER
						</Text>
						<Switch
							value={row.adult ?? false}
							onValueChange={(v) => onChange({ adult: v })}
							trackColor={{ false: OFFLINE, true: DANGER }}
							thumbColor="#ffffff"
						/>
					</View>
					<DangerButton label="EJECT" onPress={onRemove} styles={styles} />
				</View>
			</View>
		</View>
	);
}

function EmptyState({
	onAdd,
	theme,
	styles,
}: {
	onAdd: () => void;
	theme: ReturnType<typeof useTheme>;
	styles: ReturnType<typeof makeStyles>;
}) {
	return (
		<View
			style={[styles.emptyFrame, { backgroundColor: theme.backgroundElement }]}
		>
			<View style={[styles.emptyCornerTL, { borderColor: EMBER }]} />
			<View style={[styles.emptyCornerTR, { borderColor: EMBER }]} />
			<View style={[styles.emptyCornerBL, { borderColor: EMBER }]} />
			<View style={[styles.emptyCornerBR, { borderColor: EMBER }]} />

			<Text style={styles.emptySignal}>— NO SIGNAL —</Text>
			<Text style={[styles.emptyTitle, { color: theme.text }]}>
				频道尚未登记
			</Text>
			<Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
				添加一个 Apple CMS V10 频道以接收信号
			</Text>
			<PrimaryButton label="INITIATE CHANNEL" onPress={onAdd} styles={styles} />
		</View>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// Field — underline input with LED focus indicator
// ═════════════════════════════════════════════════════════════════════════════

function Field({
	label,
	value,
	onChange,
	placeholder,
	mono,
	theme,
	styles,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	mono?: boolean;
	theme: ReturnType<typeof useTheme>;
	styles: ReturnType<typeof makeStyles>;
}) {
	const [focused, setFocused] = useState(false);
	return (
		<View style={styles.field}>
			<View style={styles.fieldLabelRow}>
				<Text style={styles.fieldLabel}>{label}</Text>
				{focused ? <View style={styles.fieldLabelDot} /> : null}
			</View>
			<TextInput
				value={value}
				onChangeText={onChange}
				placeholder={placeholder}
				placeholderTextColor={INK_MUTE}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				autoCapitalize="none"
				autoCorrect={false}
				style={[
					styles.input,
					mono && styles.inputMono,
					{
						color: theme.text,
						borderBottomColor: focused ? EMBER : OFFLINE,
					},
				]}
			/>
		</View>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// Buttons
// ═════════════════════════════════════════════════════════════════════════════

function PrimaryButton({
	label,
	onPress,
	disabled,
	styles,
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	styles: ReturnType<typeof makeStyles>;
}) {
	return (
		<Pressable
			focusable
			onPress={onPress}
			disabled={disabled}
			style={({ focused, pressed }) => [
				styles.primaryBtn,
				focused && styles.primaryBtnFocus,
				pressed && styles.pressed,
				disabled && styles.disabled,
			]}
		>
			<View style={styles.btnLed} />
			<Text style={styles.primaryBtnText}>{label}</Text>
		</Pressable>
	);
}

function SecondaryButton({
	label,
	onPress,
	theme,
	styles,
}: {
	label: string;
	onPress: () => void;
	theme: ReturnType<typeof useTheme>;
	styles: ReturnType<typeof makeStyles>;
}) {
	return (
		<Pressable
			focusable
			onPress={onPress}
			style={({ focused, pressed }) => [
				styles.secondaryBtn,
				focused && styles.secondaryBtnFocus,
				pressed && styles.pressed,
			]}
		>
			<Text style={[styles.secondaryBtnText, { color: theme.text }]}>
				{label}
			</Text>
		</Pressable>
	);
}

function DangerButton({
	label,
	onPress,
	styles,
}: {
	label: string;
	onPress: () => void;
	styles: ReturnType<typeof makeStyles>;
}) {
	return (
		<Pressable
			focusable
			onPress={onPress}
			style={({ focused, pressed }) => [
				styles.dangerBtn,
				focused && styles.dangerBtnFocus,
				pressed && styles.pressed,
			]}
		>
			<Text style={styles.dangerBtnText}>{label}</Text>
		</Pressable>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════════════════════════════════════

function makeStyles(
	_theme: ReturnType<typeof useTheme>,
	scale: number,
	spacing: ReturnType<typeof useScreenDimensions>["spacing"],
) {
	const MONO = "monospace";
	return StyleSheet.create({
		container: { flex: 1 },
		scroll: {
			paddingHorizontal: spacing.six,
			gap: spacing.four,
		},

		// Header
		header: {
			gap: spacing.two,
			marginBottom: spacing.three,
			paddingVertical: spacing.three,
			borderTopWidth: 1,
			borderBottomWidth: 1,
		},
		headerTopRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: spacing.two,
		},
		bracket: {
			fontFamily: MONO,
			fontSize: 56 * scale,
			color: EMBER,
			fontWeight: "200",
		},
		title: {
			fontFamily: MONO,
			fontSize: 56 * scale,
			fontWeight: "800",
			letterSpacing: 2,
		},
		headerPulse: {
			marginLeft: "auto",
			flexDirection: "row",
			alignItems: "center",
			gap: spacing.one,
			paddingHorizontal: spacing.two,
			paddingVertical: spacing.one,
			borderWidth: 1,
			borderColor: EMBER_GLOW,
			backgroundColor: EMBER_SOFT,
			borderRadius: 2,
		},
		pulseDot: {
			width: 6 * scale,
			height: 6 * scale,
			borderRadius: 3 * scale,
			backgroundColor: EMBER,
		},
		pulseText: {
			fontFamily: MONO,
			fontSize: 11 * scale,
			fontWeight: "700",
			letterSpacing: 2,
			color: EMBER,
		},
		headerBottomRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: spacing.three,
		},
		readout: {
			fontFamily: MONO,
			fontSize: 13 * scale,
			letterSpacing: 1.5,
			color: INK_DIM,
			fontWeight: "600",
		},
		readoutDivider: {
			width: 1,
			height: 12 * scale,
			backgroundColor: OFFLINE,
		},
		subtitle: {
			fontSize: 15 * scale,
			fontWeight: "400",
			marginTop: spacing.one,
		},

		// Rack
		rack: { gap: spacing.three },

		// Card
		card: {
			flexDirection: "row",
			borderRadius: 4,
			overflow: "hidden",
			paddingRight: spacing.four,
			paddingVertical: spacing.three,
		},
		cardDim: { opacity: 0.55 },
		cardStripe: { width: 4 * scale },

		cardNumber: {
			width: 110 * scale,
			alignItems: "center",
			paddingHorizontal: spacing.two,
			gap: spacing.one,
			borderRightWidth: 1,
		},
		cardNumberLabel: {
			fontFamily: MONO,
			fontSize: 11 * scale,
			letterSpacing: 2,
			color: INK_DIM,
			fontWeight: "700",
		},
		cardNumberValue: {
			fontFamily: MONO,
			fontSize: 64 * scale,
			fontWeight: "800",
			lineHeight: 72 * scale,
			letterSpacing: -2,
		},
		statusPill: {
			paddingHorizontal: spacing.two,
			paddingVertical: 2,
			borderRadius: 2,
			borderWidth: 1,
			marginTop: spacing.one,
		},
		pillOn: {
			backgroundColor: EMBER_SOFT,
			borderColor: EMBER_GLOW,
		},
		pillOff: {
			backgroundColor: "transparent",
			borderColor: OFFLINE,
		},
		statusPillText: {
			fontFamily: MONO,
			fontSize: 10 * scale,
			fontWeight: "700",
			letterSpacing: 1.5,
		},
		adultPill: {
			paddingHorizontal: spacing.two,
			paddingVertical: 2,
			borderRadius: 2,
			backgroundColor: DANGER_SOFT,
			borderWidth: 1,
			borderColor: DANGER,
		},
		adultPillText: {
			fontFamily: MONO,
			fontSize: 10 * scale,
			fontWeight: "800",
			letterSpacing: 1.5,
			color: DANGER,
		},

		cardBody: {
			flex: 1,
			paddingLeft: spacing.four,
			gap: spacing.two,
		},
		cardHeadRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: spacing.three,
			paddingBottom: spacing.two,
			marginBottom: spacing.one,
			borderBottomWidth: 1,
		},
		cardTitle: {
			flex: 1,
			fontSize: 22 * scale,
			fontWeight: "700",
			letterSpacing: 0.3,
		},
		toggleGroup: {
			flexDirection: "row",
			alignItems: "center",
			gap: spacing.two,
		},
		toggleLabel: {
			fontFamily: MONO,
			fontSize: 11 * scale,
			letterSpacing: 2,
			fontWeight: "700",
			color: INK_DIM,
		},
		cardFooter: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: spacing.three,
			paddingTop: spacing.three,
			marginTop: spacing.one,
			borderTopWidth: 1,
		},

		// Fields
		field: { gap: spacing.half },
		fieldLabelRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: spacing.one,
		},
		fieldLabel: {
			fontFamily: MONO,
			fontSize: 10 * scale,
			letterSpacing: 2,
			fontWeight: "700",
			color: INK_DIM,
		},
		fieldLabelDot: {
			width: 4 * scale,
			height: 4 * scale,
			borderRadius: 2 * scale,
			backgroundColor: EMBER,
		},
		input: {
			borderBottomWidth: 1,
			paddingVertical: spacing.one,
			paddingHorizontal: 0,
			fontSize: 16 * scale,
		},
		inputMono: {
			fontFamily: MONO,
			fontSize: 15 * scale,
		},

		// Buttons
		primaryBtn: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: spacing.two,
			paddingVertical: spacing.three,
			paddingHorizontal: spacing.four,
			backgroundColor: EMBER,
			borderWidth: 3,
			borderColor: "transparent",
			borderRadius: 2,
		},
		primaryBtnFocus: {
			transform: [{ scale: 1.04 }],
			borderColor: EMBER_GLOW,
		},
		primaryBtnText: {
			fontFamily: MONO,
			color: "#111",
			fontSize: 16 * scale,
			fontWeight: "800",
			letterSpacing: 2,
		},
		btnLed: {
			width: 6 * scale,
			height: 6 * scale,
			borderRadius: 3 * scale,
			backgroundColor: "#111",
		},

		secondaryBtn: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: spacing.three,
			paddingHorizontal: spacing.four,
			borderWidth: 2,
			borderColor: OFFLINE,
			backgroundColor: "transparent",
			borderRadius: 2,
		},
		secondaryBtnFocus: {
			transform: [{ scale: 1.04 }],
			borderColor: EMBER,
		},
		secondaryBtnText: {
			fontFamily: MONO,
			fontSize: 15 * scale,
			fontWeight: "700",
			letterSpacing: 2,
		},

		dangerBtn: {
			paddingVertical: spacing.two,
			paddingHorizontal: spacing.four,
			borderWidth: 2,
			borderColor: DANGER,
			backgroundColor: "transparent",
			borderRadius: 2,
		},
		dangerBtnFocus: {
			backgroundColor: DANGER_SOFT,
			transform: [{ scale: 1.04 }],
		},
		dangerBtnText: {
			fontFamily: MONO,
			color: DANGER,
			fontSize: 13 * scale,
			fontWeight: "800",
			letterSpacing: 2,
		},

		pressed: { opacity: 0.85 },
		disabled: { opacity: 0.5 },

		// Empty state
		emptyFrame: {
			position: "relative",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: spacing.six,
			paddingHorizontal: spacing.five,
			gap: spacing.three,
			marginVertical: spacing.four,
		},
		emptyCornerTL: {
			position: "absolute",
			top: 0,
			left: 0,
			width: 24 * scale,
			height: 24 * scale,
			borderTopWidth: 2,
			borderLeftWidth: 2,
		},
		emptyCornerTR: {
			position: "absolute",
			top: 0,
			right: 0,
			width: 24 * scale,
			height: 24 * scale,
			borderTopWidth: 2,
			borderRightWidth: 2,
		},
		emptyCornerBL: {
			position: "absolute",
			bottom: 0,
			left: 0,
			width: 24 * scale,
			height: 24 * scale,
			borderBottomWidth: 2,
			borderLeftWidth: 2,
		},
		emptyCornerBR: {
			position: "absolute",
			bottom: 0,
			right: 0,
			width: 24 * scale,
			height: 24 * scale,
			borderBottomWidth: 2,
			borderRightWidth: 2,
		},
		emptySignal: {
			fontFamily: MONO,
			fontSize: 13 * scale,
			letterSpacing: 4,
			fontWeight: "800",
			color: EMBER,
		},
		emptyTitle: {
			fontSize: 26 * scale,
			fontWeight: "700",
			letterSpacing: 0.5,
		},
		emptyDesc: {
			fontSize: 15 * scale,
			textAlign: "center",
		},

		footer: {
			flexDirection: "row",
			gap: spacing.three,
			marginTop: spacing.four,
		},
	});
}
