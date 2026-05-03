import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from "expo-router/ui";
import { SymbolView } from "expo-symbols";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Colors, MaxContentWidth } from "@/constants/theme";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";

const TAB_ICONS: Record<string, { ios: string; web: string }> = {
  index: { ios: "house.fill", web: "house.fill" },
  search: { ios: "magnifyingglass", web: "magnifyingglass" },
  douban: { ios: "star.fill", web: "star.fill" },
  subscriptions: { ios: "heart.fill", web: "heart.fill" },
};

const TAB_LABELS: Record<string, string> = {
  index: "首页",
  search: "搜索",
  douban: "豆瓣",
  subscriptions: "追剧",
};

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>index</TabButton>
          </TabTrigger>
          <TabTrigger name="search" href="/search" asChild>
            <TabButton>search</TabButton>
          </TabTrigger>
          <TabTrigger name="douban" href="/douban" asChild>
            <TabButton>douban</TabButton>
          </TabTrigger>
          <TabTrigger name="subscriptions" href="/subscriptions" asChild>
            <TabButton>subscriptions</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  const styles = useTabStyles();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  const tabKey = typeof children === "string" ? children : "index";
  const label = TAB_LABELS[tabKey] ?? tabKey;
  const iconName = TAB_ICONS[tabKey] ?? {
    ios: "circle.fill",
    web: "circle.fill",
  };

  return (
    <Pressable
      {...props}
      style={({ pressed, focused, hovered }) =>
        (pressed || focused || hovered) && styles.pressed
      }
    >
      <ThemedView
        type={isFocused ? "backgroundSelected" : "backgroundElement"}
        style={styles.tabButtonView}
      >
        <SymbolView
          tintColor={isFocused ? colors.tint : colors.textSecondary}
          name={iconName}
          size={16}
        />
        <ThemedText
          type="small"
          themeColor={isFocused ? "text" : "textSecondary"}
        >
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  const styles = useTabStyles();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          MarsTV
        </ThemedText>

        {props.children}

        {Platform.OS === "web" ? (
          <Pressable style={styles.externalPressable} onPress={() => {}}>
            <ThemedText type="small">v1.0</ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>
    </View>
  );
}

const useTabStyles = () => {
  const { spacing } = useScreenDimensions();
  return StyleSheet.create({
    tabListContainer: {
      position: "absolute",
      width: "100%",
      padding: spacing.three,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
    },
    innerContainer: {
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.five,
      borderRadius: spacing.five,
      flexDirection: "row",
      alignItems: "center",
      flexGrow: 1,
      gap: spacing.two,
      maxWidth: MaxContentWidth,
    },
    brandText: {
      marginRight: "auto",
    },
    pressed: {
      opacity: 0.7,
    },
    tabButtonView: {
      paddingVertical: spacing.one,
      paddingHorizontal: spacing.three,
      borderRadius: spacing.three,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.half,
    },
    externalPressable: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.one,
      marginLeft: spacing.three,
    },
  });
};
