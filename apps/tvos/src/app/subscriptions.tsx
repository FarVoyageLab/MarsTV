import {
  createApiClient,
  listSubscriptions,
  type SubscriptionRecord,
} from "@marstv/api";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TVFocusGuideView } from "@/components/tv-focus-guide";
import { API_BASE_URL } from "@/constants/api";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";

const client = createApiClient(API_BASE_URL, { timeoutMs: 10000 });

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { scale, spacing } = useScreenDimensions();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useSubStyles();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listSubscriptions(client);
      setSubscriptions(res.items ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "获取追剧列表失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <Text style={[styles.pageTitle, { color: theme.text }]}>我的追剧</Text>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            加载中...
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.tint }]}>{error}</Text>
          <Pressable
            onPress={load}
            style={({ focused }) => [
              styles.retryButton,
              { backgroundColor: theme.tint },
              focused && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && subscriptions.length === 0 && (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            还没有追剧内容
          </Text>
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>
            在首页浏览并订阅感兴趣的影视剧
          </Text>
        </View>
      )}

      {!loading && subscriptions.length > 0 && (
        <TVFocusGuideView style={styles.list} autoFocus>
          {subscriptions.map((sub, i) => (
            <SubscriptionCard
              key={`${sub.source}-${sub.id}-${i}`}
              sub={sub}
              scale={scale}
              theme={theme}
              styles={styles}
            />
          ))}
        </TVFocusGuideView>
      )}
    </View>
  );
}

function SubscriptionCard({
  sub,
  scale,
  theme,
  styles,
}: {
  sub: SubscriptionRecord;
  scale: number;
  theme: ReturnType<typeof useTheme>;
  styles: ReturnType<typeof useSubStyles>;
}) {
  const hasNew =
    sub.latestEpisodeCount > sub.knownEpisodeCount &&
    sub.latestEpisodeCount > 0;

  return (
    <Pressable
      style={({ focused }) => [
        styles.subCard,
        { borderColor: focused ? theme.tint : theme.backgroundElement },
        focused && styles.subCardFocused,
      ]}
    >
      <View style={styles.subInfo}>
        <Text
          style={[styles.subTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {sub.title}
        </Text>
        <Text style={[styles.subMeta, { color: theme.textSecondary }]}>
          {sub.sourceName ?? sub.source}
          {sub.latestEpisodeCount > 0
            ? ` · 已更新至 ${sub.latestEpisodeCount} 集`
            : ""}
        </Text>
      </View>
      <View style={styles.subBadgeArea}>
        {hasNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>
              +{sub.latestEpisodeCount - sub.knownEpisodeCount}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.subEpCount,
            {
              color: hasNew ? theme.tint : theme.textSecondary,
            },
          ]}
        >
          {sub.knownEpisodeCount}/{sub.latestEpisodeCount || "?"}
        </Text>
      </View>
    </Pressable>
  );
}

const useSubStyles = () => {
  const { spacing, scale } = useScreenDimensions();
  const theme = useTheme();
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    pageTitle: {
      fontSize: 32 * scale,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: spacing.four,
      marginTop: spacing.two,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.four,
      gap: spacing.three,
    },
    list: {
      flex: 1,
      paddingHorizontal: spacing.four,
    },
    statusText: {
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
      fontWeight: "600",
      textAlign: "center",
    },
    hintText: {
      fontSize: 14 * scale,
      textAlign: "center",
    },
    retryButton: {
      marginTop: spacing.three,
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.five,
      borderRadius: 10 * scale,
    },
    retryText: {
      color: "#ffffff",
      fontSize: 16 * scale,
      fontWeight: "700",
    },
    subCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.three,
      paddingHorizontal: spacing.four,
      marginBottom: spacing.two,
      borderRadius: 12 * scale,
      borderWidth: 2 * scale,
      backgroundColor: theme.backgroundElement,
    },
    subCardFocused: {
      transform: [{ scale: 1.02 }],
    },
    subInfo: {
      flex: 1,
      gap: spacing.half,
    },
    subTitle: {
      fontSize: 18 * scale,
      fontWeight: "600",
    },
    subMeta: {
      fontSize: 13 * scale,
    },
    subBadgeArea: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.two,
      marginLeft: spacing.three,
    },
    newBadge: {
      backgroundColor: theme.tint,
      borderRadius: 6 * scale,
      paddingHorizontal: 6 * scale,
      paddingVertical: 2 * scale,
    },
    newBadgeText: {
      color: "#ffffff",
      fontSize: 12 * scale,
      fontWeight: "700",
    },
    subEpCount: {
      fontSize: 14 * scale,
      fontWeight: "600",
    },
  });
};
