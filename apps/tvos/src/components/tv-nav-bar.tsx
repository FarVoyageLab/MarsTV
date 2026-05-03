import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";

export interface NavTab {
  key: string;
  label: string;
  icon?: string;
}

interface Props {
  tabs: NavTab[];
  activeTab: string;
  onTabSelect: (key: string) => void;
}

export function TVNavBar({ tabs, activeTab, onTabSelect }: Props) {
  const { scale, spacing } = useScreenDimensions();
  const theme = useTheme();
  const styles = useNavBarStyles();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundElement }]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabSelect(tab.key)}
            style={({ focused }) => [
              styles.tab,
              { borderColor: focused ? theme.tint : "transparent" },
              isActive && { backgroundColor: theme.tint + "30" },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? theme.tint : theme.text },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useNavBarStyles = () => {
  const { spacing, scale } = useScreenDimensions();
  const theme = useTheme();
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.four,
      gap: spacing.three,
      marginHorizontal: spacing.two,
      marginTop: spacing.one,
      borderRadius: 16 * scale,
    },
    tab: {
      paddingVertical: spacing.one + 2,
      paddingHorizontal: spacing.three,
      borderRadius: 10 * scale,
      borderWidth: 2 * scale,
    },
    tabLabel: {
      fontSize: 18 * scale,
      fontWeight: "600",
    },
  });
};
