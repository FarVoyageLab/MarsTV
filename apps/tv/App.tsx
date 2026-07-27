import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import Video, { type VideoRef } from "react-native-video";
import * as SecureStore from "expo-secure-store";
import { MarsTvApiClient, type PairingStart } from "@marstv/api-client";

type Screen = "home" | "detail" | "player" | "pairing";

const colors = {
  canvas: "#0b0d10",
  surface: "#161b21",
  border: "#2a313a",
  text: "#f4f0e8",
  muted: "#9da4ad",
  amber: "#e9a23b",
  success: "#60bd7a"
};

const cards: Array<{ id: string; title: string; note: `${number}%` }> = [
  { id: "1", title: "遗落之环", note: "48%" },
  { id: "2", title: "暗潮之下", note: "72%" },
  { id: "3", title: "山脉之间", note: "31%" },
  { id: "4", title: "时光碎片", note: "18%" },
  { id: "5", title: "边界之外", note: "62%" }
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  return (
    <View style={styles.app}>
      <StatusBar hidden />
      {screen === "home" ? <Home onSelect={() => setScreen("detail")} onPair={() => setScreen("pairing")} /> : null}
      {screen === "detail" ? <Detail onBack={() => setScreen("home")} onPlay={() => setScreen("player")} /> : null}
      {screen === "player" ? <Player onBack={() => setScreen("detail")} /> : null}
      {screen === "pairing" ? <Pairing onBack={() => setScreen("home")} /> : null}
    </View>
  );
}

function Home({ onSelect, onPair }: { onSelect: () => void; onPair: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.topNav}>
        <Text style={styles.brand}>MarsTV</Text>
        {["首页", "影视库", "电影", "电视剧", "动漫", "纪录片", "合集", "我的收藏"].map((label, index) => (
          <Focusable key={label} initial={index === 0} onPress={() => undefined}>
            <Text style={styles.navLabel}>{label}</Text>
          </Focusable>
        ))}
        <View style={styles.spacer} />
        <Pressable focusable onPress={onPair}><Text style={styles.sourceState}>● 来源状态 · 良好　在线 6/7</Text></Pressable>
      </View>
      <Text style={styles.sectionTitle}>继续观看</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {cards.map((card, index) => (
          <Focusable key={card.id} initial={index === 0} onPress={onSelect} card>
            <Image source={require("./assets/poster-sheet.png")} style={styles.landscapeArt} />
            <View style={styles.cardCopy}><Text style={styles.cardTitle}>{card.title}</Text><Text style={styles.cardNote}>{card.note}</Text></View>
            <View style={styles.progress}><View style={[styles.progressFill, { width: card.note }]} /></View>
          </Focusable>
        ))}
      </ScrollView>
      <Text style={styles.sectionTitle}>最近添加</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.smallRail}>
        {cards.concat(cards.slice(0, 3)).map((card, index) => (
          <Focusable key={`${card.id}-${index}`} onPress={onSelect} card>
            <Image source={require("./assets/poster-sheet.png")} style={styles.smallArt} />
          </Focusable>
        ))}
      </ScrollView>
      <View style={styles.remoteHelp}><Text>◉ 选择　 OK 确认　 ↩ 返回　 ☰ 菜单</Text></View>
    </View>
  );
}

