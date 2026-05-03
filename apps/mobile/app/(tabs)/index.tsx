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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { PlayRecord, VideoItem } from "@marstv/api";
import { listPlayRecords, searchCms } from "@marstv/api";

import { VideoCard } from "@/components/video-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { api } from "@/lib/api";
import { SOURCE_KEYS, hasSources } from "@/lib/sources";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SourceSection {
  type: "source";
  title: string;
  data: VideoItem[];
}

interface ContinueWatchingSection {
  type: "continue";
  title: string;
  data: PlayRecord[];
}

type Section = SourceSection | ContinueWatchingSection;

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [playRecordsResult, ...sourceResults] = await Promise.allSettled([
        listPlayRecords(api),
        ...SOURCE_KEYS.map((key) => searchCms(api, key, "", 1)),
      ]);

      const newSections: Section[] = [];

      // Continue watching section
      if (
        playRecordsResult.status === "fulfilled" &&
        playRecordsResult.value.items.length > 0
      ) {
        newSections.push({
          type: "continue",
          title: "继续观看",
          data: playRecordsResult.value.items,
        });
      }

      // Source sections
      for (let i = 0; i < SOURCE_KEYS.length; i++) {
        const result = sourceResults[i];
        if (result.status === "fulfilled" && result.value.list.length > 0) {
          newSections.push({
            type: "source",
            title: `${SOURCE_KEYS[i]} · 最新`,
            data: result.value.list.slice(0, 12),
          });
        }
      }

      if (newSections.length === 0) {
        setError("暂无内容，请确认服务端已配置 CMS 源");
      }

      setSections(newSections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败，请检查网络连接");
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

  // ── Render helpers ────────────────────────────────────────────────────

  const renderHeader = () => (
    <ThemedView style={styles.header}>
      <View style={styles.headerRow}>
        <View>
          <ThemedText style={styles.brand}>MarsTV</ThemedText>
          <ThemedText style={styles.tagline}>更快、更好看、全端可用</ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/modal")}
          style={styles.aboutButton}
        >
          <Ionicons
            name="information-circle-outline"
            size={24}
            color="rgba(150,150,150,0.8)"
          />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  const renderListHeader = () => (
    <View>
      {renderHeader()}
      {!hasSources && !loading ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="settings-outline"
            size={48}
            color="rgba(150,150,150,0.4)"
          />
          <ThemedText style={styles.emptyTitle}>未配置源站</ThemedText>
          <ThemedText style={styles.emptyDesc}>
            请设置 EXPO_PUBLIC_SOURCE_KEYS 环境变量，例如：heimuer,zym
          </ThemedText>
        </View>
      ) : null}
    </View>
  );

  const renderSectionHeader = (section: Section) => {
    if (section.type === "continue") {
      return (
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
        </View>
      );
    }
    return (
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
      </View>
    );
  };

  const renderContinueItem = (item: PlayRecord) => (
    <TouchableOpacity
      key={`${item.source}:${item.id}`}
      style={styles.continueCard}
      activeOpacity={0.7}
      onPress={() =>
        router.push(
          `/play/${encodeURIComponent(item.source)}/${encodeURIComponent(item.id)}?line=${item.lineIdx}&ep=${item.epIdx}`,
        )
      }
    >
      <View style={styles.continuePoster}>
        <Text style={styles.continueTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.continueMeta}>
          {item.lineName ?? `线路 ${item.lineIdx + 1}`} · 第 {item.epIdx + 1} 集
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderGridItem = (item: VideoItem) => (
    <VideoCard
      key={`${item.source}:${item.id}`}
      item={item}
      onPress={() =>
        router.push(
          `/play/${encodeURIComponent(item.source)}/${encodeURIComponent(item.id)}`,
        )
      }
    />
  );

  const renderSection = ({ item }: { item: Section }) => {
    if (!item.data.length) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader(item)}

        {item.type === "continue" ? (
          <View style={styles.continueRow}>
            {(item.data as PlayRecord[]).map(renderContinueItem)}
          </View>
        ) : (
          <View style={styles.grid}>
            {(item.data as VideoItem[]).map(renderGridItem)}
          </View>
        )}
      </View>
    );
  };

  // ── States ────────────────────────────────────────────────────────────

  if (loading && sections.length === 0) {
    return (
      <ThemedView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="rgba(150,150,150,0.6)" />
          <ThemedText style={styles.loadingText}>加载中…</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error && sections.length === 0) {
    return (
      <ThemedView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorState}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color="rgba(200,100,100,0.6)"
          />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
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
        keyExtractor={(item) =>
          `${item.type}:${"title" in item ? item.title : ""}`
        }
        renderItem={renderSection}
        ListHeaderComponent={renderListHeader}
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
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: {
    fontSize: 28,
    fontWeight: "bold",
  },
  tagline: {
    fontSize: 13,
    opacity: 0.5,
    marginTop: 2,
  },
  aboutButton: {
    padding: 4,
  },
  // Section
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  // Continue watching
  continueRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  continueCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: 14,
  },
  continuePoster: {
    gap: 4,
  },
  continueTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  continueMeta: {
    fontSize: 11,
    color: "rgba(150,150,150,0.7)",
  },
  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
  },
  // Loading
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.5,
  },
  // Error
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  errorText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 20,
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.6,
  },
  emptyDesc: {
    fontSize: 13,
    opacity: 0.4,
    textAlign: "center",
    lineHeight: 18,
  },
});
