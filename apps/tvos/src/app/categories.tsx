import React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TVFocusGuideView } from "@/components/tv-focus-guide";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";

const CATEGORIES = [
  { id: "action", label: "🎬 动作" },
  { id: "scifi", label: "🚀 科幻" },
  { id: "comedy", label: "😂 喜剧" },
  { id: "drama", label: "🎭 剧情" },
  { id: "horror", label: "👻 恐怖" },
  { id: "adventure", label: "🏕️ 冒险" },
  { id: "romance", label: "💕 爱情" },
  { id: "mystery", label: "🕵️ 悬疑" },
  { id: "anime", label: "🎌 动漫" },
  { id: "documentary", label: "📽️ 纪录" },
  { id: "music", label: "🎵 音乐" },
  { id: "other", label: "🎲 其他" },
];

const CARD_COLORS = [
  "#d4453a33", "#3a8fd433", "#d43a8f33", "#3ad49e33",
  "#6b4fd433", "#4fd46b33", "#d46b4f33", "#4f8fd433",
  "#d49e3a33", "#666d8033", "#8fd43a33", "#8b3ad433",
];

export default function CategoriesScreen() {
  const { scale, spacing } = useScreenDimensions();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.four,
        paddingHorizontal: spacing.four,
        paddingBottom: insets.bottom + spacing.six,
      }}
    >
      <Text style={{ fontSize: 32 * scale, fontWeight: "800", color: theme.text, marginBottom: spacing.four }}>
        全部分类
      </Text>
      <TVFocusGuideView>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.two }}>
          {CATEGORIES.map((cat, idx) => (
            <Pressable
              key={cat.id}
              style={({ focused }) => ({
                width: 180 * scale,
                aspectRatio: 1.6,
                borderRadius: 12 * scale,
                padding: spacing.three,
                justifyContent: "flex-end",
                backgroundColor: CARD_COLORS[idx % CARD_COLORS.length],
                borderWidth: focused ? 3 : 1,
                borderColor: focused ? theme.tint : theme.backgroundElement,
                transform: [{ scale: focused ? 1.05 : 1 }],
              })}
              onPress={() => router.push(`/search?q=${encodeURIComponent(cat.label)}`)}
            >
              <Text style={{ fontSize: 18 * scale, fontWeight: "700", color: theme.text }}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </TVFocusGuideView>
    </ScrollView>
  );
}
