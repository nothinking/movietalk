import { useState, useRef, useEffect } from "react";
import { setHash } from "./useHashRouter";

/**
 * 학습 모드 상태 및 네비게이션 훅
 */
export function useStudyMode({
  videoId,
  subtitles,
  initialSubIndex,
  initialMode,
  hasPronunciation,
  playerInstanceRef,
  loopTargetRef,
  setIsLooping,
  continuousPlayRef,
  setIsContinuousPlay,
}) {
  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const [hudDisplay, setHudDisplay] = useState({ original: false, pronunciation: true, translation: false });
  const studyModeRef = useRef(false);
  const studyIndexRef = useRef(0);

  // 퍼머링크로 학습 모드 진입 (최초 1회만)
  const studyModeInitRef = useRef(false);
  useEffect(() => {
    if (studyModeInitRef.current) return;
    if ((initialMode === "edit" || initialMode === "study") && hasPronunciation && subtitles.length > 0) {
      studyModeInitRef.current = true;
      const idx = initialSubIndex != null
        ? Math.max(0, subtitles.findIndex((s) => s.index === initialSubIndex))
        : 0;
      studyModeRef.current = true;
      studyIndexRef.current = idx;
      setStudyMode(true);
      setStudyIndex(idx);
      setHash(videoId, subtitles[idx].index, false, "edit");
      if (playerInstanceRef.current) {
        try { playerInstanceRef.current.pauseVideo(); } catch (e) {}
      }
    }
  }, [initialMode, hasPronunciation, subtitles.length]);

  const enterStudyMode = (activeSubtitle) => {
    const idx = activeSubtitle
      ? subtitles.findIndex((s) => s.index === activeSubtitle.index)
      : 0;
    const newIdx = Math.max(0, idx);
    studyModeRef.current = true;
    studyIndexRef.current = newIdx;
    setStudyMode(true);
    setStudyIndex(newIdx);
    setHash(videoId, subtitles[newIdx].index, false, "edit");
    if (playerInstanceRef.current) playerInstanceRef.current.pauseVideo();
  };

  const exitStudyMode = (activeSubtitle) => {
    studyModeRef.current = false;
    setStudyMode(false);
    loopTargetRef.current = null;
    setIsLooping(false);
    continuousPlayRef.current = false;
    setIsContinuousPlay(false);
    if (playerInstanceRef.current) playerInstanceRef.current.pauseVideo();
    setHash(videoId, activeSubtitle ? activeSubtitle.index : null);
  };

  const navigateStudy = (direction, { cancelEditing, cancelSplit, setExpandedNote } = {}) => {
    const newIdx = direction === "prev"
      ? Math.max(0, studyIndex - 1)
      : Math.min(subtitles.length - 1, studyIndex + 1);
    studyIndexRef.current = newIdx;
    setStudyIndex(newIdx);
    if (setExpandedNote) setExpandedNote(null);
    if (cancelEditing) cancelEditing();
    if (cancelSplit) cancelSplit();
    setHash(videoId, subtitles[newIdx].index, false, "edit");
    if (loopTargetRef.current && playerInstanceRef.current) {
      const s = subtitles[newIdx];
      loopTargetRef.current = { start: s.start, end: s.end };
      playerInstanceRef.current.seekTo(s.start);
      playerInstanceRef.current.playVideo();
    }
  };

  return {
    studyMode,
    setStudyMode,
    studyIndex,
    setStudyIndex,
    hudDisplay,
    setHudDisplay,
    studyModeRef,
    studyIndexRef,
    enterStudyMode,
    exitStudyMode,
    navigateStudy,
  };
}
