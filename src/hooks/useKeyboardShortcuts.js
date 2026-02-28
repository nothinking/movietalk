import { useEffect } from "react";
import { setHash } from "./useHashRouter";

/**
 * 키보드 단축키 통합 훅
 */
export function useKeyboardShortcuts({
  videoId,
  subtitles,
  playerInstanceRef,
  studyModeRef,
  studyIndexRef,
  isEditingRef,
  isSavingRef,
  saveEditRef,
  startEditingRef,
  loopTargetRef,
  continuousPlayRef,
  setStudyMode,
  setStudyIndex,
  setIsLooping,
  setIsContinuousPlay,
  goToPrevSentence,
  goToNextSentence,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+E / Ctrl+E: 편집 모드 진입
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        if (!isEditingRef.current && startEditingRef.current) startEditingRef.current();
        return;
      }

      // Cmd+S / Ctrl+S: 편집 저장
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isEditingRef.current && !isSavingRef.current && saveEditRef.current) saveEditRef.current();
        return;
      }

      if (isEditingRef.current) return;

      // 학습 모드 네비게이션
      if (studyModeRef.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          studyModeRef.current = false;
          setStudyMode(false);
          loopTargetRef.current = null;
          setIsLooping(false);
          continuousPlayRef.current = false;
          setIsContinuousPlay(false);
          if (playerInstanceRef.current) playerInstanceRef.current.pauseVideo();
          setHash(videoId, null);
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          const newIdx = Math.max(0, studyIndexRef.current - 1);
          studyIndexRef.current = newIdx;
          setStudyIndex(newIdx);
          setHash(videoId, subtitles[newIdx].index, false, "edit");
          if (loopTargetRef.current && playerInstanceRef.current) {
            const newSub = subtitles[newIdx];
            loopTargetRef.current = { start: newSub.start, end: newSub.end };
            playerInstanceRef.current.seekTo(newSub.start);
            playerInstanceRef.current.playVideo();
          }
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          const newIdx = Math.min(subtitles.length - 1, studyIndexRef.current + 1);
          studyIndexRef.current = newIdx;
          setStudyIndex(newIdx);
          setHash(videoId, subtitles[newIdx].index, false, "edit");
          if (loopTargetRef.current && playerInstanceRef.current) {
            const newSub = subtitles[newIdx];
            loopTargetRef.current = { start: newSub.start, end: newSub.end };
            playerInstanceRef.current.seekTo(newSub.start);
            playerInstanceRef.current.playVideo();
          }
          return;
        }
        if (e.key === " " || e.code === "Space") {
          e.preventDefault();
          const sub = subtitles[studyIndexRef.current];
          if (playerInstanceRef.current && sub) {
            if (loopTargetRef.current) {
              playerInstanceRef.current.seekTo(sub.start);
              playerInstanceRef.current.playVideo();
            } else {
              playerInstanceRef.current.seekTo(sub.start);
              playerInstanceRef.current.playVideo();
              const checkEnd = setInterval(() => {
                if (playerInstanceRef.current) {
                  const ct = playerInstanceRef.current.getCurrentTime();
                  if (ct >= sub.end) {
                    playerInstanceRef.current.pauseVideo();
                    clearInterval(checkEnd);
                  }
                } else {
                  clearInterval(checkEnd);
                }
              }, 100);
            }
          }
          return;
        }
        return;
      }

      if (!playerInstanceRef.current) return;

      // Space: 일시정지/재생 토글
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        const state = playerInstanceRef.current.getPlayerState();
        if (state === window.YT.PlayerState.PLAYING) {
          playerInstanceRef.current.pauseVideo();
        } else {
          playerInstanceRef.current.playVideo();
        }
        return;
      }

      // ←→: 문장 이동
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      if (e.key === "ArrowLeft") goToPrevSentence();
      else goToNextSentence();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [subtitles]);
}
