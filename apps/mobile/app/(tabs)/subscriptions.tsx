import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	RefreshControl,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { SubscriptionRecord } from "@marstv/api";
import { listSubscriptions, removeSubscription } from "@marstv/api";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { api, API_BASE_URL } from "@/lib/api";

// ─── Component ───────────────────────────────────────────────────────────────

export default function SubscriptionsScreen() {
	const [refreshing, setRefreshing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [items, setItems] = useState<SubscriptionRecord[]>([]);

	const fetchData = useCallback(async () => {
		try {
			setError(null);
			const data = await listSubscriptions(api);
			setItems(data.items ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "加载订阅列表失败");
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

	const handleRemove = useCallback(
		(source: string, id: string, title: string) => {
			Alert.alert("取消追剧", `确定不再追《${title}》？`, [
				{ text: "取消", style: "cancel" },
				{
					text: "确定",
					style: "destructive",
					onPress: async () => {
						try {
							await removeSubscription(api, source, id);
							setItems((prev) =>
								prev.filter((it) => it.source !== source || it.id !== id),
							);
						} catch {
							Alert.alert("操作失败", "请稍后重试");
						}
					},
				},
			]);
		},
		[],
	);

	// ── Render ────────────────────────────────────────────────────────────

	const renderHeader = () => (
		<ThemedView style={styles.header}>
			<ThemedText style={styles.title}>追剧</ThemedText>
			<ThemedText style={styles.subtitle}>
				{items.length > 0 ? `共 ${items.length} 部剧集` : "管理你的追剧列表"}
			</ThemedText>
		</ThemedView>
	);

	const renderItem = ({ item }: { item: SubscriptionRecord }) => {
		const newCount = Math.max(
			0,
			item.latestEpisodeCount - item.knownEpisodeCount,
		);
		const posterUrl = item.poster
			? `${API_BASE_URL}/api/image/cms?u=${encodeURIComponent(item.poster)}`
			: null;

		return (
			<TouchableOpacity
				style={styles.item}
				activeOpacity={0.7}
				onPress={() => {
					// Navigation will be handled by expo-router linking
				}}
			>
				<View style={styles.itemPoster}>
					{posterUrl ? (
						<Image
							source={{ uri: posterUrl }}
							style={styles.poster}
							contentFit="cover"
							transition={200}
						/>
					) : (
						<View style={styles.posterPlaceholder}>
							<Text style={styles.placeholderText}>无封面</Text>
						</View>
					)}
				</View>
				<View style={styles.itemInfo}>
					<Text style={styles.itemTitle} numberOfLines={1}>
						{item.title}
					</Text>
					<Text style={styles.itemMeta} numberOfLines={1}>
						{item.sourceName ?? item.source} · 共 {item.latestEpisodeCount} 集
					</Text>
					{newCount > 0 ? (
						<View style={styles.newBadge}>
							<Text style={styles.newBadgeText}>+{newCount} 新集</Text>
						</View>
					) : null}
				</View>
				<TouchableOpacity
					style={styles.removeButton}
					onPress={() => handleRemove(item.source, item.id, item.title)}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				>
					<Ionicons
						name="close-outline"
						size={20}
						color="rgba(150,150,150,0.5)"
					/>
				</TouchableOpacity>
			</TouchableOpacity>
		);
	};

	// ── States ────────────────────────────────────────────────────────────

	if (loading && items.length === 0) {
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

	if (error && items.length === 0) {
		return (
			<ThemedView style={styles.container}>
				{renderHeader()}
				<View style={styles.centerState}>
					<Ionicons
						name="cloud-offline-outline"
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
				data={items}
				keyExtractor={(item) => `${item.source}:${item.id}`}
				renderItem={renderItem}
				ListHeaderComponent={renderHeader}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<Ionicons
							name="heart-outline"
							size={48}
							color="rgba(150,150,150,0.2)"
						/>
						<ThemedText style={styles.emptyTitle}>还没有追剧</ThemedText>
						<ThemedText style={styles.emptyDesc}>
							在视频详情页点击追剧按钮，新集更新时将会通知你
						</ThemedText>
					</View>
				}
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
		flexGrow: 1,
	},
	// Header
	header: {
		paddingTop: 64,
		paddingHorizontal: 20,
		paddingBottom: 16,
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
	// Item
	item: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 12,
		gap: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(150,150,150,0.15)",
	},
	itemPoster: {
		width: 56,
		height: 80,
		borderRadius: 6,
		overflow: "hidden",
		backgroundColor: "rgba(0,0,0,0.3)",
	},
	poster: {
		width: "100%",
		height: "100%",
	},
	posterPlaceholder: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	placeholderText: {
		fontSize: 10,
		color: "rgba(150,150,150,0.4)",
	},
	itemInfo: {
		flex: 1,
		gap: 4,
	},
	itemTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: "#fff",
	},
	itemMeta: {
		fontSize: 12,
		color: "rgba(150,150,150,0.6)",
	},
	newBadge: {
		alignSelf: "flex-start",
		backgroundColor: "rgba(200,80,80,0.2)",
		borderRadius: 4,
		paddingHorizontal: 6,
		paddingVertical: 1,
		marginTop: 2,
	},
	newBadgeText: {
		fontSize: 10,
		color: "#e06060",
		fontWeight: "600",
	},
	removeButton: {
		padding: 4,
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
	// Empty
	emptyState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		paddingHorizontal: 32,
		paddingVertical: 48,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: "600",
		opacity: 0.5,
	},
	emptyDesc: {
		fontSize: 13,
		opacity: 0.35,
		textAlign: "center",
		lineHeight: 18,
	},
});
