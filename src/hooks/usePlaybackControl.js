import { useState } from "react";
import { setHash } from "./useHashRouter";

/**
 * 재생 컨트롤 훅: 재생/정지, 속도, 탐색, 문장 이동, 반복
 */
export function usePlaybackControl({
  playerInstanceRef,
  isPlaying,
  subtitles,
  videoId,
  loopTargetRef,
  setIsLooping,
  setShowPanel,
}) {
  const [speed, setSpeed] = useState(1);

  const togglePlay = () => {
    const p = playerInstanceRef.current;
    if (!p) {
      console.warn("togglePlay: playerInstance is null");
      return;
    }
    try {
      if (isPlaying) p.pauseVideo();
      else p.playVideo();
    } catch (err) {
      console.error("togglePlay error:", err);
    }
  };

  const skipBack = () => {
    if (!playerInstanceRef.current) return;
    playerInstanceRef.current.seekTo(
      Math.max(0, playerInstanceRef.current.getCurrentTime() - 3)
    );
  };

  const skipForward = () => {
    if (!playerInstanceRef.current) return;
    const d = playerInstanceRef.current.getDuration();
    playerInstanceRef.current.seekTo(
      Math.min(d, playerInstanceRef.current.getCurrentTime() + 3)
    );
  };

  const seekTo = (t) =>
    playerInstanceRef.current && playerInstanceRef.current.seekTo(t);

  const updateSpeed = (s) => {
    setSpeed(s);
    if (playerInstanceRef.current) playerInstanceRef.current.setPlaybackRate(s);
  };

  const getDuration = () =>
    playerInstanceRef.current?.getDuration?.() || 0;

  const formatTime = (t) => {
    if (typeof t !== "number" || isNaN(t)) return "0:00";
    return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  };

  // 문장 이동 (영상 모드용)
  const goToPrevSentence = () => {
    if (!playerInstanceRef.current || subtitles.length === 0) return;
    const ct = playerInstanceRef.current.getCurrentTime();
    let currentIdx = subtitles.findIndex((s) => ct >= s.start && ct < s.end);
    if (currentIdx === -1) {
      currentIdx = subtitles.findIndex((s) => s.start > ct);
      if (currentIdx === -1) currentIdx = subtitles.length - 1;
      else if (currentIdx > 0) currentIdx -= 1;
    }
    const nextIdx = Math.max(0, currentIdx - 1);
    const target = subtitles[nextIdx];
    if (loopTargetRef.current) {
      loopTargetRef.current = { start: target.start, end: target.end };
    }
    setShowPanel(false);
    setHash(videoId, target.index);
    playerInstanceRef.current.seekTo(target.start);
    playerInstanceRef.current.playVideo();
  };

  const goToNextSentence = () => {
    if (!playerInstanceRef.current || subtitles.length === 0) return;
    const ct = playerInstanceRef.current.getCurrentTime();
    let currentIdx = subtitles.findIndex((s) => ct >= s.start && ct < s.end);
    if (currentIdx === -1) {
      currentIdx = subtitles.findIndex((s) => s.start > ct);
      if (currentIdx === -1) currentIdx = subtitles.length - 1;
      else if (currentIdx > 0) currentIdx -= 1;
    }
    const nextIdx = Math.min(subtitles.length - 1, currentIdx + 1);
    const target = subtitles[nextIdx];
    if (loopTargetRef.current) {
      loopTargetRef.current = { start: target.start, end: target.end };
    }
    setShowPanel(false);
    setHash(videoId, target.index);
    playerInstanceRef.current.seekTo(target.start);
    playerInstanceRef.current.playVideo();
  };

  const repeatCurrentSentence = () => {
    if (!playerInstanceRef.current) return;
    const ct = playerInstanceRef.current.getCurrentTime();
    const sub = subtitles.find((s) => ct >= s.start && ct < s.end);
    if (sub) {
      loopTargetRef.current = { start: sub.start, end: sub.end };
      setIsLooping(true);
      setShowPanel(false);
      playerInstanceRef.current.seekTo(sub.start);
      playerInstanceRef.current.playVideo();
    }
  };

  return {
    speed,
    togglePlay,
    skipBack,
    skipForward,
    seekTo,
    updateSpeed,
    getDuration,
    formatTime,
    goToPrevSentence,
    goToNextSentence,
    repeatCurrentSentence,
  };
}
