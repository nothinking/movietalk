import { useState, useRef, useEffect } from "react";

const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const SkipBackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);

const SkipForwardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

// ── Video List Screen ──
function VideoListScreen({ videos, onSelect }) {
  const formatDuration = (sec) => {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div style={{ padding: "20px", maxWidth: "640px", margin: "0 auto" }}>
      <div
        style={{
          textAlign: "center",
          marginBottom: "32px",
          paddingTop: "20px",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎬</div>
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "700",
            marginBottom: "8px",
          }}
        >
          학습할 영상을 선택하세요
        </h2>
        <p style={{ color: "#666", fontSize: "14px" }}>
          {videos.length}개의 영상이 준비되어 있습니다
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {videos.map((video) => (
          <div
            key={video.id}
            onClick={() => onSelect(video)}
            style={{
              background: "#111118",
              borderRadius: "14px",
              padding: "20px",
              cursor: "pointer",
              border: "1px solid #1a1a2e",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#6366f1";
              e.currentTarget.style.background = "#15151f";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1a1a2e";
              e.currentTarget.style.background = "#111118";
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "center",
              }}
            >
              {/* Thumbnail placeholder */}
              <div
                style={{
                  width: "120px",
                  height: "68px",
                  borderRadius: "8px",
                  background: `url(https://img.youtube.com/vi/${video.id}/mqdefault.jpg) center/cover`,
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                {video.duration > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "4px",
                      right: "4px",
                      background: "rgba(0,0,0,0.8)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {formatDuration(video.duration)}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#e8e8ed",
                    marginBottom: "6px",
                    lineHeight: "1.4",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {video.title}
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>
                  {video.channel}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#a5b4fc",
                      background: "#1a1a3e",
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    자막 {video.subtitleCount}개
                  </span>
                  {video.hasPronunciation !== false && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#34d399",
                        background: "#0a2e1e",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      🔊 발음 데이터
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add video hint */}
      <div
        style={{
          marginTop: "32px",
          padding: "20px",
          background: "#0d0d14",
          borderRadius: "12px",
          border: "1px dashed #333",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "13px", color: "#555", lineHeight: "1.8" }}>
          새 영상을 추가하려면 터미널에서:
          <br />
          <code
            style={{
              background: "#1a1a2e",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#a5b4fc",
            }}
          >
            python add_video.py "YouTube URL"
          </code>
        </p>
      </div>
    </div>
  );
}

// ── Player Screen ──
function PlayerScreen({ video, subtitles, onBack, onUpdateSubtitle, onMergeSubtitles, initialSubIndex, initialMode }) {
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);
  const [savedExpressions, setSavedExpressions] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [speed, setSpeed] = useState(1);
  const pollIntervalRef = useRef(null);
  const loopTargetRef = useRef(null);
  const [isLooping, setIsLooping] = useState(false);
  const continuousPlayRef = useRef(false);
  const [isContinuousPlay, setIsContinuousPlay] = useState(false);
  const [videoCollapsed, setVideoCollapsed] = useState(false);
  const sentenceRefs = useRef([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ pronunciation: "", translation: "" });
  const [isSaving, setIsSaving] = useState(false);
  const saveEditRef = useRef(null);
  const startEditingRef = useRef(null);
  const isEditingRef = useRef(false);
  const isSavingRef = useRef(false);
  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const studyModeRef = useRef(false);
  const studyIndexRef = useRef(0);

  const hasPronunciation =
    subtitles.length > 0 && "pronunciation" in subtitles[0];

  // 퍼머링크로 학습 모드 진입 (최초 1회만)
  const studyModeInitRef = useRef(false);
  useEffect(() => {
    if (studyModeInitRef.current) return;
    if (initialMode === "study" && hasPronunciation && subtitles.length > 0) {
      studyModeInitRef.current = true;
      const idx = initialSubIndex != null
        ? Math.max(0, subtitles.findIndex((s) => s.index === initialSubIndex))
        : 0;
      studyModeRef.current = true;
      studyIndexRef.current = idx;
      setStudyMode(true);
      setStudyIndex(idx);
    }
  }, [initialMode, hasPronunciation, subtitles.length]);

  // 키보드 단축키: ←→ 문장 이동, Space 일시정지/재생, Cmd+S 저장
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
          setHash(video.id, null);
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          const newIdx = Math.max(0, studyIndexRef.current - 1);
          studyIndexRef.current = newIdx;
          setStudyIndex(newIdx);
          setHash(video.id, subtitles[newIdx].index, false, "study");
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
          setHash(video.id, subtitles[newIdx].index, false, "study");
          if (loopTargetRef.current && playerInstanceRef.current) {
            const newSub = subtitles[newIdx];
            loopTargetRef.current = { start: newSub.start, end: newSub.end };
            playerInstanceRef.current.seekTo(newSub.start);
            playerInstanceRef.current.playVideo();
          }
          return;
        }
        if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          const sub = subtitles[studyIndexRef.current];
          if (!playerInstanceRef.current || !sub) return;
          if (loopTargetRef.current) {
            loopTargetRef.current = null;
            setIsLooping(false);
            playerInstanceRef.current.pauseVideo();
          } else {
            loopTargetRef.current = { start: sub.start, end: sub.end };
            setIsLooping(true);
            playerInstanceRef.current.seekTo(sub.start);
            playerInstanceRef.current.playVideo();
          }
          return;
        }
        if (e.key === " " || e.code === "Space") {
          e.preventDefault();
          const sub = subtitles[studyIndexRef.current];
          if (playerInstanceRef.current && sub) {
            if (loopTargetRef.current) {
              // 반복 중이면 seekTo만 (loopTarget이 반복 처리)
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

      // R: 현재 문장 반복 재생
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        repeatCurrentSentence();
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

  // Create YouTube player
  useEffect(() => {
    const container = playerRef.current;
    if (!container || !window.YT || !window.YT.Player) return;

    container.innerHTML = `<div id="yt-player-${video.id}"></div>`;

    playerInstanceRef.current = new window.YT.Player(
      `yt-player-${video.id}`,
      {
        height: "390",
        width: "100%",
        videoId: video.id,
        events: {
          onReady: () => {
            setPlayerReady(true);
            if (speed !== 1)
              playerInstanceRef.current.setPlaybackRate(speed);
            // 퍼머링크로 진입 시 해당 자막 위치로 이동
            if (initialSubIndex != null) {
              const target = subtitles.find((s) => s.index === initialSubIndex);
              if (target) {
                playerInstanceRef.current.seekTo(target.start);
                setCurrentTime(target.start);
              }
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
              const ct = playerInstanceRef.current.getCurrentTime();
              setCurrentTime(ct);
              const sub = subtitles.find(
                (s) => ct >= s.start && ct < s.end
              );
              if (sub) {
                setCurrentSubtitle(sub);
                setShowPanel(true);
                setExpandedNote(null);
              }
            } else if (event.data === YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopPolling();
            }
          },
          onError: (e) => console.error("YT Error:", e.data),
        },
        playerVars: { controls: 1, modestbranding: 1 },
      }
    );

    return () => {
      stopPolling();
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      }
    };
  }, [video.id]);

  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      if (
        playerInstanceRef.current &&
        playerInstanceRef.current.getCurrentTime
      ) {
        const ct = playerInstanceRef.current.getCurrentTime();
        setCurrentTime(ct);
        if (loopTargetRef.current && ct >= loopTargetRef.current.end) {
          playerInstanceRef.current.seekTo(loopTargetRef.current.start);
        }
        // 연속 재생: 현재 문장 끝나면 다음 문장으로 자동 이동
        if (continuousPlayRef.current && studyModeRef.current) {
          const sub = subtitles[studyIndexRef.current];
          if (sub && ct >= sub.end) {
            if (studyIndexRef.current < subtitles.length - 1) {
              const newIdx = studyIndexRef.current + 1;
              studyIndexRef.current = newIdx;
              setStudyIndex(newIdx);
              const newSub = subtitles[newIdx];
              playerInstanceRef.current.seekTo(newSub.start);
              setHash(video.id, newSub.index, false, "study");
            } else {
              // 마지막 문장 → 연속 재생 종료
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

  const activeSubtitle = subtitles.find(
    (s) => currentTime >= s.start && currentTime < s.end
  );
  const lastHashIndexRef = useRef(null);
  if (activeSubtitle && activeSubtitle.index !== lastHashIndexRef.current && !studyModeRef.current) {
    lastHashIndexRef.current = activeSubtitle.index;
    setHash(video.id, activeSubtitle.index);
  }

  const togglePlay = () => {
    if (!playerInstanceRef.current) return;
    isPlaying
      ? playerInstanceRef.current.pauseVideo()
      : playerInstanceRef.current.playVideo();
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

  const saveExpression = (note) => {
    if (!savedExpressions.find((e) => e.word === note.word)) {
      setSavedExpressions((prev) => [
        ...prev,
        {
          ...note,
          sentence: currentSubtitle?.text || activeSubtitle?.text,
        },
      ]);
    }
  };

  // 문장 이동/반복 함수 (키보드 + 모바일 버튼 공용)
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
    setHash(video.id, target.index);
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
    setHash(video.id, target.index);
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

  const startEditing = () => {
    if (studyModeRef.current) {
      const sub = subtitles[studyIndexRef.current];
      if (sub) {
        setEditData({
          pronunciation: sub.pronunciation || "",
          translation: sub.translation || "",
        });
        setIsEditing(true);
        isEditingRef.current = true;
      }
    } else if (currentSubtitle && showPanel) {
      setEditData({
        pronunciation: currentSubtitle.pronunciation || "",
        translation: currentSubtitle.translation || "",
      });
      setIsEditing(true);
      isEditingRef.current = true;
    }
  };
  startEditingRef.current = startEditing;

  const cancelEditing = () => {
    setIsEditing(false);
    isEditingRef.current = false;
    setEditData({ pronunciation: "", translation: "" });
  };

  const saveEdit = async () => {
    const targetSub = studyModeRef.current ? subtitles[studyIndexRef.current] : currentSubtitle;
    if (!targetSub) return;
    setIsSaving(true);
    isSavingRef.current = true;
    try {
      const res = await fetch(
        `/api/subtitle/${video.id}/${targetSub.index}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pronunciation: editData.pronunciation,
            translation: editData.translation,
          }),
        }
      );
      if (!res.ok) throw new Error("저장 실패");
      const result = await res.json();
      // 로컬 state 업데이트
      if (onUpdateSubtitle) onUpdateSubtitle(result.subtitle);
      if (!studyModeRef.current) {
        setCurrentSubtitle(result.subtitle);
      }
      setIsEditing(false);
      isEditingRef.current = false;
    } catch (err) {
      alert("저장 실패: " + err.message);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };
  saveEditRef.current = saveEdit;

  const [isMerging, setIsMerging] = useState(false);

  const mergeWithPrev = async () => {
    if (!studyModeRef.current || studyIndexRef.current <= 0) return;
    const curr = subtitles[studyIndexRef.current];
    if (!curr) return;

    if (!confirm(`"${subtitles[studyIndexRef.current - 1].text.slice(0, 30)}..." 에\n"${curr.text}" 를 합칩니다.\n\n계속할까요?`)) return;

    setIsMerging(true);
    try {
      const res = await fetch(`/api/subtitle/merge/${video.id}/${curr.index}`, { method: "POST" });
      if (!res.ok) throw new Error("합치기 실패");
      const result = await res.json();
      if (onMergeSubtitles) onMergeSubtitles(result.subtitles);
      // 합쳐진 후 이전 자막(합쳐진 결과)으로 이동
      const newIdx = Math.max(0, studyIndexRef.current - 1);
      studyIndexRef.current = newIdx;
      setStudyIndex(newIdx);
      setHash(video.id, result.subtitles[newIdx].index, false, "study");
    } catch (err) {
      alert("합치기 실패: " + err.message);
    } finally {
      setIsMerging(false);
    }
  };

  const [splitMode, setSplitMode] = useState(false);
  const [splitPoint, setSplitPoint] = useState(null);
  const [isSplitting, setIsSplitting] = useState(false);

  const startSplit = () => {
    setSplitMode(true);
    setSplitPoint(null);
  };
  const cancelSplit = () => {
    setSplitMode(false);
    setSplitPoint(null);
  };
  const confirmSplit = async () => {
    if (splitPoint == null) return;
    const sub = subtitles[studyIndexRef.current];
    if (!sub) return;

    setIsSplitting(true);
    try {
      const res = await fetch(`/api/subtitle/split/${video.id}/${sub.index}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splitAfterWord: splitPoint }),
      });
      if (!res.ok) throw new Error("분리 실패");
      const result = await res.json();
      if (onMergeSubtitles) onMergeSubtitles(result.subtitles);
      setHash(video.id, result.subtitles[studyIndexRef.current].index, false, "study");
    } catch (err) {
      alert("분리 실패: " + err.message);
    } finally {
      setIsSplitting(false);
      setSplitMode(false);
      setSplitPoint(null);
    }
  };

  return (
    <>
      {/* Sub-header: back button + title */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid #1a1a2e",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "#1a1a2e",
            border: "none",
            color: "#a5b4fc",
            padding: "6px 12px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          ← 목록
        </button>
        <span
          style={{
            fontSize: "13px",
            color: "#888",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {video.title}
        </span>
        {hasPronunciation && (
          <button
            onClick={() => {
              if (studyMode) {
                studyModeRef.current = false;
                setStudyMode(false);
                loopTargetRef.current = null;
                setIsLooping(false);
                continuousPlayRef.current = false;
                setIsContinuousPlay(false);
                if (playerInstanceRef.current) playerInstanceRef.current.pauseVideo();
                setHash(video.id, activeSubtitle ? activeSubtitle.index : null);
              } else {
                const idx = activeSubtitle
                  ? subtitles.findIndex((s) => s.index === activeSubtitle.index)
                  : 0;
                const newIdx = Math.max(0, idx);
                studyModeRef.current = true;
                studyIndexRef.current = newIdx;
                setStudyMode(true);
                setStudyIndex(newIdx);
                setExpandedNote(null);
                setHash(video.id, subtitles[newIdx].index, false, "study");
                if (playerInstanceRef.current) playerInstanceRef.current.pauseVideo();
              }
            }}
            style={{
              background: studyMode ? "#6366f1" : "#1a1a2e",
              border: "none",
              color: studyMode ? "#fff" : "#a5b4fc",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              flexShrink: 0,
            }}
          >
            {studyMode ? "▶ 영상" : "📖 학습"}
          </button>
        )}
      </div>

      {showSaved ? (
        <div
          style={{ padding: "20px", maxWidth: "640px", margin: "0 auto" }}
        >
          <h3 style={{ marginBottom: "16px", fontSize: "16px" }}>
            저장한 표현들
          </h3>
          {savedExpressions.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#666",
                padding: "40px",
                background: "#111118",
                borderRadius: "12px",
              }}
            >
              <p style={{ fontSize: "32px", marginBottom: "12px" }}>📭</p>
              <p>아직 저장한 표현이 없어요</p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {savedExpressions.map((expr, i) => (
                <div
                  key={i}
                  style={{
                    background: "#111118",
                    borderRadius: "12px",
                    padding: "16px",
                    borderLeft: "3px solid #6366f1",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          color: "#a5b4fc",
                          fontWeight: "700",
                          fontSize: "16px",
                        }}
                      >
                        {expr.word}
                      </span>
                      <span
                        style={{
                          color: "#fbbf24",
                          marginLeft: "10px",
                          fontSize: "15px",
                        }}
                      >
                        {expr.actual}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setSavedExpressions((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#555",
                        cursor: "pointer",
                        fontSize: "18px",
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div
                    style={{
                      color: "#888",
                      fontSize: "13px",
                      marginTop: "6px",
                    }}
                  >
                    {expr.meaning}
                  </div>
                  <div
                    style={{
                      color: "#555",
                      fontSize: "12px",
                      marginTop: "8px",
                      fontStyle: "italic",
                    }}
                  >
                    "{expr.sentence}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          {/* Study Mode */}
          {studyMode && subtitles[studyIndex] && (
            <div style={{ padding: "20px", animation: "slideUp 0.3s ease-out" }}>
              <style>{`
                @keyframes slideUp {
                  from { opacity: 0; transform: translateY(16px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
              {/* Navigation */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <button
                  onClick={() => {
                    const newIdx = Math.max(0, studyIndex - 1);
                    studyIndexRef.current = newIdx;
                    setStudyIndex(newIdx);
                    setExpandedNote(null);
                    if (isEditing) cancelEditing();
                    if (splitMode) cancelSplit();
                    setHash(video.id, subtitles[newIdx].index, false, "study");
                    if (loopTargetRef.current && playerInstanceRef.current) {
                      const newSub = subtitles[newIdx];
                      loopTargetRef.current = { start: newSub.start, end: newSub.end };
                      playerInstanceRef.current.seekTo(newSub.start);
                      playerInstanceRef.current.playVideo();
                    }
                  }}
                  disabled={studyIndex === 0}
                  style={{
                    background: "#1a1a2e",
                    border: "1px solid #2a2a3e",
                    color: studyIndex === 0 ? "#444" : "#a5b4fc",
                    cursor: studyIndex === 0 ? "not-allowed" : "pointer",
                    padding: "10px 20px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  ← 이전
                </button>
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#888",
                      fontWeight: "600",
                      fontFamily: "monospace",
                    }}
                  >
                    {studyIndex + 1} / {subtitles.length}
                  </span>
                  <button
                    onClick={(e) => {
                      const url = `${window.location.origin}${window.location.pathname}#v=${video.id}&s=${subtitles[studyIndex].index}&m=study`;
                      navigator.clipboard.writeText(url);
                      e.currentTarget.textContent = "✓";
                      setTimeout(() => { e.currentTarget.textContent = "🔗"; }, 1000);
                    }}
                    style={{
                      background: "transparent", border: "none", color: "#555",
                      cursor: "pointer", fontSize: "13px", padding: "2px 4px",
                    }}
                    title="학습 퍼머링크 복사"
                  >
                    🔗
                  </button>
                </span>
                <button
                  onClick={() => {
                    const newIdx = Math.min(subtitles.length - 1, studyIndex + 1);
                    studyIndexRef.current = newIdx;
                    setStudyIndex(newIdx);
                    setExpandedNote(null);
                    if (isEditing) cancelEditing();
                    if (splitMode) cancelSplit();
                    setHash(video.id, subtitles[newIdx].index, false, "study");
                    if (loopTargetRef.current && playerInstanceRef.current) {
                      const newSub = subtitles[newIdx];
                      loopTargetRef.current = { start: newSub.start, end: newSub.end };
                      playerInstanceRef.current.seekTo(newSub.start);
                      playerInstanceRef.current.playVideo();
                    }
                  }}
                  disabled={studyIndex === subtitles.length - 1}
                  style={{
                    background: "#1a1a2e",
                    border: "1px solid #2a2a3e",
                    color: studyIndex === subtitles.length - 1 ? "#444" : "#a5b4fc",
                    cursor: studyIndex === subtitles.length - 1 ? "not-allowed" : "pointer",
                    padding: "10px 20px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  다음 →
                </button>
              </div>

              {/* Original */}
              <div style={{ background: splitMode ? "#111125" : "#111118", borderRadius: "14px", padding: "20px", marginBottom: "12px", border: splitMode ? "1px solid #6366f1" : "1px solid transparent", transition: "all 0.2s" }}>
                <div style={{ fontSize: "11px", color: "#6366f1", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
                  {splitMode ? "✂️ 분리할 위치를 선택하세요" : "Original"}
                </div>
                {splitMode ? (
                  <div style={{ fontSize: "18px", fontWeight: "600", lineHeight: "2", color: "#fff", display: "flex", flexWrap: "wrap", gap: "0px", alignItems: "center" }}>
                    {subtitles[studyIndex].text.split(/\s+/).map((word, wi, arr) => (
                      <span key={wi} style={{ display: "inline-flex", alignItems: "center" }}>
                        <span style={{
                          padding: "2px 4px", borderRadius: "4px",
                          background: splitPoint != null && wi < splitPoint ? "#1a1a4e" : "transparent",
                          color: splitPoint != null && wi < splitPoint ? "#a5b4fc" : "#fff",
                        }}>{word}</span>
                        {wi < arr.length - 1 && (
                          <button
                            onClick={() => setSplitPoint(wi + 1)}
                            style={{
                              background: splitPoint === wi + 1 ? "#ef4444" : "#2a2a3e",
                              border: "none",
                              color: splitPoint === wi + 1 ? "#fff" : "#666",
                              cursor: "pointer",
                              padding: "0 3px",
                              margin: "0 2px",
                              borderRadius: "3px",
                              fontSize: "16px",
                              lineHeight: "1.4",
                              minWidth: "16px",
                              fontWeight: "900",
                            }}
                            title={`"${arr.slice(0, wi + 1).join(' ')}" | "${arr.slice(wi + 1).join(' ')}"`}
                          >|</button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "18px", fontWeight: "600", lineHeight: "1.5", color: "#fff" }}>
                    {subtitles[studyIndex].text}
                  </div>
                )}
                {splitMode && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                    <button
                      onClick={confirmSplit}
                      disabled={splitPoint == null || isSplitting}
                      style={{
                        flex: 1, background: splitPoint != null ? "#ef4444" : "#333", border: "none", color: "#fff",
                        padding: "10px", borderRadius: "8px", cursor: splitPoint != null && !isSplitting ? "pointer" : "not-allowed",
                        fontSize: "13px", fontWeight: "700", opacity: splitPoint != null ? 1 : 0.4,
                      }}
                    >
                      {isSplitting ? "분리 중..." : "✂️ 여기서 분리"}
                    </button>
                    <button
                      onClick={cancelSplit}
                      style={{
                        flex: 1, background: "#1a1a2e", border: "1px solid #2a2a3e", color: "#888",
                        padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600",
                      }}
                    >취소</button>
                  </div>
                )}
              </div>

              {/* Pronunciation + Translation */}
              {hasPronunciation && (
                <>
                  <div style={{ background: "linear-gradient(135deg, #1a1520, #1a1a2e)", borderRadius: "14px", padding: "20px", marginBottom: "12px", border: "1px solid #2a2040" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
                        🔊 실제 발음
                      </div>
                      {!isEditing && !splitMode && (
                        <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          {studyIndex > 0 && (
                            <button
                              onClick={mergeWithPrev}
                              disabled={isMerging}
                              style={{ background: "none", border: "none", color: "#555", cursor: isMerging ? "not-allowed" : "pointer", fontSize: "13px", padding: "2px 6px", opacity: isMerging ? 0.5 : 1 }}
                              title="이전 문장에 합치기"
                            >
                              {isMerging ? "..." : "⤴"}
                            </button>
                          )}
                          {subtitles[studyIndex].text.split(/\s+/).length >= 2 && (
                            <button
                              onClick={startSplit}
                              style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "13px", padding: "2px 6px" }}
                              title="문장 분리"
                            >
                              ✂️
                            </button>
                          )}
                          <button
                            onClick={startEditing}
                            style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "14px", padding: "2px 6px" }}
                          >
                            ✏️
                          </button>
                        </span>
                      )}
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.pronunciation}
                        onChange={(e) => setEditData({ ...editData, pronunciation: e.target.value })}
                        style={{
                          width: "100%", background: "#0d0d15", border: "1px solid #fbbf24", borderRadius: "8px",
                          padding: "10px 12px", color: "#fbbf24", fontSize: "20px", fontWeight: "700",
                          outline: "none", boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: "20px", fontWeight: "700", lineHeight: "1.5", color: "#fbbf24" }}>
                        {subtitles[studyIndex].pronunciation}
                      </div>
                    )}
                  </div>

                  <div style={{ background: "#111118", borderRadius: "14px", padding: "20px", marginBottom: isEditing ? "12px" : "16px" }}>
                    <div style={{ fontSize: "11px", color: "#34d399", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
                      🇰🇷 해석
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.translation}
                        onChange={(e) => setEditData({ ...editData, translation: e.target.value })}
                        style={{
                          width: "100%", background: "#0d0d15", border: "1px solid #34d399", borderRadius: "8px",
                          padding: "10px 12px", color: "#a5f3c4", fontSize: "17px", fontWeight: "500",
                          outline: "none", boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: "17px", fontWeight: "500", lineHeight: "1.5", color: "#a5f3c4" }}>
                        {subtitles[studyIndex].translation}
                      </div>
                    )}
                  </div>

                  {/* Save/Cancel buttons in edit mode */}
                  {isEditing && (
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                      <button
                        onClick={saveEdit}
                        disabled={isSaving}
                        style={{
                          flex: 1, background: "#6366f1", border: "none", color: "white",
                          padding: "12px", borderRadius: "10px", cursor: isSaving ? "not-allowed" : "pointer",
                          fontSize: "14px", fontWeight: "700", opacity: isSaving ? 0.6 : 1,
                        }}
                      >
                        {isSaving ? "저장 중..." : "💾 저장 (⌘S)"}
                      </button>
                      <button
                        onClick={cancelEditing}
                        style={{
                          flex: 1, background: "#1a1a2e", border: "1px solid #2a2a3e", color: "#888",
                          padding: "12px", borderRadius: "10px", cursor: "pointer",
                          fontSize: "14px", fontWeight: "600",
                        }}
                      >
                        취소 (Esc)
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Notes */}
              {subtitles[studyIndex].notes && subtitles[studyIndex].notes.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#888", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px", padding: "0 4px" }}>
                    💡 발음 포인트
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {subtitles[studyIndex].notes.map((note, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#111118",
                          borderRadius: "12px",
                          padding: "14px 16px",
                          cursor: "pointer",
                          border: expandedNote === i ? "1px solid #6366f1" : "1px solid transparent",
                          transition: "all 0.2s",
                        }}
                        onClick={() => setExpandedNote(expandedNote === i ? null : i)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ color: "#a5b4fc", fontWeight: "700", fontSize: "15px", fontFamily: "monospace" }}>
                              {note.word}
                            </span>
                            <span style={{ color: "#444" }}>→</span>
                            <span style={{ color: "#fbbf24", fontWeight: "700", fontSize: "15px" }}>
                              {note.actual}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); saveExpression(note); }}
                            style={{
                              background: savedExpressions.find((e) => e.word === note.word) ? "#22c55e" : "#2a2a3e",
                              border: "none", color: "white", padding: "4px 10px",
                              borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                            }}
                          >
                            {savedExpressions.find((e) => e.word === note.word) ? "✓" : "+"}
                          </button>
                        </div>
                        {expandedNote === i && (
                          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #222", color: "#999", fontSize: "13px", lineHeight: "1.6" }}>
                            {note.meaning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Listen & Loop buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  onClick={() => {
                    const sub = subtitles[studyIndex];
                    if (playerInstanceRef.current && sub) {
                      if (loopTargetRef.current) {
                        // 반복 중이면 seekTo만 (loopTarget이 반복 처리)
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
                  }}
                  disabled={!playerReady}
                  style={{
                    flex: 1,
                    background: "#6366f1",
                    border: "none",
                    color: "white",
                    padding: "14px",
                    borderRadius: "12px",
                    cursor: playerReady ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: "700",
                    opacity: playerReady ? 1 : 0.5,
                  }}
                >
                  🔊 이 문장 듣기
                </button>
                <button
                  onClick={() => {
                    const sub = subtitles[studyIndex];
                    if (!playerInstanceRef.current || !sub) return;
                    if (continuousPlayRef.current) {
                      // 연속 재생 해제
                      continuousPlayRef.current = false;
                      setIsContinuousPlay(false);
                      playerInstanceRef.current.pauseVideo();
                    } else {
                      // 연속 재생 시작 (반복 모드 해제)
                      loopTargetRef.current = null;
                      setIsLooping(false);
                      continuousPlayRef.current = true;
                      setIsContinuousPlay(true);
                      playerInstanceRef.current.seekTo(sub.start);
                      playerInstanceRef.current.playVideo();
                    }
                  }}
                  disabled={!playerReady}
                  style={{
                    background: isContinuousPlay ? "#059669" : "#1a1a2e",
                    border: isContinuousPlay ? "1px solid #10b981" : "1px solid #2a2a3e",
                    color: isContinuousPlay ? "#d1fae5" : "#a5b4fc",
                    padding: "14px 18px",
                    borderRadius: "12px",
                    cursor: playerReady ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: "700",
                    opacity: playerReady ? 1 : 0.5,
                    transition: "all 0.2s",
                  }}
                  title="연속 재생"
                >
                  ▶▶ {isContinuousPlay ? "재생 중" : "연속"}
                </button>
                <button
                  onClick={() => {
                    const sub = subtitles[studyIndex];
                    if (!playerInstanceRef.current || !sub) return;
                    if (loopTargetRef.current) {
                      // 반복 해제
                      loopTargetRef.current = null;
                      setIsLooping(false);
                      playerInstanceRef.current.pauseVideo();
                    } else {
                      // 반복 시작 (연속 재생 해제)
                      continuousPlayRef.current = false;
                      setIsContinuousPlay(false);
                      loopTargetRef.current = { start: sub.start, end: sub.end };
                      setIsLooping(true);
                      playerInstanceRef.current.seekTo(sub.start);
                      playerInstanceRef.current.playVideo();
                    }
                  }}
                  disabled={!playerReady}
                  style={{
                    background: isLooping ? "#4f46e5" : "#1a1a2e",
                    border: isLooping ? "1px solid #6366f1" : "1px solid #2a2a3e",
                    color: isLooping ? "#e0e7ff" : "#a5b4fc",
                    padding: "14px 18px",
                    borderRadius: "12px",
                    cursor: playerReady ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: "700",
                    opacity: playerReady ? 1 : 0.5,
                    transition: "all 0.2s",
                  }}
                  title="반복 재생 (R)"
                >
                  🔄 {isLooping ? "반복 중" : "반복"}
                </button>
              </div>

            </div>
          )}

          <div style={{ display: studyMode ? "none" : "block" }}>
          {/* Video collapse toggle */}
          <div
            onClick={() => setVideoCollapsed(!videoCollapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              background: "#0d0d14",
              borderBottom: "1px solid #1a1a2e",
              cursor: "pointer",
              userSelect: "none",
              gap: "6px",
              fontSize: "12px",
              color: "#666",
            }}
          >
            <span style={{ transform: videoCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
            {videoCollapsed ? "영상 펼치기" : "영상 접기"}
          </div>

          {/* YouTube Player */}
          <div
            ref={playerRef}
            style={{
              width: "100%",
              background: "#000",
              display: videoCollapsed ? "none" : "block",
            }}
          >
            <div id={`yt-player-${video.id}`}></div>
          </div>

          {/* Real-time subtitle bar */}
          <div
            style={{
              background: isLooping ? "#1a1528" : "#111118",
              borderBottom: isLooping ? "1px solid #6366f1" : "1px solid #1a1a2e",
              padding: "12px 20px",
              height: "100px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {isLooping && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#a5b4fc",
                  marginBottom: "6px",
                  fontWeight: "600",
                }}
              >
                🔄 반복 재생 중 — 일시정지하면 해제됩니다
              </div>
            )}
            {activeSubtitle ? (
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#ccc",
                    marginBottom: hasPronunciation ? "6px" : "0",
                    lineHeight: "1.4",
                  }}
                >
                  {activeSubtitle.text}
                </div>
                {hasPronunciation && (
                  <>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        color: "#fbbf24",
                        lineHeight: "1.4",
                      }}
                    >
                      🔊 {activeSubtitle.pronunciation}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#a5f3c4",
                        marginTop: "4px",
                        lineHeight: "1.4",
                      }}
                    >
                      {activeSubtitle.translation}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div
                style={{
                  fontSize: "12px",
                  color: "#444",
                  textAlign: "center",
                }}
              >
                자막 대기 중...
              </div>
            )}
          </div>

          {/* Progress bar */}
          {playerReady && (
            <div
              style={{
                position: "relative",
                height: "4px",
                background: "#1a1a2e",
                cursor: "pointer",
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seekTo(
                  ((e.clientX - rect.left) / rect.width) * getDuration()
                );
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${getDuration() > 0 ? (currentTime / getDuration()) * 100 : 0}%`,
                  background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                  borderRadius: "2px",
                  transition: isPlaying ? "none" : "width 0.2s",
                }}
              />
              {subtitles.map((sub, i) => {
                const d = getDuration() || 100;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: "-1px",
                      left: `${(sub.start / d) * 100}%`,
                      width: `${((sub.end - sub.start) / d) * 100}%`,
                      height: "6px",
                      background: "rgba(99,102,241,0.2)",
                      borderRadius: "1px",
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 16px",
              gap: "12px",
              background: "#0d0d14",
              borderBottom: "1px solid #1a1a2e",
            }}
          >
            <button
              onClick={skipBack}
              disabled={!playerReady}
              style={{
                background: "none",
                border: "none",
                color: "#888",
                cursor: playerReady ? "pointer" : "not-allowed",
                padding: "4px",
                opacity: playerReady ? 1 : 0.5,
              }}
            >
              <SkipBackIcon />
            </button>
            <button
              onClick={togglePlay}
              disabled={!playerReady}
              style={{
                background: "#6366f1",
                border: "none",
                color: "white",
                cursor: playerReady ? "pointer" : "not-allowed",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: playerReady ? 1 : 0.5,
              }}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              onClick={skipForward}
              disabled={!playerReady}
              style={{
                background: "none",
                border: "none",
                color: "#888",
                cursor: playerReady ? "pointer" : "not-allowed",
                padding: "4px",
                opacity: playerReady ? 1 : 0.5,
              }}
            >
              <SkipForwardIcon />
            </button>
            <span
              style={{ fontSize: "12px", color: "#666", minWidth: "70px" }}
            >
              {formatTime(currentTime)} / {formatTime(getDuration())}
            </span>
            <div style={{ flex: 1 }} />
            <select
              value={speed}
              onChange={(e) => updateSpeed(Number(e.target.value))}
              disabled={!playerReady}
              style={{
                background: "#1a1a2e",
                border: "1px solid #333",
                color: "#888",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: playerReady ? "pointer" : "not-allowed",
                opacity: playerReady ? 1 : 0.5,
              }}
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </div>

          {/* Mobile sentence controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 16px",
              gap: "8px",
              background: "#0d0d14",
              borderBottom: "1px solid #1a1a2e",
            }}
          >
            <button
              onClick={goToPrevSentence}
              disabled={!playerReady}
              style={{
                background: "#1a1a2e",
                border: "1px solid #2a2a3e",
                color: "#a5b4fc",
                cursor: playerReady ? "pointer" : "not-allowed",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                opacity: playerReady ? 1 : 0.5,
              }}
              title="이전 문장 (←)"
            >
              ⏮ 이전
            </button>
            <button
              onClick={togglePlay}
              disabled={!playerReady}
              style={{
                background: "#6366f1",
                border: "none",
                color: "white",
                cursor: playerReady ? "pointer" : "not-allowed",
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "700",
                opacity: playerReady ? 1 : 0.5,
              }}
              title="재생/일시정지 (Space)"
            >
              {isPlaying ? "⏸ 일시정지" : "▶ 재생"}
            </button>
            <button
              onClick={() => {
                if (isLooping) {
                  loopTargetRef.current = null;
                  setIsLooping(false);
                } else {
                  repeatCurrentSentence();
                }
              }}
              disabled={!playerReady}
              style={{
                background: isLooping ? "#4f46e5" : "#1a1a2e",
                border: isLooping ? "1px solid #6366f1" : "1px solid #2a2a3e",
                color: isLooping ? "#e0e7ff" : "#a5b4fc",
                cursor: playerReady ? "pointer" : "not-allowed",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                opacity: playerReady ? 1 : 0.5,
              }}
              title="반복 재생 (R)"
            >
              🔄 반복
            </button>
            <button
              onClick={goToNextSentence}
              disabled={!playerReady}
              style={{
                background: "#1a1a2e",
                border: "1px solid #2a2a3e",
                color: "#a5b4fc",
                cursor: playerReady ? "pointer" : "not-allowed",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                opacity: playerReady ? 1 : 0.5,
              }}
              title="다음 문장 (→)"
            >
              다음 ⏭
            </button>
          </div>

          {/* Learning Panel on pause */}
          {showPanel && currentSubtitle && hasPronunciation && (
            <div style={{ padding: "20px", animation: "slideUp 0.3s ease-out" }}>
              <style>{`
                @keyframes slideUp {
                  from { opacity: 0; transform: translateY(16px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              <div
                style={{
                  background: "#111118",
                  borderRadius: "14px",
                  padding: "20px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#6366f1",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "10px",
                  }}
                >
                  Original
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    lineHeight: "1.5",
                    color: "#fff",
                  }}
                >
                  {currentSubtitle.text}
                </div>
              </div>

              <div
                style={{
                  background: "linear-gradient(135deg, #1a1520, #1a1a2e)",
                  borderRadius: "14px",
                  padding: "20px",
                  marginBottom: "12px",
                  border: "1px solid #2a2040",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#fbbf24",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    🔊 실제 발음
                  </div>
                  {!isEditing && (
                    <button
                      onClick={startEditing}
                      style={{
                        background: "transparent",
                        border: "1px solid #444",
                        color: "#888",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      ✏️ 수정
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.pronunciation}
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, pronunciation: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isSaving) saveEdit();
                    }}
                    style={{
                      width: "100%",
                      fontSize: "20px",
                      fontWeight: "700",
                      lineHeight: "1.5",
                      color: "#fbbf24",
                      background: "#0d0d14",
                      border: "1px solid #6366f1",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      lineHeight: "1.5",
                      color: "#fbbf24",
                    }}
                  >
                    {currentSubtitle.pronunciation}
                  </div>
                )}
              </div>

              <div
                style={{
                  background: "#111118",
                  borderRadius: "14px",
                  padding: "20px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#34d399",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "10px",
                  }}
                >
                  🇰🇷 해석
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.translation}
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, translation: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isSaving) saveEdit();
                    }}
                    style={{
                      width: "100%",
                      fontSize: "17px",
                      fontWeight: "500",
                      lineHeight: "1.5",
                      color: "#a5f3c4",
                      background: "#0d0d14",
                      border: "1px solid #6366f1",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: "500",
                      lineHeight: "1.5",
                      color: "#a5f3c4",
                    }}
                  >
                    {currentSubtitle.translation}
                  </div>
                )}
              </div>

              {/* 편집 모드 저장/취소 버튼 */}
              {isEditing && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <button
                    onClick={saveEdit}
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      background: "#22c55e",
                      border: "none",
                      color: "white",
                      padding: "12px",
                      borderRadius: "10px",
                      cursor: isSaving ? "wait" : "pointer",
                      fontSize: "14px",
                      fontWeight: "700",
                      opacity: isSaving ? 0.6 : 1,
                    }}
                  >
                    {isSaving ? "저장 중..." : "✓ 저장"}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      background: "#1a1a2e",
                      border: "1px solid #333",
                      color: "#999",
                      padding: "12px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "700",
                    }}
                  >
                    ✕ 취소
                  </button>
                </div>
              )}

              {/* Notes */}
              {currentSubtitle.notes && currentSubtitle.notes.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#888",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "10px",
                      padding: "0 4px",
                    }}
                  >
                    💡 발음 포인트
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {currentSubtitle.notes.map((note, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#111118",
                          borderRadius: "12px",
                          padding: "14px 16px",
                          cursor: "pointer",
                          border:
                            expandedNote === i
                              ? "1px solid #6366f1"
                              : "1px solid transparent",
                          transition: "all 0.2s",
                        }}
                        onClick={() =>
                          setExpandedNote(expandedNote === i ? null : i)
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <span
                              style={{
                                color: "#a5b4fc",
                                fontWeight: "700",
                                fontSize: "15px",
                                fontFamily: "monospace",
                              }}
                            >
                              {note.word}
                            </span>
                            <span style={{ color: "#444" }}>→</span>
                            <span
                              style={{
                                color: "#fbbf24",
                                fontWeight: "700",
                                fontSize: "15px",
                              }}
                            >
                              {note.actual}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveExpression(note);
                            }}
                            style={{
                              background: savedExpressions.find(
                                (e) => e.word === note.word
                              )
                                ? "#22c55e"
                                : "#2a2a3e",
                              border: "none",
                              color: "white",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            {savedExpressions.find(
                              (e) => e.word === note.word
                            )
                              ? "✓"
                              : "+"}
                          </button>
                        </div>
                        {expandedNote === i && (
                          <div
                            style={{
                              marginTop: "10px",
                              paddingTop: "10px",
                              borderTop: "1px solid #222",
                              color: "#999",
                              fontSize: "13px",
                              lineHeight: "1.6",
                            }}
                          >
                            {note.meaning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                <button
                  onClick={() => {
                    if (playerInstanceRef.current && currentSubtitle) {
                      loopTargetRef.current = {
                        start: currentSubtitle.start,
                        end: currentSubtitle.end,
                      };
                      setIsLooping(true);
                      setShowPanel(false);
                      playerInstanceRef.current.seekTo(currentSubtitle.start);
                      playerInstanceRef.current.playVideo();
                    }
                  }}
                  style={{
                    flex: 1,
                    background: "#6366f1",
                    border: "none",
                    color: "white",
                    padding: "14px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "700",
                  }}
                >
                  🔄 반복 듣기
                </button>
                <button
                  onClick={() => {
                    loopTargetRef.current = null;
                    setIsLooping(false);
                    setShowPanel(false);
                    if (playerInstanceRef.current)
                      playerInstanceRef.current.playVideo();
                  }}
                  style={{
                    flex: 1,
                    background: "#1a1a2e",
                    border: "1px solid #333",
                    color: "#e8e8ed",
                    padding: "14px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "700",
                  }}
                >
                  ▶ 계속 재생
                </button>
              </div>
            </div>
          )}

          </div>

          {/* Sentence Timeline */}
          <div
            style={{ padding: "16px 20px", borderTop: "1px solid #1a1a2e" }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#555",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "10px",
              }}
            >
              문장 목록
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {subtitles.map((sub, i) => {
                const isActive = studyMode
                  ? i === studyIndex
                  : activeSubtitle && sub.index === activeSubtitle.index;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (studyMode) {
                        const newIdx = subtitles.findIndex((s) => s.index === sub.index);
                        if (newIdx !== -1) {
                          studyIndexRef.current = newIdx;
                          setStudyIndex(newIdx);
                          setExpandedNote(null);
                          setHash(video.id, sub.index, false, "study");
                        }
                      } else if (playerInstanceRef.current) {
                        loopTargetRef.current = null;
                        setIsLooping(false);
                        setShowPanel(false);
                        setHash(video.id, sub.index);
                        playerInstanceRef.current.seekTo(sub.start);
                        playerInstanceRef.current.playVideo();
                      }
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: isActive ? "#1a1a3e" : "transparent",
                      border: isActive
                        ? "1px solid #6366f1"
                        : "1px solid transparent",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#555",
                        minWidth: "36px",
                        fontFamily: "monospace",
                      }}
                    >
                      {formatTime(sub.start)}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: isActive ? "#a5b4fc" : "#777",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sub.text}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        let url = `${window.location.origin}${window.location.pathname}#v=${video.id}&s=${sub.index}`;
                        if (studyMode) url += `&m=study`;
                        navigator.clipboard.writeText(url);
                        e.currentTarget.textContent = "✓";
                        setTimeout(() => { e.currentTarget.textContent = "🔗"; }, 1000);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#444",
                        cursor: "pointer",
                        fontSize: "12px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        flexShrink: 0,
                      }}
                      title="퍼머링크 복사"
                    >
                      🔗
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Hash helpers ──
function parseHash() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return {
    videoId: params.get("v"),
    subtitleIndex: params.get("s") ? parseInt(params.get("s")) : null,
    mode: params.get("m") || null,
  };
}

function setHash(videoId, subtitleIndex, push = false, mode = null) {
  if (!videoId) {
    history.replaceState(null, "", window.location.pathname);
    return;
  }
  let h = `#v=${videoId}`;
  if (subtitleIndex != null) h += `&s=${subtitleIndex}`;
  if (mode) h += `&m=${mode}`;
  if (push) {
    history.pushState(null, "", h);
  } else {
    history.replaceState(null, "", h);
  }
}

// ── Main App ──
export default function MovieEnglishApp() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [initialSubIndex, setInitialSubIndex] = useState(null);
  const [initialMode, setInitialMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [ytApiReady, setYtApiReady] = useState(false);

  // 뒤로가기(popstate) 시 영상 목록으로 복귀
  useEffect(() => {
    const handlePopState = () => {
      const { videoId } = parseHash();
      if (!videoId) {
        setSelectedVideo(null);
        setSubtitles([]);
        setShowSaved(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtApiReady(true);
    } else {
      window.onYouTubeIframeAPIReady = () => setYtApiReady(true);
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.body.appendChild(s);
    }
    return () => {
      delete window.onYouTubeIframeAPIReady;
    };
  }, []);

  // Load video index + handle permalink on init
  useEffect(() => {
    fetch("/videos/index.json")
      .then((r) => {
        if (!r.ok) throw new Error("index.json not found");
        return r.json();
      })
      .then((data) => {
        setVideos(data);
        // 해시에 영상 ID가 있으면 자동 선택
        const { videoId, subtitleIndex, mode } = parseHash();
        if (videoId) {
          const found = data.find((v) => v.id === videoId);
          if (found) {
            setInitialSubIndex(subtitleIndex);
            setInitialMode(mode);
            loadVideo(found);
            return;
          }
        }
      })
      .catch((err) => console.log("영상 목록 로드 실패:", err.message))
      .finally(() => setLoading(false));
  }, []);

  // Load subtitle data
  const loadVideo = (video) => {
    setLoading(true);
    fetch(`/videos/${video.id}.json`)
      .then((r) => {
        if (!r.ok) throw new Error("data not found");
        return r.json();
      })
      .then((data) => {
        setSubtitles(data);
        setSelectedVideo(video);
      })
      .catch((err) => {
        console.error("자막 로드 실패:", err);
        alert("자막 데이터를 로드할 수 없습니다.");
      })
      .finally(() => setLoading(false));
  };

  const handleSelectVideo = (video) => {
    setInitialSubIndex(null);
    setInitialMode(null);
    setHash(video.id, null, true);
    loadVideo(video);
  };

  const handleBack = () => {
    setSelectedVideo(null);
    setSubtitles([]);
    setShowSaved(false);
    setHash(null);
  };

  const handleUpdateSubtitle = (updated) => {
    setSubtitles((prev) =>
      prev.map((s) => (s.index === updated.index ? updated : s))
    );
  };

  const handleMergeSubtitles = (newSubtitles) => {
    setSubtitles(newSubtitles);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#e8e8ed",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #1a1a2e",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: selectedVideo ? "pointer" : "default",
          }}
          onClick={selectedVideo ? handleBack : undefined}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}
          >
            🎬
          </div>
          <span style={{ fontWeight: "700", fontSize: "18px" }}>
            MovieTalk
          </span>
        </div>
        {selectedVideo && (
          <button
            onClick={() => setShowSaved(!showSaved)}
            style={{
              background: showSaved ? "#6366f1" : "#1a1a2e",
              border: "none",
              color: "#e8e8ed",
              padding: "8px 16px",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            📚 저장한 표현
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#666",
          }}
        >
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>
          로딩 중...
        </div>
      )}

      {/* Video list or Player */}
      {!loading && !selectedVideo && (
        <VideoListScreen videos={videos} onSelect={handleSelectVideo} />
      )}

      {!loading && selectedVideo && ytApiReady && (
        <PlayerScreen
          video={selectedVideo}
          subtitles={subtitles}
          onBack={handleBack}
          onUpdateSubtitle={handleUpdateSubtitle}
          onMergeSubtitles={handleMergeSubtitles}
          initialSubIndex={initialSubIndex}
          initialMode={initialMode}
        />
      )}
    </div>
  );
}
