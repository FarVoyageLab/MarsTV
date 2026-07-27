import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import * as SecureStore from "expo-secure-store";
import { MarsTvApiClient, type PairingStart } from "@marstv/api-client";

type Screen = "home" | "detail" | "player" | "sources" | "settings";

const colors = {
  canvas: "#0b0d10",
  surface: "#161b21",
  border: "#2a313a",
  text: "#f4f0e8",
  muted: "#9da4ad",
  amber: "#e9a23b",
  success: "#60bd7a"
};

const media = [
  { id: "1", title: "遗落之环", note: "更新至 04", crop: 0 },
  { id: "2", title: "暗潮之下", note: "72% 已观看", crop: 1 },
  { id: "3", title: "山脉之间", note: "全 8 集", crop: 2 },
  { id: "4", title: "时光碎片", note: "4K", crop: 3 }
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [pairing, setPairing] = useState(false);
  const [sync, setSync] = useState(true);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.canvas} />
      <SafeAreaView style={styles.safe}>
        {screen === "home" ? <Home onOpen={() => setScreen("detail")} /> : null}
        {screen === "detail" ? <Detail onBack={() => setScreen("home")} onPlay={() => setScreen("player")} /> : null}
        {screen === "player" ? <Player onBack={() => setScreen("detail")} /> : null}
        {screen === "sources" ? <Sources onPair={() => setPairing(true)} /> : null}
        {screen === "settings" ? <Settings sync={sync} setSync={setSync} /> : null}
        {screen !== "player" ? <TabBar screen={screen} onChange={setScreen} /> : null}
        <PairingModal visible={pairing} onClose={() => setPairing(false)} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Home({ onOpen }: { onOpen: () => void }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}><Text style={styles.brand}>MarsTV</Text><Text style={styles.profile}>管理</Text></View>
      <Pressable onPress={onOpen}>
        <ImageBackground source={require("./assets/hero-eclipse.png")} style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>遗落之环</Text>
            <Text style={styles.meta}>2026 · 科幻剧集 · 8.6</Text>
            <Text style={styles.description} numberOfLines={2}>一座沉睡于荒原的环形遗迹重新启动。</Text>
            <View style={styles.primaryButton}><Text style={styles.primaryButtonText}>▶  播放</Text></View>
          </View>
        </ImageBackground>
      </Pressable>
      <SectionTitle title="继续观看" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {media.map((item) => <MediaCard key={item.id} item={item} onPress={onOpen} />)}
      </ScrollView>
      <SectionTitle title="最近添加" />
      <View style={styles.grid}>{media.concat(media.slice(0, 2)).map((item, index) => (
        <MediaCard key={`${item.id}-${index}`} item={item} portrait onPress={onOpen} />
      ))}</View>
    </ScrollView>
  );
}

function Detail({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const [episode, setEpisode] = useState(4);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.detailContent}>
      <Pressable onPress={onBack}><Text style={styles.back}>‹  返回</Text></Pressable>
      <Image source={require("./assets/hero-eclipse.png")} style={styles.detailHero} />
      <Text style={styles.detailTitle}>遗落之环</Text>
      <Text style={styles.meta}>2026 · 8.6 · 2 小时 12 分</Text>
      <Text style={styles.provenance}>● 主库 · MacCMS（推荐）</Text>
      <Text style={styles.detailDescription}>在遥远的未来，一座沉睡于荒原的环形遗迹重新启动。一个家庭必须在时间耗尽前，理解它与失落文明之间的联系。</Text>
      <Text style={styles.sectionTitle}>选集</Text>
      <View style={styles.episodes}>{Array.from({ length: 8 }, (_, index) => (
        <Pressable key={index} onPress={() => setEpisode(index + 1)} style={[styles.episode, episode === index + 1 && styles.episodeActive]}>
          <Text style={[styles.episodeText, episode === index + 1 && styles.episodeTextActive]}>{index + 1}</Text>
        </Pressable>
      ))}</View>
      <Pressable style={styles.largeButton} onPress={onPlay}><Text style={styles.primaryButtonText}>▶  播放第 {String(episode).padStart(2, "0")} 集</Text></Pressable>
    </ScrollView>
  );
}

