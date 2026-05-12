import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

interface TabConfig {
  name: string;
  title: string;
  icon: { focused: IoniconsName; unfocused: IoniconsName };
}

const TABS: TabConfig[] = [
  { name: "index", title: "首页", icon: { focused: "home", unfocused: "home-outline" } },
  { name: "search", title: "搜索", icon: { focused: "search", unfocused: "search-outline" } },
  { name: "categories", title: "分类", icon: { focused: "grid", unfocused: "grid-outline" } },
  { name: "library", title: "片库", icon: { focused: "book", unfocused: "book-outline" } },
  { name: "settings", title: "设置", icon: { focused: "settings", unfocused: "settings-outline" } },
];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.icon + "20",
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? tab.icon.focused : tab.icon.unfocused}
                size={26}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
