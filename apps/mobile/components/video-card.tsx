import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { VideoItem } from "@marstv/api";
import { API_BASE_URL } from "@/lib/api";

interface Props {
	item: VideoItem;
	onPress?: () => void;
	/** Whether to show the source badge. */
	showSourceBadge?: boolean;
}

export function VideoCard({ item, onPress, showSourceBadge = true }: Props) {
	const posterUrl = item.poster
		? `${API_BASE_URL}/api/image/cms?u=${encodeURIComponent(item.poster)}`
		: null;

	return (
		<TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
			<View style={styles.posterContainer}>
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
				{item.remarks ? (
					<View style={styles.remarksBadge}>
						<Text style={styles.remarksText} numberOfLines={1}>
							{item.remarks}
						</Text>
					</View>
				) : null}
			</View>
			<View style={styles.info}>
				<Text style={styles.title} numberOfLines={2}>
					{item.title}
				</Text>
				<View style={styles.meta}>
					<Text style={styles.metaText} numberOfLines={1}>
						{[item.year, item.area, item.category]
							.filter(Boolean)
							.join(" · ") || "—"}
					</Text>
					{showSourceBadge ? (
						<View style={styles.sourceBadge}>
							<Text style={styles.sourceText}>{item.source}</Text>
						</View>
					) : null}
				</View>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		flex: 1,
		backgroundColor: "rgba(255,255,255,0.05)",
		borderRadius: 12,
		overflow: "hidden",
	},
	posterContainer: {
		aspectRatio: 2 / 3,
		width: "100%",
		backgroundColor: "rgba(0,0,0,0.3)",
		position: "relative",
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
		fontSize: 12,
		color: "rgba(150,150,150,0.6)",
	},
	remarksBadge: {
		position: "absolute",
		top: 6,
		right: 6,
		backgroundColor: "rgba(0,0,0,0.7)",
		borderRadius: 6,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	remarksText: {
		fontSize: 10,
		color: "#fff",
		fontWeight: "600",
	},
	info: {
		padding: 10,
		gap: 4,
	},
	title: {
		fontSize: 13,
		fontWeight: "600",
		color: "#fff",
		lineHeight: 18,
	},
	meta: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 4,
	},
	metaText: {
		fontSize: 10,
		color: "rgba(150,150,150,0.8)",
		flex: 1,
	},
	sourceBadge: {
		backgroundColor: "rgba(255,255,255,0.1)",
		borderRadius: 4,
		paddingHorizontal: 5,
		paddingVertical: 1,
	},
	sourceText: {
		fontSize: 9,
		color: "rgba(150,150,150,0.7)",
	},
});