function Player({ onBack }: { onBack: () => void }) {
  const player = useVideoPlayer(null);
  const [error, setError] = useState(true);
  return (
    <View style={styles.player}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />
      <Pressable onPress={onBack} style={styles.playerBack}><Text style={styles.back}>‹  返回</Text></Pressable>
      <View style={styles.playerTitle}><Text style={styles.detailTitle}>遗落之环</Text><Text style={styles.meta}>第 04 集 · 信号回归</Text></View>
      {error ? <View style={styles.playerError}>
        <Text style={styles.errorSymbol}>!</Text>
        <Text style={styles.errorTitle}>无法连接到当前资源</Text>
        <Text style={styles.errorCopy}>添加授权本地源后，可以在这里验证原生 HLS、DASH 与 MP4 播放。</Text>
        <Pressable style={styles.primaryButton} onPress={() => setError(false)}><Text style={styles.primaryButtonText}>重试连接</Text></Pressable>
      </View> : <ActivityIndicator color={colors.amber} />}
    </View>
  );
}

function Sources({ onPair }: { onPair: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  async function save() {
    await SecureStore.setItemAsync("marstv.localSource.v1", JSON.stringify({ name, url }));
    setSaved(true);
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.formScreen}>
      <Text style={styles.pageTitle}>本地来源</Text>
      <Text style={styles.pageCopy}>配置只存入设备安全存储；启用加密同步后才会上传密文。</Text>
      <Text style={styles.label}>来源名称</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="家庭 NAS" placeholderTextColor="#69717b" />
      <Text style={styles.label}>MacCMS v10 API URL</Text>
      <TextInput style={styles.input} value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" placeholder="https://…" placeholderTextColor="#69717b" />
      <Pressable style={styles.largeButton} onPress={save}><Text style={styles.primaryButtonText}>{saved ? "✓ 已保存" : "保存到安全存储"}</Text></Pressable>
      <Pressable style={styles.secondaryButton} onPress={onPair}><Text style={styles.secondaryButtonText}>扫码连接家庭实例</Text></Pressable>
    </ScrollView>
  );
}

function Settings({ sync, setSync }: { sync: boolean; setSync: (value: boolean) => void }) {
  return (
    <View style={[styles.screen, styles.formScreen]}>
      <Text style={styles.pageTitle}>设置</Text>
      <View style={styles.settingRow}><View><Text style={styles.settingTitle}>端到端加密同步</Text><Text style={styles.settingCopy}>来源、收藏、历史和播放进度</Text></View><Switch value={sync} onValueChange={setSync} trackColor={{ true: colors.amber }} /></View>
      <View style={styles.settingRow}><View><Text style={styles.settingTitle}>默认字幕</Text><Text style={styles.settingCopy}>简体中文</Text></View><Text style={styles.chevron}>›</Text></View>
      <View style={styles.settingRow}><View><Text style={styles.settingTitle}>播放质量</Text><Text style={styles.settingCopy}>自动</Text></View><Text style={styles.chevron}>›</Text></View>
      <View style={styles.settingRow}><View><Text style={styles.settingTitle}>减少动态效果</Text><Text style={styles.settingCopy}>跟随系统</Text></View><Text style={styles.chevron}>›</Text></View>
    </View>
  );
}

function PairingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [origin, setOrigin] = useState("");
  const [challenge, setChallenge] = useState<PairingStart | null>(null);
  const [state, setState] = useState<"idle" | "starting" | "pending" | "paired" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!visible) return;
    void SecureStore.getItemAsync("marstv.apiOrigin.v1").then((stored) => {
      if (stored) setOrigin(stored);
    });
  }, [visible]);

  useEffect(() => {
    if (!visible || !challenge || state !== "pending") return;
    let active = true;
    const timer = setInterval(() => {
      const client = new MarsTvApiClient({ baseUrl: origin });
      void client.consumePairing(challenge.pairingId, challenge.secret)
        .then(async (result) => {
          if (!active || "pending" in result) return;
          await Promise.all([
            SecureStore.setItemAsync("marstv.apiOrigin.v1", origin.replace(/\/$/u, "")),
            SecureStore.setItemAsync("marstv.session.v1", result.sessionToken)
          ]);
          if (active) {
            setState("paired");
            setMessage("设备已连接；会话已写入系统安全存储。");
          }
        })
        .catch((error: unknown) => {
          if (!active) return;
          setState("error");
          setMessage(error instanceof Error ? error.message : "配对已失效，请重新开始。");
        });
    }, 1_500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [challenge, origin, state, visible]);

  async function beginPairing() {
    setState("starting");
    setMessage("");
    try {
      const url = new URL(origin);
      if (url.protocol !== "https:" && !(__DEV__ && ["localhost", "127.0.0.1"].includes(url.hostname))) {
        throw new Error("生产实例必须使用 HTTPS。");
      }
      const normalized = origin.replace(/\/$/u, "");
      const result = await new MarsTvApiClient({ baseUrl: normalized }).startPairing();
      await SecureStore.setItemAsync("marstv.apiOrigin.v1", normalized);
      setOrigin(normalized);
      setChallenge(result);
      setState("pending");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "无法开始配对。");
    }
  }

  function resetAndClose() {
    setChallenge(null);
    setState("idle");
    setMessage("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndClose}>
      <View style={styles.modalBackdrop}><View style={styles.modal}>
        <Text style={styles.errorTitle}>连接家庭实例</Text>
        {!challenge ? (
          <>
            <Text style={styles.pageCopy}>填写自托管或 Edge 实例地址，然后在已登录的 Web 管理端认领一次性短码。</Text>
            <TextInput
              style={styles.input}
              value={origin}
              onChangeText={setOrigin}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://tv.example.com"
              placeholderTextColor="#69717b"
            />
            <Pressable style={styles.largeButton} onPress={() => void beginPairing()} disabled={state === "starting" || !origin}>
              <Text style={styles.primaryButtonText}>{state === "starting" ? "正在连接…" : "生成五分钟短码"}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.pageCopy}>在 Web 管理端“系统状态 → 认领新设备”输入：</Text>
            <Text selectable style={styles.pairingCode}>{challenge.code.slice(0, 3)} {challenge.code.slice(3)}</Text>
            {state === "pending" ? <View style={styles.pairingWait}><ActivityIndicator color={colors.amber} /><Text style={styles.pageCopy}>等待管理员确认…</Text></View> : null}
          </>
        )}
        {message ? <Text style={state === "paired" ? styles.successCopy : styles.errorCopy}>{message}</Text> : null}
        {state === "error" ? <Pressable style={styles.secondaryButton} onPress={() => { setChallenge(null); setState("idle"); }}><Text style={styles.secondaryButtonText}>重新开始</Text></Pressable> : null}
        <Pressable onPress={resetAndClose}><Text style={styles.cancel}>{state === "paired" ? "完成" : "关闭"}</Text></Pressable>
      </View></View>
    </Modal>
  );
}

