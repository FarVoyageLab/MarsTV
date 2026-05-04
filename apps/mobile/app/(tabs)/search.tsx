import { useState, useCallback } from "react";
import {
	ActivityIndicator,
	FlatList,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { VideoItem } from "@marstv/api";
import { searchCms } from "@marstv/api";

import { VideoCard } from "@/components/video-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { api, API_BASE_URL } from "@/lib/api";

export default function SearchScreen() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<VideoItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searched, setSearched] = useState(false);

	const handleSearch = useCallback(async () => {
		const q = query.trim();
		if (!q) return;

		setLoading(true);
		setError(null);
		setSearched(true);

		try {
			// Search across all configured sources via the server API.
			// The server-side /api/search endpoint broadcasts to all sources.
			const data = await searchCms(api, "all", q, 1);
			setResults(data.list ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "搜索失败，请重试");
			setResults([]);
		} finally {
			setLoading(false);
		}
	}, [query]);

	return (
		<ThemedView style={styles.container}>
			{/* Header */}
			<ThemedView style={styles.header}>
				<ThemedText style={styles.title}>搜索</ThemedText>
			</ThemedView>

			{/* Search bar */}
			<View style={styles.searchBar}>
				<View style={styles.inputContainer}>
					<Ionicons
						name="search-outline"
						size={18}
						color="rgba(150,150,150,0.5)"
						style={styles.inputIcon}
					/>
					<TextInput
						style={styles.input}
						placeholder="搜索影视剧、番剧、综艺…"
						placeholderTextColor="rgba(150,150,150,0.4)"
						value={query}
						onChangeText={setQuery}
						onSubmitEditing={handleSearch}
						returnKeyType="search"
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{query.length > 0 ? (
						<TouchableOpacity onPress={() => setQuery("")}>
							<Ionicons
								name="close-circle"
								size={18}
								color="rgba(150,150,150,0.4)"
							/>
						</TouchableOpacity>
					) : null}
				</View>
				<TouchableOpacity
					style={[
						styles.searchButton,
						query.trim().length === 0 && styles.searchButtonDisabled,
					]}
					onPress={handleSearch}
					disabled={query.trim().length === 0}
				>
					<ThemedText
						style={[
							styles.searchButtonText,
							query.trim().length === 0 && styles.searchButtonTextDisabled,
						]}
					>
						搜索
					</ThemedText>
				</TouchableOpacity>
			</View>

			{/* Content */}
			{loading ? (
				<View style={styles.centerState}>
					<ActivityIndicator size="large" color="rgba(150,150,150,0.6)" />
					<ThemedText style={styles.stateText}>搜索中…</ThemedText>
				</View>
			) : error ? (
				<View style={styles.centerState}>
					<Ionicons
						name="alert-circle-outline"
						size={40}
						color="rgba(200,100,100,0.6)"
					/>
					<ThemedText style={styles.stateText}>{error}</ThemedText>
				</View>
			) : searched && results.length === 0 ? (
				<View style={styles.centerState}>
					<Ionicons
						name="search-outline"
						size={48}
						color="rgba(150,150,150,0.3)"
					/>
					<ThemedText style={styles.stateText}>未找到相关内容</ThemedText>
				</View>
			) : !searched ? (
				<View style={styles.centerState}>
					<Ionicons
						name="search-outline"
						size={48}
						color="rgba(150,150,150,0.2)"
					/>
					<ThemedText style={styles.hintText}>
						输入关键词搜索影视内容
					</ThemedText>
				</View>
			) : (
				<FlatList
					data={results}
					keyExtractor={(item) => `${item.source}:${item.id}`}
					renderItem={({ item }) => (
						<VideoCard
							item={item}
							onPress={() => {
								// Navigation will be handled by expo-router linking
							}}
						/>
					)}
					numColumns={2}
					columnWrapperStyle={styles.gridRow}
					contentContainerStyle={styles.gridContent}
					ListHeaderComponent={
						<ThemedText style={styles.resultCount}>
							找到 {results.length} 个结果
						</ThemedText>
					}
				/>
			)}
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingTop: 64,
		paddingHorizontal: 20,
		paddingBottom: 8,
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
	},
	// Search bar
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 10,
	},
	inputContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.08)",
		borderRadius: 10,
		paddingHorizontal: 12,
		height: 42,
		gap: 8,
	},
	inputIcon: {
		marginRight: 2,
	},
	input: {
		flex: 1,
		fontSize: 15,
		color: "#fff",
		height: 42,
		padding: 0,
	},
	searchButton: {
		backgroundColor: "rgba(10,126,164,0.8)",
		borderRadius: 10,
		paddingHorizontal: 18,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
	},
	searchButtonDisabled: {
		backgroundColor: "rgba(150,150,150,0.15)",
	},
	searchButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
	},
	searchButtonTextDisabled: {
		color: "rgba(150,150,150,0.4)",
	},
	// Results
	gridContent: {
		paddingHorizontal: 12,
		paddingBottom: 32,
	},
	gridRow: {
		gap: 10,
		marginBottom: 10,
	},
	resultCount: {
		fontSize: 12,
		opacity: 0.5,
		paddingHorizontal: 8,
		paddingVertical: 10,
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
	hintText: {
		fontSize: 14,
		opacity: 0.35,
		textAlign: "center",
	},
});
