import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { DoubanItem } from "@marstv/api";
import { fetchDouban } from "@marstv/api";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { api, API_BASE_URL } from "@/lib/api";

// ─── Douban category config ──────────────────────────────────────────────────

interface DoubanCategory {
	type: "movie" | "tv";
	tag: string;
	title: string;
}

const CATEGORIES: DoubanCategory[] = [
	{ type: "movie", tag: "热门", title: "热门电影" },
	{ type: "movie", tag: "最新", title: "最新电影" },
	{ type: "tv", tag: "热门", title: "热门电视剧" },
	{ type: "tv", tag: "最新", title: "最新电视剧" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function DoubanScreen() {
	const [refreshing, setRefreshing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sections, setSections] = useState<
		{ category: DoubanCategory; items: DoubanItem[] }[]
	>([]);

	const fetchData = useCallback(async () => {
		try {
			setError(null);

			const results = await Promise.allSettled(
				CATEGORIES.map((cat) =>
					fetchDouban(api, { type: cat.type, tag: cat.tag, pageSize: 12 }),
				),
			);

			const newSections: { category: DoubanCategory; items: DoubanItem[] }[] =
				[];

			for (let i = 0; i < CATEGORIES.length; i++) {
				const result = results[i];
				if (result.status === "fulfilled" && result.value.items.length > 0) {
					newSections.push({
						category: CATEGORIES[i],
						items: result.value.items,
					});
				}
			}

			if (newSections.length === 0) {
				setError("豆瓣数据暂不可用");
			}

			setSections(newSections);
		} catch (err) {
			setError(err instanceof Error ? err.message : "加载豆瓣数据失败");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchData();
	}, [fetchData]);

	// ── Render ────────────────────────────────────────────────────────────

	const renderHeader = () => (
		<ThemedView style={styles.header}>
			<ThemedText style={styles.title}>豆瓣排行</ThemedText>
			<ThemedText style={styles.subtitle}>热门影视排行榜</ThemedText>
		</ThemedView>
	);

	const renderSection = (category: DoubanCategory, items: DoubanItem[]) => (
		<View key={`${category.type}:${category.tag}`} style={styles.section}>
			<View style={styles.sectionHeader}>
				<ThemedText style={styles.sectionTitle}>{category.title}</ThemedText>
				<ThemedText style={styles.sectionMeta}>
					豆瓣 · {category.tag}
				</ThemedText>
			</View>
			<View style={styles.row}>
				{items.map((item) => (
					<TouchableOpacity
						key={item.id}
						style={styles.card}
						activeOpacity={0.7}
					>
						<View style={styles.cardPoster}>
							<Image
								source={{
									uri: `${API_BASE_URL}/api/image/douban?u=${encodeURIComponent(item.cover)}`,
								}}
								style={styles.poster}
								contentFit="cover"
								transition={200}
							/>
							{item.rate ? (
								<View style={styles.rateBadge}>
									<Text style={styles.rateText}>{item.rate}</Text>
								</View>
							) : null}
							{item.isNew ? (
								<View style={styles.newBadge}>
									<Text style={styles.newText}>新</Text>
								</View>
							) : null}
						</View>
						<Text style={styles.cardTitle} numberOfLines={1}>
							{item.title}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);

	// ── States ────────────────────────────────────────────────────────────

	if (loading && sections.length === 0) {
		return (
			<ThemedView style={styles.container}>
				{renderHeader()}
				<View style={styles.centerState}>
					<ActivityIndicator size="large" color="rgba(150,150,150,0.6)" />
					<ThemedText style={styles.stateText}>加载中…</ThemedText>
				</View>
			</ThemedView>
		);
	}

	if (error && sections.length === 0) {
		return (
			<ThemedView style={styles.container}>
				{renderHeader()}
				<View style={styles.centerState}>
					<Ionicons
						name="alert-circle-outline"
						size={40}
						color="rgba(200,100,100,0.6)"
					/>
					<ThemedText style={styles.stateText}>{error}</ThemedText>
					<TouchableOpacity style={styles.retryButton} onPress={fetchData}>
						<ThemedText style={styles.retryText}>重试</ThemedText>
					</TouchableOpacity>
				</View>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<FlatList
				data={sections}
				keyExtractor={(item) => `${item.category.type}:${item.category.tag}`}
				renderItem={({ item }) => renderSection(item.category, item.items)}
				ListHeaderComponent={renderHeader}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor="rgba(150,150,150,0.6)"
					/>
				}
				contentContainerStyle={styles.scrollContent}
			/>
		</ThemedView>
	);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 32,
	},
	// Header
	header: {
		paddingTop: 64,
		paddingHorizontal: 20,
		paddingBottom: 8,
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
	},
	subtitle: {
		fontSize: 13,
		opacity: 0.5,
		marginTop: 2,
	},
	// Section
	section: {
		marginTop: 8,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "baseline",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 12,
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: "600",
	},
	sectionMeta: {
		fontSize: 11,
		opacity: 0.4,
	},
	// Row
	row: {
		flexDirection: "row",
		flexWrap: "wrap",
		paddingHorizontal: 12,
		gap: 10,
	},
	// Card
	card: {
		width: "23%",
		minWidth: 100,
		flexGrow: 1,
		flexBasis: 0,
	},
	cardPoster: {
		aspectRatio: 2 / 3,
		width: "100%",
		borderRadius: 8,
		overflow: "hidden",
		backgroundColor: "rgba(0,0,0,0.3)",
		position: "relative",
	},
	poster: {
		width: "100%",
		height: "100%",
	},
	rateBadge: {
		position: "absolute",
		bottom: 4,
		right: 4,
		backgroundColor: "rgba(0,0,0,0.65)",
		borderRadius: 4,
		paddingHorizontal: 5,
		paddingVertical: 1,
	},
	rateText: {
		fontSize: 10,
		color: "#f5c842",
		fontWeight: "700",
	},
	newBadge: {
		position: "absolute",
		top: 4,
		left: 4,
		backgroundColor: "rgba(200,80,80,0.8)",
		borderRadius: 4,
		paddingHorizontal: 5,
		paddingVertical: 1,
	},
	newText: {
		fontSize: 9,
		color: "#fff",
		fontWeight: "700",
	},
	cardTitle: {
		fontSize: 11,
		color: "#fff",
		marginTop: 4,
		opacity: 0.8,
	},
	// States
	centerState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		paddingHorizontal: 32,
		paddingBottom: 80,
	},
	stateText: {
		fontSize: 14,
		opacity: 0.5,
		textAlign: "center",
	},
	retryButton: {
		marginTop: 8,
		paddingHorizontal: 24,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "rgba(150,150,150,0.3)",
	},
	retryText: {
		fontSize: 14,
		opacity: 0.7,
	},
});
