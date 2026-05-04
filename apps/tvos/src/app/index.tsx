import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TVFocusGuideView } from "@/components/tv-focus-guide";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";

export default function HomeScreen() {
	const { scale, spacing } = useScreenDimensions();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const styles = useHomeStyles();

	return (
		<ScrollView
			style={[styles.scroll, { backgroundColor: theme.background }]}
			contentContainerStyle={{
				paddingTop: insets.top + spacing.four,
				paddingBottom: insets.bottom + spacing.six,
			}}
		>
			{/* Hero section */}
			<TVFocusGuideView autoFocus style={styles.heroSection}>
				<Text style={[styles.heroTitle, { color: theme.text }]}>MarsTV</Text>
				<Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
					跨平台开源影视聚合
				</Text>
			</TVFocusGuideView>

			{/* Quick links */}
			<TVFocusGuideView style={styles.quickLinks}>
				<Text style={[styles.sectionTitle, { color: theme.text }]}>
					快速入口
				</Text>
				<View style={styles.quickLinkRow}>
					<QuickLinkCard
						label="搜索"
						description="搜索影视剧、番剧"
						emoji="🔍"
						scale={scale}
						theme={theme}
					/>
					<QuickLinkCard
						label="豆瓣"
						description="排行榜和推荐"
						emoji="⭐"
						scale={scale}
						theme={theme}
					/>
					<QuickLinkCard
						label="追剧"
						description="查看订阅更新"
						emoji="❤️"
						scale={scale}
						theme={theme}
					/>
				</View>
			</TVFocusGuideView>

			{/* Instructions */}
			<TVFocusGuideView style={styles.instructions}>
				<Text style={[styles.sectionTitle, { color: theme.text }]}>
					开始使用
				</Text>
				<Text style={[styles.instructionText, { color: theme.textSecondary }]}>
					1. 前往 搜索 页面搜索你喜欢的影视剧{"\n"}
					2. 选择视频源并观看{"\n"}
					3. 在 追剧 页面查看订阅更新
				</Text>
			</TVFocusGuideView>
		</ScrollView>
	);
}

function QuickLinkCard({
	label,
	description,
	emoji,
	scale,
	theme,
}: {
	label: string;
	description: string;
	emoji: string;
	scale: number;
	theme: ReturnType<typeof useTheme>;
}) {
	const styles = useHomeStyles();

	return (
		<View
			style={[
				styles.quickLinkCard,
				{ backgroundColor: theme.backgroundElement },
			]}
		>
			<Text style={styles.quickLinkEmoji}>{emoji}</Text>
			<Text style={[styles.quickLinkLabel, { color: theme.text }]}>
				{label}
			</Text>
			<Text
				style={[styles.quickLinkDesc, { color: theme.textSecondary }]}
				numberOfLines={2}
			>
				{description}
			</Text>
		</View>
	);
}

const useHomeStyles = () => {
	const { spacing, scale } = useScreenDimensions();
	const theme = useTheme();
	return StyleSheet.create({
		scroll: {
			flex: 1,
		},
		heroSection: {
			alignItems: "center",
			paddingVertical: spacing.six,
			gap: spacing.two,
		},
		heroTitle: {
			fontSize: 52 * scale,
			fontWeight: "800",
			letterSpacing: 2,
		},
		heroSubtitle: {
			fontSize: 20 * scale,
			fontWeight: "500",
		},
		quickLinks: {
			paddingHorizontal: spacing.four,
			marginBottom: spacing.five,
		},
		sectionTitle: {
			fontSize: 26 * scale,
			fontWeight: "700",
			marginBottom: spacing.three,
		},
		quickLinkRow: {
			flexDirection: "row",
			gap: spacing.three,
			justifyContent: "center",
		},
		quickLinkCard: {
			width: 200 * scale,
			padding: spacing.four,
			borderRadius: 16 * scale,
			alignItems: "center",
			gap: spacing.two,
		},
		quickLinkEmoji: {
			fontSize: 36 * scale,
		},
		quickLinkLabel: {
			fontSize: 20 * scale,
			fontWeight: "700",
		},
		quickLinkDesc: {
			fontSize: 14 * scale,
			textAlign: "center",
		},
		instructions: {
			paddingHorizontal: spacing.four,
			marginBottom: spacing.five,
		},
		instructionText: {
			fontSize: 16 * scale,
			lineHeight: 28 * scale,
		},
	});
};
