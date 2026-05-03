import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useTheme } from "@/hooks/use-theme";

export interface TVCardItem {
  source: string;
  id: string;
  title: string;
  poster?: string;
  category?: string;
  year?: string;
  remarks?: string;
  rating?: number;
}

interface Props {
  item: TVCardItem;
  isFocused?: boolean;
  onPress?: () => void;
  onFocus?: () => void;
  /** Image proxy URL prefix for CMS posters */
  imageProxy?: string;
}

export function TVCard({
  item,
  isFocused,
  onPress,
  onFocus,
  imageProxy = "/api/image/cms",
}: Props) {
  const { scale, spacing } = useScreenDimensions();
  const theme = useTheme();
  const styles = useTVCardStyles();

  const cardWidth = 220 * scale;
  const cardHeight = cardWidth * 1.5;

  const posterUrl = item.poster
    ? `${imageProxy}?u=${encodeURIComponent(item.poster)}`
    : null;

  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      style={[
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
        },
        isFocused && styles.cardFocused,
      ]}
    >
      {({ focused }) => (
        <View
          style={[
            styles.inner,
            { borderColor: focused ? theme.tint : "transparent" },
          ]}
        >
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={[styles.poster, { width: cardWidth, height: cardHeight }]}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.posterPlaceholder,
                { width: cardWidth, height: cardHeight },
              ]}
            >
              <Text style={styles.placeholderText}>--</Text>
            </View>
          )}

          {item.remarks ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {item.remarks}
              </Text>
            </View>
          ) : null}

          {item.rating ? (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          ) : null}

          {focused && (
            <View style={[styles.glow, { borderColor: theme.tint }]} />
          )}
        </View>
      )}
    </Pressable>
  );
}

export function TVCardTitle({
  title,
  scale,
}: {
  title: string;
  scale: number;
}) {
  const theme = useTheme();
  return (
    <Text
      numberOfLines={2}
      style={{
        color: theme.text,
        fontSize: 14 * scale,
        fontWeight: "600",
        marginTop: 6 * scale,
        textAlign: "center",
        maxWidth: 220 * scale,
      }}
    >
      {title}
    </Text>
  );
}

const useTVCardStyles = () => {
  const { scale, spacing } = useScreenDimensions();
  const theme = useTheme();
  return StyleSheet.create({
    card: {
      margin: spacing.one,
      borderRadius: 12 * scale,
      overflow: "visible",
    },
    cardFocused: {
      transform: [{ scale: 1.05 }],
    },
    inner: {
      borderRadius: 12 * scale,
      overflow: "hidden",
      borderWidth: 3 * scale,
      position: "relative",
    },
    poster: {
      borderRadius: 12 * scale,
    },
    posterPlaceholder: {
      backgroundColor: theme.backgroundElement,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 12 * scale,
    },
    placeholderText: {
      color: theme.textSecondary,
      fontSize: 24 * scale,
    },
    badge: {
      position: "absolute",
      top: 6 * scale,
      right: 6 * scale,
      backgroundColor: "rgba(0,0,0,0.75)",
      borderRadius: 4 * scale,
      paddingHorizontal: 6 * scale,
      paddingVertical: 2 * scale,
    },
    badgeText: {
      color: "#ffffff",
      fontSize: 11 * scale,
      fontWeight: "600",
    },
    ratingBadge: {
      position: "absolute",
      bottom: 6 * scale,
      left: 6 * scale,
      backgroundColor: "rgba(255,180,0,0.85)",
      borderRadius: 4 * scale,
      paddingHorizontal: 6 * scale,
      paddingVertical: 2 * scale,
    },
    ratingText: {
      color: "#000000",
      fontSize: 11 * scale,
      fontWeight: "700",
    },
    glow: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 12 * scale,
      borderWidth: 3 * scale,
    },
  });
};