function Detail({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  return (
    <ImageBackground source={require("./assets/hero-eclipse.png")} style={styles.detail} imageStyle={styles.detailBackground}>
      <View style={styles.detailCopy}>
        <Text style={styles.detailTitle}>遗落之环</Text>
        <Text style={styles.meta}>2026 · 科幻剧集 · 8.6 · 5.1</Text>
        <Text style={styles.description}>一座沉睡于荒原的环形遗迹重新启动。一个家庭必须在时间耗尽前，理解它与失落文明之间的联系。</Text>
        <Text style={styles.sourceState}>● 主库 · MacCMS（推荐）</Text>
        <View style={styles.actions}>
          <Focusable initial onPress={onPlay} primary><Text style={styles.primaryText}>▶ 播放第 04 集</Text></Focusable>
          <Focusable onPress={onBack}><Text style={styles.secondaryText}>返回</Text></Focusable>
        </View>
        <Text style={styles.sectionTitle}>选集</Text>
        <View style={styles.episodeRow}>{Array.from({ length: 8 }, (_, index) => (
          <Focusable key={index} onPress={() => undefined}><Text style={styles.episodeText}>{index + 1}</Text></Focusable>
        ))}</View>
      </View>
    </ImageBackground>
  );
}

function Player({ onBack }: { onBack: () => void }) {
  const video = useRef<VideoRef>(null);
  const [error, setError] = useState(true);
  return (
    <View style={styles.player}>
      {!error ? (
        <Video ref={video} source={{ uri: "https://invalid.local/authorized-source-required.m3u8" }} style={StyleSheet.absoluteFill} controls resizeMode="contain" onError={() => setError(true)} />
      ) : null}
      <View style={styles.playerHeader}><Text style={styles.cardTitle}>遗落之环 · 第 04 集</Text><Text style={styles.sourceState}>主线 · MacCMS</Text></View>
      {error ? <View style={styles.playerError}>
        <Text style={styles.errorSymbol}>!</Text>
        <Text style={styles.errorTitle}>当前没有授权播放资源</Text>
        <Text style={styles.errorCopy}>配对家庭实例或添加本地来源后即可播放。</Text>
        <View style={styles.actions}><Focusable initial primary onPress={() => setError(false)}><Text style={styles.primaryText}>重试连接</Text></Focusable><Focusable onPress={onBack}><Text style={styles.secondaryText}>切换来源</Text></Focusable></View>
      </View> : null}
    </View>
  );
}

function Pairing({ onBack }: { onBack: () => void }) {
  const [origin, setOrigin] = useState("");
  const [challenge, setChallenge] = useState<PairingStart | null>(null);
  const [state, setState] = useState<"idle" | "starting" | "pending" | "paired" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void SecureStore.getItemAsync("marstv.apiOrigin.v1").then((stored) => {
      if (stored) setOrigin(stored);
    });
  }, []);

  useEffect(() => {
    if (!challenge || state !== "pending") return;
    let active = true;
    const timer = setInterval(() => {
      const client = new MarsTvApiClient({ baseUrl: origin });
      void client.consumePairing(challenge.pairingId, challenge.secret)
        .then(async (result) => {
          if (!active || "pending" in result) return;
          await Promise.all([
            SecureStore.setItemAsync("marstv.apiOrigin.v1", origin),
            SecureStore.setItemAsync("marstv.session.v1", result.sessionToken)
          ]);
          if (active) {
            setState("paired");
            setMessage("已安全连接家庭实例。");
          }
        })
        .catch((error: unknown) => {
          if (!active) return;
          setState("error");
          setMessage(error instanceof Error ? error.message : "配对已失效。");
        });
    }, 1_500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [challenge, origin, state]);

  async function pair() {
    setState("starting");
    setMessage("");
    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== "https:" && !(__DEV__ && ["localhost", "127.0.0.1"].includes(parsed.hostname))) {
        throw new Error("生产实例必须使用 HTTPS。");
      }
      const normalized = origin.replace(/\/$/u, "");
      const started = await new MarsTvApiClient({ baseUrl: normalized }).startPairing();
      await SecureStore.setItemAsync("marstv.apiOrigin.v1", normalized);
      setOrigin(normalized);
      setChallenge(started);
      setState("pending");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "无法连接家庭实例。");
    }
  }
  return (
    <View style={styles.pairing}>
      <Text style={styles.detailTitle}>连接家庭实例</Text>
      {!challenge ? (
        <>
          <Text style={styles.description}>输入自托管或 Edge 实例地址；连接后会生成五分钟有效、只能使用一次的短码。</Text>
          <TextInput
            style={styles.instanceInput}
            value={origin}
            onChangeText={setOrigin}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://tv.example.com"
            placeholderTextColor="#69717b"
          />
          <View style={styles.actions}>
            <Focusable initial primary onPress={() => void pair()}><Text style={styles.primaryText}>{state === "starting" ? "正在连接…" : "生成短码"}</Text></Focusable>
            <Focusable onPress={onBack}><Text style={styles.secondaryText}>返回</Text></Focusable>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.description}>在已登录的 Web 管理端打开“系统状态 → 认领新设备”，输入：</Text>
          <Text selectable style={styles.pairingCode}>{challenge.code.slice(0, 3)} {challenge.code.slice(3)}</Text>
          {state === "pending" ? <View style={styles.waiting}><ActivityIndicator color={colors.amber} /><Text style={styles.description}>等待管理员确认…</Text></View> : null}
          {state === "paired" ? <View style={styles.actions}><Focusable initial primary onPress={onBack}><Text style={styles.primaryText}>进入 MarsTV</Text></Focusable></View> : null}
        </>
      )}
      {message ? <Text style={state === "paired" ? styles.successMessage : styles.errorMessage}>{message}</Text> : null}
      {state === "error" ? <View style={styles.actions}><Focusable initial onPress={() => { setChallenge(null); setState("idle"); }}><Text style={styles.secondaryText}>重新开始</Text></Focusable><Focusable onPress={onBack}><Text style={styles.secondaryText}>返回</Text></Focusable></View> : null}
      <Text style={styles.platform}>运行平台：{Platform.OS} TV</Text>
    </View>
  );
}

