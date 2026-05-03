import { createApiClient, searchCms, type VideoItem } from "@marstv/api";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TVCard, type TVCardItem } from "@/components/tv-card";
import { TVFocusGuideView } from "@/components/tv-focus-guide";
import { TVSearchInput } from "@/components/tv-search-input";
import { API_BASE_URL } from "@/constants/api";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";

const client = createApiClient(API_BASE_URL, { timeoutMs: 15000 });

function toCardItem(v: VideoItem): TVCardItem {
  return {
    source: v.source,
    id: v.id,
    title: v.title,
    poster: v.poster,
    category: v.category,
    year: v.year,
    remarks: v.remarks,
    rating: v.rating,
  };
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TVCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { scale, spacing } = useScreenDimensions();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useSearchScreenStyles();

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const res = await searchCms(client, "heimuer", q);
      setResults(res.list.map(toCardItem));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "搜索请求失败，请检查网络连接";
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCardPress = useCallback((item: TVCardItem) => {
    // TODO: Navigate to detail/play page for tvOS
    // router.push(`/play/${item.source}/${item.id}`);
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <TVSearchInput onSearch={handleSearch} />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            搜索中...
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.tint }]}>{error}</Text>
        </View>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            未找到 "{query}" 的相关结果
          </Text>
        </View>
      )}

      {!loading && results.length > 0 && (
        <TVFocusGuideView style={styles.resultsContainer} autoFocus>
          <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
            找到 {results.length} 个结果
          </Text>
          <View style={styles.grid}>
            {results.map((item, i) => (
              <View
                key={`${item.source}-${item.id}-${i}`}
                style={styles.cardWrapper}
              >
                <TVCard
                  item={item}
                  onPress={() => handleCardPress(item)}
                  imageProxy={`${API_BASE_URL}/api/image/cms`}
                />
              </View>
            ))}
          </View>
        </TVFocusGuideView>
      )}

      {!loading && !searched && (
        <View style={styles.center}>
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>
            输入关键词搜索影视和番剧
          </Text>
        </View>
      )}
    </View>
  );
}

const useSearchScreenStyles = () => {
  const { spacing, scale } = useScreenDimensions();
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.four,
    },
    resultsContainer: {
      flex: 1,
      paddingHorizontal: spacing.two,
    },
    resultCount: {
      fontSize: 16 * scale,
      fontWeight: "500",
      marginBottom: spacing.two,
      marginLeft: spacing.one,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
    },
    cardWrapper: {
      marginBottom: spacing.two,
    },
    loadingText: {
      fontSize: 16 * scale,
      marginTop: spacing.two,
    },
    errorText: {
      fontSize: 16 * scale,
      fontWeight: "600",
      textAlign: "center",
    },
    emptyText: {
      fontSize: 18 * scale,
      textAlign: "center",
    },
    hintText: {
      fontSize: 18 * scale,
      textAlign: "center",
    },
  });
};