function TabBar({ screen, onChange }: { screen: Screen; onChange: (screen: Screen) => void }) {
  const tabs: Array<{ screen: Screen; label: string }> = [
    { screen: "home", label: "首页" },
    { screen: "sources", label: "来源" },
    { screen: "settings", label: "设置" }
  ];
  return <View style={styles.tabBar}>{tabs.map((tab) => (
    <Pressable key={tab.screen} onPress={() => onChange(tab.screen)}><Text style={[styles.tabText, screen === tab.screen && styles.tabTextActive]}>{tab.label}</Text></Pressable>
  ))}</View>;
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function MediaCard({ item, portrait = false, onPress }: { item: typeof media[number]; portrait?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.card, portrait && styles.cardPortrait]}>
      <Image source={require("./assets/poster-sheet.png")} style={[styles.cardImage, portrait && styles.cardImagePortrait]} />
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.cardNote}>{item.note}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  screen: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { paddingBottom: 92 },
  header: { height: 58, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { color: colors.amber, fontWeight: "800", fontSize: 20 },
  profile: { color: colors.muted, fontSize: 12 },
  hero: { height: 390, justifyContent: "flex-end" },
  heroImage: { opacity: 0.72 },
  heroCopy: { padding: 20, backgroundColor: "rgba(11,13,16,0.82)" },
  heroTitle: { color: colors.text, fontSize: 34, fontWeight: "800", letterSpacing: -1.2 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 5 },
  description: { color: "#c6c9ce", fontSize: 13, lineHeight: 20, marginVertical: 12 },
  primaryButton: { minHeight: 42, backgroundColor: colors.amber, borderRadius: 6, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, alignSelf: "flex-start" },
  primaryButtonText: { color: "#15100a", fontSize: 13, fontWeight: "800" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 25, marginBottom: 12, paddingHorizontal: 18 },
  grid: { paddingHorizontal: 12, flexDirection: "row", flexWrap: "wrap" },
  card: { width: 210, marginLeft: 16 },
  cardPortrait: { width: "45.5%", marginHorizontal: "2.25%", marginBottom: 22 },
  cardImage: { width: "100%", aspectRatio: 16 / 9, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  cardImagePortrait: { aspectRatio: 2 / 3 },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 7 },
  cardNote: { color: colors.muted, fontSize: 10, marginTop: 3 },
  detailContent: { padding: 18, paddingBottom: 96 },
  back: { color: colors.text, fontSize: 14, paddingVertical: 8 },
  detailHero: { width: "100%", aspectRatio: 16 / 9, borderRadius: 6, marginTop: 8 },
  detailTitle: { color: colors.text, fontSize: 30, fontWeight: "800", marginTop: 18, letterSpacing: -1 },
  provenance: { color: colors.success, fontSize: 11, marginTop: 13 },
  detailDescription: { color: "#c6c9ce", fontSize: 13, lineHeight: 21, marginTop: 15 },
  episodes: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14 },
  episode: { width: 39, height: 39, borderWidth: 1, borderColor: colors.border, borderRadius: 5, alignItems: "center", justifyContent: "center", margin: 4, backgroundColor: colors.surface },
  episodeActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  episodeText: { color: colors.text, fontSize: 12 },
  episodeTextActive: { color: "#15100a", fontWeight: "800" },
  largeButton: { minHeight: 48, backgroundColor: colors.amber, borderRadius: 6, alignItems: "center", justifyContent: "center", marginTop: 22, alignSelf: "stretch" },
  secondaryButton: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 6, alignItems: "center", justifyContent: "center", marginTop: 12 },
  secondaryButtonText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  player: { flex: 1, backgroundColor: "#030405", alignItems: "center", justifyContent: "center" },
  playerBack: { position: "absolute", top: 12, left: 18, zIndex: 2 },
  playerTitle: { position: "absolute", top: 48, left: 18 },
  playerError: { width: "86%", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 24, alignItems: "center" },
  errorSymbol: { color: "#ef6a62", fontSize: 38, fontWeight: "800" },
  errorTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 8 },
  errorCopy: { color: colors.muted, textAlign: "center", lineHeight: 19, fontSize: 12, marginVertical: 12 },
  formScreen: { padding: 22, paddingBottom: 88 },
  pageTitle: { color: colors.text, fontSize: 27, fontWeight: "800", marginTop: 16 },
  pageCopy: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 6, marginBottom: 22 },
  label: { color: colors.muted, fontSize: 11, marginTop: 16, marginBottom: 7 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12 },
  settingRow: { minHeight: 76, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  settingCopy: { color: colors.muted, fontSize: 11, marginTop: 4 },
  chevron: { color: colors.muted, fontSize: 24 },
  tabBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 68, backgroundColor: "rgba(11,13,16,0.98)", borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  tabText: { color: colors.muted, fontSize: 11, padding: 14 },
  tabTextActive: { color: colors.amber, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", padding: 22 },
  modal: { width: "100%", maxWidth: 420, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 24 },
  codeInput: { textAlign: "center", fontSize: 24, letterSpacing: 8 },
  pairingCode: { color: colors.amber, textAlign: "center", fontSize: 34, fontWeight: "800", letterSpacing: 6, marginVertical: 8 },
  pairingWait: { alignItems: "center", gap: 8, marginTop: 10 },
  successCopy: { color: colors.success, textAlign: "center", lineHeight: 19, fontSize: 12, marginTop: 14 },
  cancel: { color: colors.muted, textAlign: "center", padding: 16 }
});