function Focusable({
  children,
  onPress,
  initial = false,
  card = false,
  primary = false
}: {
  children: React.ReactNode;
  onPress: () => void;
  initial?: boolean;
  card?: boolean;
  primary?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      focusable
      hasTVPreferredFocus={initial}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.focusable,
        card && styles.card,
        primary && styles.primary,
        focused && styles.focused
      ]}
    >{children}</Pressable>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.canvas },
  screen: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 54, paddingTop: 34 },
  topNav: { height: 54, flexDirection: "row", alignItems: "center", gap: 12 },
  brand: { color: colors.amber, fontSize: 28, fontWeight: "800", marginRight: 22 },
  spacer: { flex: 1 },
  focusable: { borderRadius: 6, borderWidth: 2, borderColor: "transparent", paddingHorizontal: 14, paddingVertical: 10 },
  focused: { borderColor: colors.amber, transform: [{ scale: 1.035 }] },
  navLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  sourceState: { color: colors.success, fontSize: 13 },
  sectionTitle: { color: colors.text, fontSize: 23, fontWeight: "700", marginTop: 24, marginBottom: 10 },
  rail: { gap: 14, paddingVertical: 8, paddingHorizontal: 4 },
  smallRail: { gap: 12, paddingVertical: 6, paddingHorizontal: 4 },
  card: { width: 286, paddingHorizontal: 0, paddingVertical: 0, overflow: "hidden", backgroundColor: colors.surface },
  landscapeArt: { width: "100%", height: 148 },
  smallArt: { width: 178, height: 98 },
  cardCopy: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingTop: 10 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  cardNote: { color: colors.muted, fontSize: 12 },
  progress: { height: 3, backgroundColor: "#050607", margin: 12 },
  progressFill: { height: 3, backgroundColor: colors.amber },
  remoteHelp: { position: "absolute", bottom: 20, left: 54 },
  detail: { flex: 1, justifyContent: "center" },
  detailBackground: { opacity: 0.68 },
  detailCopy: { width: "55%", marginLeft: 72, padding: 32, backgroundColor: "rgba(11,13,16,0.88)" },
  detailTitle: { color: colors.text, fontSize: 56, fontWeight: "800", letterSpacing: -2 },
  meta: { color: colors.muted, fontSize: 16, marginTop: 12 },
  description: { color: "#c6c9ce", fontSize: 17, lineHeight: 27, marginTop: 22, maxWidth: 760 },
  actions: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 26 },
  primary: { backgroundColor: colors.amber },
  primaryText: { color: "#15100a", fontSize: 17, fontWeight: "800" },
  secondaryText: { color: colors.text, fontSize: 17, fontWeight: "700" },
  episodeRow: { flexDirection: "row", gap: 8 },
  episodeText: { color: colors.text, fontSize: 16, minWidth: 25, textAlign: "center" },
  player: { flex: 1, backgroundColor: "#030405", alignItems: "center", justifyContent: "center" },
  playerHeader: { position: "absolute", top: 38, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between" },
  playerError: { width: 620, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: 38 },
  errorSymbol: { color: "#ef6a62", fontSize: 54, fontWeight: "800" },
  errorTitle: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 10 },
  errorCopy: { color: colors.muted, fontSize: 15, marginTop: 8 },
  pairing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 60, backgroundColor: colors.canvas },
  instanceInput: { width: 680, height: 62, marginTop: 26, borderWidth: 2, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 18, fontSize: 19 },
  pairingCode: { color: colors.amber, fontSize: 38, fontWeight: "800", letterSpacing: 8, marginTop: 20 },
  waiting: { alignItems: "center", marginTop: 24 },
  successMessage: { color: colors.success, fontSize: 16, marginTop: 18 },
  errorMessage: { color: "#ef6a62", fontSize: 16, marginTop: 18 },
  platform: { color: colors.muted, fontSize: 12, marginTop: 24 }
});
