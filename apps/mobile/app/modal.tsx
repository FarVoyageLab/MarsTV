import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">MarsTV</ThemedText>
      <ThemedText style={styles.subtitle}>更快、更好看、全端可用</ThemedText>
      <ThemedText style={styles.body}>
        跨平台开源影视聚合平台。支持多源搜索、追剧订阅、豆瓣排行，随时随地畅享影视内容。
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    opacity: 0.6,
  },
});
