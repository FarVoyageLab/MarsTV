import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { TVFocusGuideView } from "@/components/tv-focus-guide";
import { TVCard, TVCardTitle, type TVCardItem } from "@/components/tv-card";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";

interface GridSection {
  title: string;
  items: TVCardItem[];
}

interface Props {
  sections: GridSection[];
  onCardPress?: (item: TVCardItem) => void;
  onCardFocus?: (item: TVCardItem) => void;
  imageProxy?: string;
  ListHeaderComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
}

export function TVGrid({
  sections,
  onCardPress,
  onCardFocus,
  imageProxy,
  ListHeaderComponent,
  ListEmptyComponent,
}: Props) {
  const { scale, spacing } = useScreenDimensions();
  const theme = useTheme();
  const styles = useTVGridStyles();

  if (sections.length === 0 && ListEmptyComponent) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {ListHeaderComponent}
        {ListEmptyComponent}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      {ListHeaderComponent}

      {sections.map((section, si) => (
        <TVFocusGuideView key={si} autoFocus={si === 0} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {section.title}
          </Text>
          <View style={styles.row}>
            {section.items.map((item, ii) => (
              <View
                key={`${item.source}-${item.id}-${ii}`}
                style={styles.cardWrapper}
              >
                <TVCard
                  item={item}
                  onPress={() => onCardPress?.(item)}
                  onFocus={() => onCardFocus?.(item)}
                  imageProxy={imageProxy}
                />
                <TVCardTitle title={item.title} scale={scale} />
              </View>
            ))}
          </View>
        </TVFocusGuideView>
      ))}
    </ScrollView>
  );
}

const useTVGridStyles = () => {
  const { spacing, scale } = useScreenDimensions();
  return StyleSheet.create({
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.six,
      paddingHorizontal: spacing.two,
    },
    section: {
      marginBottom: spacing.five,
    },
    sectionTitle: {
      fontSize: 26 * scale,
      fontWeight: "700",
      marginBottom: spacing.two,
      marginLeft: spacing.one,
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
    },
    cardWrapper: {
      marginBottom: spacing.two,
    },
  });
};
