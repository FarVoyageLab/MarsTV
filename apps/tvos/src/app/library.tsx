import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { localStorageBackend } from "@marstv/core";
import type { PlayRecord, FavoriteRecord } from "@marstv/core";

import { TVFocusGuideView } from "@/components/tv-focus-guide";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";

type TabKey = "history" | "favorites";

export default function LibraryScreen() {
  const { scale, spacing } = useScreenDimensions();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("history");
  const [records, setRecords] = useState<PlayRecord[] | FavoriteRecord[] | null>(null);

  useEffect(() => {
    setRecords(null);
    if (activeTab === "history") {
      localStorageBackend.listPlayRecords().then(setRecords);
    } else {
      localStorageBackend.listFavorites().then(setRecords);
    }
  }, [activeTab]);

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
        片库
      </Text>

      {/* Tab switcher */}
      <View style={{ flexDirection: "row", gap: spacing.two, marginBottom: spacing.four }}>
        {(["history", "favorites"] as TabKey[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={({ focused }) => ({
                paddingHorizontal: spacing.three,
                paddingVertical: spacing.one,
                borderRadius: 20 * scale,
                borderWidth: focused ? 2 : 1,
                borderColor: active ? theme.tint : theme.backgroundElement,
                backgroundColor: active ? theme.tint + "22" : "transparent",
                transform: [{ scale: focused ? 1.05 : 1 }],
              })}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={{ fontSize: 14 * scale, fontWeight: "600", color: active ? theme.tint : theme.textSecondary }}>
                {tab === "history" ? "观看历史" : "我的收藏"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {records === null ? (
        <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 40 }} />
      ) : records.length === 0 ? (
        <Text style={{ fontSize: 16 * scale, color: theme.textSecondary, textAlign: "center", marginTop: 40 }}>
          {activeTab === "history" ? "暂无观看历史" : "还没有收藏"}
        </Text>
      ) : (
        <TVFocusGuideView>
          <View style={{ gap: spacing.two }}>
            {records.map((item) => {
              const isHistory = "lineIdx" in item;
              const key = `${item.source}:${item.id}`;
              return (
                <Pressable
                  key={key}
                  style={({ focused }) => ({
                    flexDirection: "row",
                    gap: spacing.two,
                    padding: spacing.two,
                    backgroundColor: theme.backgroundElement,
                    borderRadius: 12 * scale,
                    borderWidth: focused ? 2 : 0,
                    borderColor: theme.tint,
                    transform: [{ scale: focused ? 1.03 : 1 }],
                  })}
                  onPress={() => {
                    if (isHistory) {
                      router.push(`/play/${item.source}/${item.id}?line=${item.lineIdx}&ep=${item.epIdx}`);
                    } else {
                      router.push(`/detail/${item.source}/${item.id}`);
                    }
                  }}
                >
                  <View style={{
                    width: 100 * scale, aspectRatio: 1.6, borderRadius: 8 * scale,
                    backgroundColor: theme.backgroundSelected,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 18 * scale, fontWeight: "700", color: theme.text }}>
                      {(item.title ?? "?").charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text style={{ fontSize: 16 * scale, fontWeight: "600", color: theme.text }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 12 * scale, color: theme.textSecondary, marginTop: 4 }}>
                      {isHistory ? `${item.lineName ?? ""} · 第${item.epIdx + 1}集` : "已收藏"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </TVFocusGuideView>
      )}
    </ScrollView>
  );
}
