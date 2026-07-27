import { useEffect, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Captions,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  Settings,
  SkipForward,
  Volume2
} from "lucide-react";
import { api } from "../lib/runtime";

export function PlayerPage() {
  const { sourceId, itemId, episodeId } = useParams({ from: "/player/$sourceId/$itemId/$episodeId" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "recovering">(
    sourceId === "demo" ? "recovering" : "loading"
  );
  const detail = useQuery({
    queryKey: ["detail", sourceId, itemId],
    queryFn: () => api.detail(sourceId, itemId),
    enabled: sourceId !== "demo",
    retry: 1
  });
  const episode = detail.data?.episodes.find((candidate) => candidate.id === episodeId);
  const manifest = useQuery({
    queryKey: ["playback", sourceId, itemId, episodeId],
    queryFn: () => api.resolve({
      sourceId,
      sourceItemId: itemId,
      episodeId,
      episodeUrl: episode!.url,
      preferredProtocol: null
    }),
    enabled: Boolean(episode),
    retry: 1
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      setPosition(video.currentTime);
      setDuration(Number.isFinite(video.duration) ? video.duration : 1);
    };
    const onError = () => setStatus("recovering");
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onTime);
    video.addEventListener("error", onError);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onTime);
      video.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !manifest.data) return;
    let cleanup: () => void = () => {};
    setStatus("loading");
    void (async () => {
      try {
        if (manifest.data.protocol === "hls") {
          if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = manifest.data.url;
          } else {
            const { default: Hls } = await import("hls.js");
            if (!Hls.isSupported()) throw new Error("HLS_NOT_SUPPORTED");
            const hls = new Hls({
              enableWorker: true,
              maxBufferLength: 30,
              xhrSetup: (xhr) => {
                for (const [key, value] of Object.entries(manifest.data.headers)) {
                  xhr.setRequestHeader(key, value);
                }
              }
            });
            hls.loadSource(manifest.data.url);
            hls.attachMedia(video);
            cleanup = () => hls.destroy();
          }
        } else if (manifest.data.protocol === "dash") {
          const dashjs = await import("dashjs");
          const player = dashjs.MediaPlayer().create();
          player.extend("RequestModifier", () => ({
            modifyRequestHeader: (xhr: XMLHttpRequest) => {
              for (const [key, value] of Object.entries(manifest.data.headers)) {
                xhr.setRequestHeader(key, value);
              }
              return xhr;
            },
            modifyRequestURL: (url: string) => url
          }), true);
          player.initialize(video, manifest.data.url, false);
          cleanup = () => player.destroy();
        } else {
          for (const track of manifest.data.subtitles) {
            const element = document.createElement("track");
            element.kind = "subtitles";
            element.label = track.label;
            element.srclang = track.language;
            element.src = track.url;
            video.append(element);
          }
          video.src = manifest.data.url;
        }
        video.load();
        setStatus("ready");
      } catch {
        setStatus("recovering");
      }
    })();
    return () => cleanup();
  }, [manifest.data]);

  useEffect(() => {
    if (detail.isError || manifest.isError) setStatus("recovering");
  }, [detail.isError, manifest.isError]);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function setVideoVolume(value: number) {
    setVolume(value);
    if (videoRef.current) videoRef.current.volume = value;
  }

  function seek(value: number) {
    if (videoRef.current) videoRef.current.currentTime = value;
    setPosition(value);
  }

  return (
    <section className="player-page" aria-label="MarsTV 播放器">
      <video
        ref={videoRef}
        poster="/art/hero-eclipse.png"
        playsInline
        onClick={togglePlayback}
      >
        <track kind="captions" src="/demo/captions.vtt" srcLang="zh" label="简体中文" default />
      </video>
      <div className="player-page__top">
        <div>
          <strong>{detail.data?.title ?? "MarsTV 播放器"}</strong>
          <span>{episode?.label ?? "正在准备授权媒体"}</span>
        </div>
        <span>主线 · MacCMS</span>
      </div>
      {status === "recovering" ? (
        <div className="player-recovery" role="alert">
          <RotateCcw aria-hidden="true" />
          <h2>无法连接到当前资源</h2>
          <p>{sourceId === "demo"
            ? "官方演示源只包含原创目录，不附带媒体文件。请连接你有权使用的来源。"
            : "媒体连接失败。可以重试连接或返回详情页切换授权来源。"}</p>
          <button className="button button--primary" type="button" onClick={() => {
            void Promise.all([detail.refetch(), manifest.refetch()]);
          }}>重试连接</button>
        </div>
      ) : null}
      {status === "loading" ? <div className="loading-line" aria-label="正在解析媒体" /> : null}
      <div className="player-controls">
        <label className="timeline">
          <span className="sr-only">播放进度</span>
          <input
            type="range"
            min="0"
            max={duration}
            step="0.1"
            value={position}
            onChange={(event) => seek(Number(event.target.value))}
          />
          <span>{formatTime(position)} / {formatTime(duration)}</span>
        </label>
        <div className="player-controls__row">
          <div>
            <button type="button" onClick={togglePlayback} aria-label={playing ? "暂停" : "播放"}>
              {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
            </button>
            <button type="button" aria-label="下一集"><SkipForward /></button>
            <label className="volume-control">
              <Volume2 aria-hidden="true" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(event) => setVideoVolume(Number(event.target.value))}
                aria-label="音量"
              />
            </label>
          </div>
          <div>
            <span className="episode-id">{episodeId.split(":").at(-1)}</span>
            <button type="button" aria-label="字幕"><Captions /></button>
            <button type="button" aria-label="播放器设置"><Settings /></button>
            <button type="button" aria-label="全屏" onClick={() => document.fullscreenElement
              ? document.exitFullscreen()
              : document.documentElement.requestFullscreen()}>
              <Maximize />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
