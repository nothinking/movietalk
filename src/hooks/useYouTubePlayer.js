import { useState, useRef, useEffect } from "react";
import { setHash } from "./useHashRouter";

/**
 * YouTube IFrame Player 초기화 및 관리 훅
 */
export function useYouTubePlayer({
  videoId,
  subtitles,
  initialSubIndex,
  initialMode,
  speed,
  loopTargetRef,
  continuousPlayRef,
  studyModeRef,
  studyIndexRef,
  onStudyIndexChange,
}) {
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const pollIntervalRef = useRef(null);
  const [isLooping, setIsLooping] = useState(false);
  const [isContinuousPlay, setIsContinuousPlay] = useState(false);

  // 고유 DOM id를 위해 counter 사용
  const playerIdRef = useRef(0);

  useEffect(() => {
    const container = playerRef.current;
    if (!container || !window.YT || !window.YT.Player) return;

    if (playerInstanceRef.current) {
      try { playerInstanceRef.current.destroy(); } catch (e) {}
      playerInstanceRef.current = null;
    }

    setPlayerReady(false);
    setIsPlaying(false);

    const playerId = `yt-player-${videoId}-${++playerIdRef.current}`;
    container.innerHTML = `<div id="${playerId}"></div>`;

    const instance = new window.YT.Player(playerId, {
      height: "390",
      width: "100%",
      videoId,
      events: {
        onReady: () => {
          playerInstanceRef.current = instance;
          setPlayerReady(true);
          if (speed !== 1) {
            try { instance.setPlaybackRate(speed); } catch (e) {}
          }
          if (initialSubIndex != null) {
            const target = subtitles.find((s) => s.index === initialSubIndex);
            if (target) {
              instance.seekTo(target.start);
              setCurrentTime(target.start);
            }
          }
          if (initialMode === "edit" || initialMode === "study") {
            setTimeout(() => { try { instance.pauseVideo(); } catch(e) {} }, 300);
          }
        },
        onStateChange: (event) => {
          const YT = window.YT;
          if (!YT) return;
          if (event.data === YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            setShowPanel(false);
            startPolling();
          } else if (event.data === YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            loopTargetRef.current = null;
            setIsLooping(false);
            continuousPlayRef.current = false;
            setIsContinuousPlay(false);
            stopPolling();
            try {
              const ct = instance.getCurrentTime();
              setCurrentTime(ct);
              const sub = subtitles.find((s) => ct >= s.start && ct < s.end);
              if (sub) {
                setCurrentSubtitle(sub);
                setShowPanel(true);
              }
            } catch (e) {}
          } else if (event.data === YT.PlayerState.ENDED) {
            setIsPlaying(false);
            stopPolling();
          }
        },
        onError: (e) => {
          console.error("YT Error:", e.data);
          setPlayerReady(true);
        },
      },
      playerVars: { controls: 1, modestbranding: 1, playsinline: 1, rel: 0, autoplay: 0 },
    });

    playerInstanceRef.current = instance;

    const readyTimeout = setTimeout(() => {
      setPlayerReady((prev) => {
        if (!prev) console.warn("YT player onReady timeout — forcing playerReady");
        return true;
      });
    }, 8000);

    return () => {
      clearTimeout(readyTimeout);
      stopPolling();
      if (playerInstanceRef.current === instance) {
        try { instance.destroy(); } catch (e) {}
        playerInstanceRef.current = null;
      }
    };
  }, [videoId]);

  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      if (playerInstanceRef.current && playerInstanceRef.current.getCurrentTime) {
        const ct = playerInstanceRef.current.getCurrentTime();
        setCurrentTime(ct);
        if (loopTargetRef.current && ct >= loopTargetRef.current.end) {
          playerInstanceRef.current.seekTo(loopTargetRef.current.start);
        }
        if (continuousPlayRef.current && studyModeRef.current) {
          const sub = subtitles[studyIndexRef.current];
          if (sub && ct >= sub.end) {
            if (studyIndexRef.current < subtitles.length - 1) {
              const newIdx = studyIndexRef.current + 1;
              studyIndexRef.current = newIdx;
              onStudyIndexChange(newIdx);
              const newSub = subtitles[newIdx];
              playerInstanceRef.current.seekTo(newSub.start);
              setHash(videoId, newSub.index, false, "edit");
            } else {
              continuousPlayRef.current = false;
              setIsContinuousPlay(false);
              playerInstanceRef.current.pauseVideo();
            }
          }
        }
      }
    }, 100);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // 현재 활성 자막 추적
  const activeSubtitle = subtitles.find(
    (s) => currentTime >= s.start && currentTime < s.end
  );
  const lastHashIndexRef = useRef(null);
  if (activeSubtitle && activeSubtitle.index !== lastHashIndexRef.current && !studyModeRef.current) {
    lastHashIndexRef.current = activeSubtitle.index;
    setHash(videoId, activeSubtitle.index);
  }

  return {
    playerRef,
    playerInstanceRef,
    playerReady,
    isPlaying,
    currentTime,
    showPanel,
    setShowPanel,
    currentSubtitle,
    setCurrentSubtitle,
    activeSubtitle,
    isLooping,
    setIsLooping,
    isContinuousPlay,
    setIsContinuousPlay,
  };
}
