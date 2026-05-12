import { FlatList, StyleSheet, TouchableOpacity, View, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

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

const COLORS = [
  "#d4453a", "#3a8fd4", "#d43a8f", "#3ad49e",
  "#6b4fd4", "#4fd46b", "#d46b4f", "#4f8fd4",
  "#d49e3a", "#666d80", "#8fd43a", "#8b3ad4",
];

export default function CategoriesScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>全部分类</ThemedText>
      </ThemedView>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: COLORS[index % COLORS.length] + "33" }]}
            activeOpacity={0.7}
            onPress={() => router.push(`/search?q=${encodeURIComponent(item.label)}`)}
          >
            <ThemedText style={styles.cardLabel}>{item.label}</ThemedText>
          </TouchableOpacity>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "bold" },
  grid: { paddingHorizontal: 16, paddingBottom: 32 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    width: CARD_WIDTH,
    aspectRatio: 1.6,
    borderRadius: 12,
    padding: 16,
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardLabel: { fontSize: 16, fontWeight: "700" },
});
