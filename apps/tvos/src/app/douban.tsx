import { createApiClient, fetchDouban, type DoubanItem } from "@marstv/api";
import React, { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TVFocusGuideView } from "@/components/tv-focus-guide";
import { API_BASE_URL } from "@/constants/api";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";

const client = createApiClient(API_BASE_URL, { timeoutMs: 20000 });

interface DoubanSection {
	title: string;
	type: "movie" | "tv";
	tag: string;
}

const SECTIONS: DoubanSection[] = [
	{ title: "热门电影", type: "movie", tag: "热门" },
	{ title: "最新电影", type: "movie", tag: "最新" },
	{ title: "高分电影", type: "movie", tag: "评分" },
	{ title: "热门剧集", type: "tv", tag: "热门" },
	{ title: "最新剧集", type: "tv", tag: "最新" },
	{ title: "高分剧集", type: "tv", tag: "评分" },
];

interface SectionData {
	section: DoubanSection;
	items: DoubanItem[];
	loading: boolean;
	error: string | null;
}

const PAGE_SIZE = 12;

export default function DoubanScreen() {
	const [sections, setSections] = useState<SectionData[]>(
		SECTIONS.map((s) => ({
			section: s,
			items: [],
			loading: true,
			error: null,
		})),
	);

	const { scale, spacing } = useScreenDimensions();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const styles = useDoubanStyles();

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			const results = await Promise.all(
				SECTIONS.map(async (section) => {
					try {
						const data = await fetchDouban(client, {
							type: section.type,
							tag: section.tag,
							pageSize: PAGE_SIZE,
						});
						return {
							section,
							items: data.items ?? [],
							loading: false,
							error: null,
						} satisfies SectionData;
					} catch (err) {
						const msg = err instanceof Error ? err.message : "获取豆瓣数据失败";
						return {
							section,
							items: [],
							loading: false,
							error: msg,
						} satisfies SectionData;
					}
				}),
			);

			if (!cancelled) {
				setSections(results);
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<ScrollView
			style={[styles.scroll, { backgroundColor: theme.background }]}
			contentContainerStyle={{ paddingTop: insets.top + spacing.two }}
		>
			<Text style={[styles.pageTitle, { color: theme.text }]}>豆瓣排行榜</Text>

			{sections.map((sec, si) => (
				<TVFocusGuideView key={si} autoFocus={si === 0} style={styles.section}>
					<Text style={[styles.sectionTitle, { color: theme.text }]}>
						{sec.section.title}
					</Text>

					{sec.loading && (
						<View style={styles.loadingRow}>
							<ActivityIndicator size="small" color={theme.tint} />
						</View>
					)}

					{sec.error && (
						<Text style={[styles.errorText, { color: theme.tint }]}>
							{sec.error}
						</Text>
					)}

					{!sec.loading && sec.items.length === 0 && !sec.error && (
						<Text style={[styles.emptyText, { color: theme.textSecondary }]}>
							暂无数据
						</Text>
					)}

					{!sec.loading && sec.items.length > 0 && (
						<View style={styles.row}>
							{sec.items.map((item, ii) => (
								<DoubanCard
									key={`${item.id}-${ii}`}
									item={item}
									scale={scale}
									theme={theme}
								/>
							))}
						</View>
					)}
				</TVFocusGuideView>
			))}
		</ScrollView>
	);
}

function DoubanCard({
	item,
	scale,
	theme,
}: {
	item: DoubanItem;
	scale: number;
	theme: ReturnType<typeof useTheme>;
}) {
	const cardWidth = 200 * scale;
	const styles = useDoubanStyles();

	return (
		<Pressable
			style={({ focused }) => [
				styles.doubanCard,
				{ width: cardWidth },
				focused && styles.doubanCardFocused,
			]}
		>
			{({ focused }) => (
				<View>
					<View
						style={[
							styles.doubanPoster,
							{ width: cardWidth, height: cardWidth * 1.4 },
							focused && { borderColor: theme.tint },
						]}
					>
						<Text style={styles.doubanPlaceholder}>{item.title[0]}</Text>
					</View>
					<Text
						style={[styles.doubanTitle, { color: theme.text }]}
						numberOfLines={2}
					>
						{item.title}
					</Text>
					{item.rate ? (
						<Text style={styles.doubanRate}>评分 {item.rate}</Text>
					) : null}
				</View>
			)}
		</Pressable>
	);
}

const useDoubanStyles = () => {
	const { spacing, scale } = useScreenDimensions();
	const theme = useTheme();
	return StyleSheet.create({
		scroll: {
			flex: 1,
		},
		pageTitle: {
			fontSize: 32 * scale,
			fontWeight: "700",
			textAlign: "center",
			marginBottom: spacing.four,
		},
		section: {
			marginBottom: spacing.five,
			paddingHorizontal: spacing.two,
		},
		sectionTitle: {
			fontSize: 24 * scale,
			fontWeight: "700",
			marginBottom: spacing.two,
			marginLeft: spacing.one,
		},
		row: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "flex-start",
		},
		loadingRow: {
			flexDirection: "row",
			justifyContent: "center",
			padding: spacing.four,
		},
		errorText: {
			fontSize: 14 * scale,
			paddingLeft: spacing.one,
		},
		emptyText: {
			fontSize: 14 * scale,
			color: theme.textSecondary,
			paddingLeft: spacing.one,
		},
		doubanCard: {
			margin: spacing.one,
			marginBottom: spacing.three,
		},
		doubanCardFocused: {
			transform: [{ scale: 1.05 }],
		},
		doubanPoster: {
			borderRadius: 10 * scale,
			backgroundColor: theme.backgroundElement,
			justifyContent: "center",
			alignItems: "center",
			overflow: "hidden",
			borderWidth: 2 * scale,
			borderColor: "transparent",
		},
		doubanPlaceholder: {
			fontSize: 32 * scale,
			fontWeight: "700",
			color: theme.textSecondary,
		},
		doubanTitle: {
			fontSize: 14 * scale,
			fontWeight: "600",
			marginTop: 6 * scale,
			textAlign: "center",
			maxWidth: 200 * scale,
		},
		doubanRate: {
			fontSize: 12 * scale,
			color: "#ffaa00",
			fontWeight: "600",
			textAlign: "center",
			marginTop: 2 * scale,
		},
	});
};
