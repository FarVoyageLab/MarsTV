import { useState, useEffect, useCallback } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { localStorageBackend } from "@marstv/core";
import type { PlayRecord, FavoriteRecord } from "@marstv/core";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

type TabKey = "history" | "favorites";

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("history");

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>片库</ThemedText>
      </ThemedView>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.tabActive]}
          onPress={() => setActiveTab("history")}
        >
          <ThemedText style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
            观看历史
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "favorites" && styles.tabActive]}
          onPress={() => setActiveTab("favorites")}
        >
          <ThemedText style={[styles.tabText, activeTab === "favorites" && styles.tabTextActive]}>
            我的收藏
          </ThemedText>
        </TouchableOpacity>
      </View>
      {activeTab === "history" ? <HistoryTab /> : <FavoritesTab />}
    </ThemedView>
  );
}

function HistoryTab() {
  const router = useRouter();
  const [records, setRecords] = useState<PlayRecord[] | null>(null);

  useEffect(() => {
    localStorageBackend.listPlayRecords().then(setRecords);
  }, []);

  if (records === null) {
    return <ActivityIndicator size="large" color="rgba(150,150,150,0.6)" style={{ marginTop: 40 }} />;
  }

  if (records.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText style={styles.emptyText}>暂无观看历史</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={(item) => `${item.source}:${item.id}`}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.historyItem}
          activeOpacity={0.7}
          onPress={() => router.push(`/play/${item.source}/${item.id}?line=${item.lineIdx}&ep=${item.epIdx}`)}
        >
          <View style={styles.historyPoster}>
            <ThemedText style={styles.historyPosterText}>{(item.title ?? "?").charAt(0)}</ThemedText>
          </View>
          <View style={styles.historyInfo}>
            <ThemedText style={styles.historyTitle} numberOfLines={1}>{item.title}</ThemedText>
            <ThemedText style={styles.historyMeta}>
              {item.lineName ? `${item.lineName} · ` : ""}第 {item.epIdx + 1} 集
            </ThemedText>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

function FavoritesTab() {
  const router = useRouter();
  const [records, setRecords] = useState<FavoriteRecord[] | null>(null);

  useEffect(() => {
    localStorageBackend.listFavorites().then(setRecords);
  }, []);

  if (records === null) {
    return <ActivityIndicator size="large" color="rgba(150,150,150,0.6)" style={{ marginTop: 40 }} />;
  }

  if (records.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText style={styles.emptyText}>还没有收藏</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={(item) => `${item.source}:${item.id}`}
      numColumns={3}
      contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
      columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.favCard}
          activeOpacity={0.7}
          onPress={() => router.push(`/detail/${item.source}/${item.id}`)}
        >
          <View style={styles.favPoster}>
            <ThemedText style={styles.favPosterText}>{(item.title ?? "?").charAt(0)}</ThemedText>
          </View>
          <ThemedText style={styles.favTitle} numberOfLines={1}>{item.title}</ThemedText>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "bold" },
  tabs: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tabActive: { backgroundColor: "oklch(55% 0.22 22)", borderColor: "oklch(55% 0.22 22)" },
  tabText: { fontSize: 14, opacity: 0.6 },
  tabTextActive: { opacity: 1, color: "#fff", fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  emptyText: { fontSize: 14, opacity: 0.5 },
  historyItem: {
    flexDirection: "row", gap: 12, padding: 12,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, marginBottom: 8,
  },
  historyPoster: {
    width: 80, aspectRatio: 1.6, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  historyPosterText: { fontSize: 18, fontWeight: "700" },
  historyInfo: { flex: 1, justifyContent: "center" },
  historyTitle: { fontSize: 14, fontWeight: "600" },
  historyMeta: { fontSize: 11, opacity: 0.5, marginTop: 2 },
  favCard: { flex: 1, maxWidth: "33%" },
  favPoster: {
    aspectRatio: 2/3, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  favPosterText: { fontSize: 24, fontWeight: "700" },
  favTitle: { fontSize: 11, marginTop: 6, textAlign: "center" },
});
