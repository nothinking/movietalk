import { useState, useRef, useEffect, useCallback } from "react";
import {
  supabase,
  signInWithGoogle,
  signOut,
  getUserSubtitles,
  saveUserSubtitles,
  resetUserSubtitles,
  getSavedExpressions,
  addSavedExpression,
  removeSavedExpression,
  getFavoriteVideos,
  addFavoriteVideo,
  removeFavoriteVideo,
} from "./lib/supabase";

// ── Design Tokens ──
const T = {
  bg: "#0a0a0f",
  surface: "rgba(15,15,26,0.5)",
  surfaceSolid: "#0f0f1a",
  surfaceHover: "rgba(22,22,37,0.7)",
  border: "rgba(196,181,253,0.08)",
  borderHover: "rgba(99,102,241,0.3)",
  accent: "#6366f1",
  accentDark: "#4f46e5",
  accentLight: "#c4b5fd",
  gold: "#fbbf24",
  green: "#34d399",
  red: "#ef4444",
  text: "#e8e8ed",
  textSec: "#a0a0b8",
  textMuted: "#6b7280",
  shadow1: "0 2px 8px rgba(0,0,0,0.25)",
  shadow2: "0 4px 16px rgba(0,0,0,0.3)",
  shadow3: "0 8px 32px rgba(0,0,0,0.4)",
  glow: "0 0 20px rgba(99,102,241,0.15)",
  glowGold: "0 0 20px rgba(251,191,36,0.1)",
  blur: "blur(12px)",
  radius: { sm: "8px", md: "12px", lg: "16px", pill: "24px" },
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  // ── Cockpit tokens ──
  cockpit: {
    bezel: "linear-gradient(135deg, #1a1a22, #0f0f1a)",
    panel: "linear-gradient(180deg, #1c1c28, #141420)",
    panelFlat: "#1a1a26",
    glow: "0 0 30px rgba(99,102,241,0.25)",
    glowStrong: "0 0 40px rgba(99,102,241,0.4)",
    hudBg: "rgba(10,10,15,0.88)",
    hudBorder: "rgba(99,102,241,0.3)",
    // metallic borders — more opaque, gray-toned
    metalBorder: "1px solid rgba(80,80,100,0.4)",
    metalBorderHeavy: "2px solid rgba(90,90,110,0.5)",
    metalHighlight: "1px solid rgba(120,120,150,0.15)",
    labelColor: "#6b8aff",
    greenText: "#34d399",
    amberText: "#fbbf24",
    redText: "#ef4444",
    insetShadow: "inset 0 0 30px rgba(0,0,0,0.6)",
    // physical instrument surface — opaque, dark gray
    instrument: "linear-gradient(180deg, #252535, #1e1e2c)",
    instrumentFlat: "#222232",
    // 3D physical button
    btnUp: "linear-gradient(180deg, #3a3a50, #2a2a3e, #222236)",
    btnDown: "linear-gradient(180deg, #1e1e30, #2a2a3e, #323248)",
    btnBorder: "1px solid rgba(100,100,130,0.35)",
    btnShadow: "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    btnShadowPressed: "inset 0 2px 4px rgba(0,0,0,0.5)",
    // screw/rivet color
    screwColor: "rgba(100,100,120,0.5)",
    // panel seam
    seam: "1px solid rgba(60,60,80,0.4)",
  },
};

const GlobalStyles = () => (
  <style>{`
    ::selection { background: rgba(99,102,241,0.3); color: #fff; }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes glowPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
      50% { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
    }
    button:focus-visible {
      outline: 2px solid rgba(99,102,241,0.4);
      outline-offset: 2px;
    }
    input:focus-visible {
      outline: none;
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }
    @keyframes hudPulse {
      0%, 100% { box-shadow: 0 0 15px rgba(99,102,241,0.15), inset 0 0 20px rgba(99,102,241,0.03); }
      50% { box-shadow: 0 0 25px rgba(99,102,241,0.3), inset 0 0 20px rgba(99,102,241,0.06); }
    }
    @keyframes engineGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1); }
      50% { box-shadow: 0 0 35px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.15); }
    }
    @keyframes indicatorBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .hud-overlay { position: relative; }
    .hud-overlay::before, .hud-overlay::after {
      content: ''; position: absolute; width: 12px; height: 12px;
      border-color: rgba(99,102,241,0.4); border-style: solid;
    }
    .hud-overlay::before { top: 0; left: 0; border-width: 2px 0 0 2px; }
    .hud-overlay::after { bottom: 0; right: 0; border-width: 0 2px 2px 0; }

    /* Physical cockpit panel frame */
    .cockpit-panel {
      position: relative;
      background: linear-gradient(180deg, #1e1e2c, #161622);
      border-top: 2px solid rgba(90,90,110,0.5);
      border-bottom: 2px solid rgba(50,50,70,0.4);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.4);
    }
    /* Screw decoration corners */
    .cockpit-panel::before, .cockpit-panel::after {
      content: '⊕'; position: absolute; font-size: 8px;
      color: rgba(100,100,120,0.5); z-index: 2;
      text-shadow: 0 1px 1px rgba(0,0,0,0.5);
    }
    .cockpit-panel::before { top: 6px; left: 10px; }
    .cockpit-panel::after { top: 6px; right: 10px; }
    /* Panel seam dividers (vertical) */
    .panel-seam {
      width: 1px;
      background: linear-gradient(180deg, transparent, rgba(80,80,100,0.3), rgba(80,80,100,0.4), rgba(80,80,100,0.3), transparent);
      align-self: stretch;
    }
    /* Physical 3D button base */
    .phys-btn {
      background: linear-gradient(180deg, #3a3a50, #2a2a3e, #222236) !important;
      border: 1px solid rgba(100,100,130,0.35) !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
      transition: all 0.15s ease;
      position: relative;
    }
    .phys-btn:active:not(:disabled) {
      background: linear-gradient(180deg, #1e1e30, #2a2a3e, #323248) !important;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
      transform: translateY(1px);
    }
    .phys-btn:hover:not(:disabled) {
      border-color: rgba(130,130,160,0.5) !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08);
    }
    /* Indicator LED */
    .led {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      box-shadow: 0 0 4px currentColor;
      vertical-align: middle;
      margin-right: 4px;
    }
    .led-green { color: #34d399; background: #34d399; }
    .led-amber { color: #fbbf24; background: #fbbf24; }
    .led-red { color: #ef4444; background: #ef4444; }
    .led-blue { color: #6366f1; background: #6366f1; }
    .led-off { color: #333; background: #333; box-shadow: none; }
    .led-blink { animation: indicatorBlink 1s ease-in-out infinite; }
    /* Engraved label plate */
    .label-plate {
      display: inline-block;
      padding: 2px 8px;
      background: linear-gradient(180deg, #1a1a28, #161622);
      border: 1px solid rgba(70,70,90,0.4);
      border-radius: 3px;
      font-size: 9px;
      font-family: monospace;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.4);
    }
    /* Gauge bezel */
    .gauge-bezel {
      background: linear-gradient(180deg, #252535, #1a1a28);
      border: 2px solid rgba(80,80,100,0.45);
      border-radius: 8px;
      padding: 8px 16px;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.03);
    }
  `}</style>
);

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
function VideoListScreen({ videos, onSelect, favoriteIds, onToggleFavorite, user }) {
  const formatDuration = (sec) => {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };
  // 티켓용 가상 게이트/편명 생성

  return (
    <div style={{ padding: "20px", maxWidth: "640px", margin: "0 auto", animation: "fadeIn 0.4s ease" }}>
      {/* ── Departure Board Header ── */}
      <div style={{ textAlign: "center", marginBottom: "32px", paddingTop: "20px" }}>
        <div style={{ fontSize: "40px", marginBottom: "8px", filter: "drop-shadow(0 2px 8px rgba(99,102,241,0.3))" }}>✈️</div>
        <h2
          style={{
            fontSize: "13px",
            fontWeight: "700",
            marginBottom: "6px",
            color: T.cockpit.amberText,
            fontFamily: "monospace",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          MOVIETALK AIRLINES
        </h2>
        <div style={{
          fontSize: "22px",
          fontWeight: "700",
          marginBottom: "10px",
          background: "linear-gradient(135deg, #e8e8ed, #c4b5fd)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-0.02em",
        }}>
          영어 여행 출발 게이트
        </div>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "linear-gradient(180deg, #1e1e2c, #161622)",
          border: "1px solid rgba(80,80,100,0.4)",
          borderRadius: "6px",
          padding: "6px 16px",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
        }}>
          <span style={{ fontSize: "10px", color: T.cockpit.greenText, fontFamily: "monospace", fontWeight: "700", letterSpacing: "0.1em" }}>
            AVAILABLE FLIGHTS
          </span>
          <span style={{ fontSize: "14px", color: T.cockpit.amberText, fontFamily: "monospace", fontWeight: "700" }}>
            {videos.length}
          </span>
        </div>
      </div>

      {/* ── Ticket List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {[...videos].sort((a, b) => {
          const aIdx = favoriteIds.indexOf(a.id);
          const bIdx = favoriteIds.indexOf(b.id);
          if ((aIdx !== -1) !== (bIdx !== -1)) return aIdx !== -1 ? -1 : 1;
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          return 0;
        }).map((video, vi) => {
          const isFav = favoriteIds.includes(video.id);
          return (
          <div
            key={video.id}
            onClick={() => onSelect(video)}
            style={{
              display: "flex",
              cursor: "pointer",
              animation: `slideUp 0.4s ${T.ease} ${vi * 0.06}s both`,
              transition: `all 0.3s ${T.ease}`,
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: isFav ? `0 0 20px rgba(251,191,36,0.08), ${T.shadow2}` : T.shadow2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.1)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = isFav ? `0 0 20px rgba(251,191,36,0.08), ${T.shadow2}` : T.shadow2;
            }}
          >
            {/* ── Left: Main Ticket Body ── */}
            <div style={{
              flex: 1,
              background: "linear-gradient(135deg, #1c1c2e, #181828)",
              borderTop: isFav ? "2px solid rgba(251,191,36,0.3)" : "1px solid rgba(80,80,100,0.3)",
              borderBottom: isFav ? "2px solid rgba(251,191,36,0.3)" : "1px solid rgba(60,60,80,0.25)",
              borderLeft: isFav ? "2px solid rgba(251,191,36,0.3)" : "1px solid rgba(80,80,100,0.3)",
              padding: "16px 18px",
              position: "relative",
              minWidth: 0,
            }}>
              {/* Channel + Favorite */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  fontFamily: "monospace",
                  color: T.cockpit.amberText,
                  background: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  letterSpacing: "0.08em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "70%",
                }}>
                  {video.channel}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (user && supabase) onToggleFavorite(video.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: user ? "pointer" : "default",
                    fontSize: "18px",
                    padding: "2px",
                    lineHeight: 1,
                    color: isFav ? T.gold : T.textMuted,
                    transition: `all 0.3s ${T.ease}`,
                    filter: isFav ? "drop-shadow(0 0 4px rgba(251,191,36,0.3))" : "none",
                  }}
                  onMouseEnter={(e) => { if (user) e.currentTarget.style.transform = "scale(1.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {isFav ? "★" : "☆"}
                </button>
              </div>

              {/* Destination (Title) */}
              <div style={{
                fontSize: "15px",
                fontWeight: "600",
                color: T.text,
                marginBottom: "12px",
                lineHeight: "1.45",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}>
                {video.title}
              </div>

              {/* Flight info row */}
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "8px", color: T.textMuted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "2px" }}>DURATION</div>
                  <div style={{ fontSize: "13px", color: T.cockpit.greenText, fontFamily: "monospace", fontWeight: "700" }}>
                    {formatDuration(video.duration) || "--:--"}
                  </div>
                </div>
                <div style={{ width: "1px", height: "24px", background: "rgba(80,80,100,0.3)" }} />
                <div>
                  <div style={{ fontSize: "8px", color: T.textMuted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "2px" }}>SENTENCES</div>
                  <div style={{ fontSize: "13px", color: T.cockpit.labelColor, fontFamily: "monospace", fontWeight: "700" }}>
                    {video.subtitleCount}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Perforated tear line ── */}
            <div style={{
              width: "1px",
              background: "repeating-linear-gradient(180deg, rgba(80,80,100,0.4) 0px, rgba(80,80,100,0.4) 4px, transparent 4px, transparent 8px)",
              position: "relative",
            }}>
              {/* Top notch */}
              <div style={{ position: "absolute", top: "-6px", left: "-5px", width: "11px", height: "12px", borderRadius: "50%", background: T.bg }} />
              {/* Bottom notch */}
              <div style={{ position: "absolute", bottom: "-6px", left: "-5px", width: "11px", height: "12px", borderRadius: "50%", background: T.bg }} />
            </div>

            {/* ── Right: Thumbnail Stub ── */}
            <div style={{
              width: "140px",
              borderTop: isFav ? "2px solid rgba(251,191,36,0.3)" : "1px solid rgba(80,80,100,0.3)",
              borderBottom: isFav ? "2px solid rgba(251,191,36,0.3)" : "1px solid rgba(60,60,80,0.25)",
              borderRight: isFav ? "2px solid rgba(251,191,36,0.3)" : "1px solid rgba(80,80,100,0.3)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#0c0c18",
              overflow: "hidden",
            }}>
              <img
                src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                alt=""
                style={{
                  width: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          </div>
          );
        })}
      </div>

    </div>
  );
}

// ── Player Screen ──
function PlayerScreen({ video, subtitles, onBack, onUpdateSubtitle, onMergeSubtitles, initialSubIndex, initialMode, user, saveToSupabase, onResetToBase, showSaved, savedExpressions, setSavedExpressions }) {
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);
  const [speed, setSpeed] = useState(1);
  const pollIntervalRef = useRef(null);
  const loopTargetRef = useRef(null);
  const [isLooping, setIsLooping] = useState(false);
  const continuousPlayRef = useRef(false);
  const [isContinuousPlay, setIsContinuousPlay] = useState(false);
  const [videoCollapsed, setVideoCollapsed] = useState(() => {
    try { return localStorage.getItem("videoCollapsed") === "true"; } catch { return false; }
  });
  const sentenceRefs = useRef([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ pronunciation: "", translation: "", start: "", end: "" });
  const [linkAdjacent, setLinkAdjacent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveEditRef = useRef(null);
  const startEditingRef = useRef(null);
  const isEditingRef = useRef(false);
  const originalTimingRef = useRef(null);
  const isSavingRef = useRef(false);
  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  // HUD display toggles — which subtitle lines to show on the windshield overlay
  const [hudDisplay, setHudDisplay] = useState({ original: false, pronunciation: true, translation: false });
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
  // 고유 DOM id를 위해 counter 사용 (같은 video.id 재진입 시 충돌 방지)
  const playerIdRef = useRef(0);
  useEffect(() => {
    const container = playerRef.current;
    if (!container || !window.YT || !window.YT.Player) return;

    // 기존 플레이어가 있으면 먼저 정리
    if (playerInstanceRef.current) {
      try { playerInstanceRef.current.destroy(); } catch (e) {}
      playerInstanceRef.current = null;
    }

    setPlayerReady(false);
    setIsPlaying(false);

    const playerId = `yt-player-${video.id}-${++playerIdRef.current}`;
    container.innerHTML = `<div id="${playerId}"></div>`;

    const instance = new window.YT.Player(
      playerId,
      {
        height: "390",
        width: "100%",
        videoId: video.id,
        events: {
          onReady: () => {
            playerInstanceRef.current = instance;
            setPlayerReady(true);
            if (speed !== 1) {
              try { instance.setPlaybackRate(speed); } catch (e) {}
            }
            // 퍼머링크로 진입 시 해당 자막 위치로 이동
            if (initialSubIndex != null) {
              const target = subtitles.find((s) => s.index === initialSubIndex);
              if (target) {
                instance.seekTo(target.start);
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
              try {
                const ct = instance.getCurrentTime();
                setCurrentTime(ct);
                const sub = subtitles.find(
                  (s) => ct >= s.start && ct < s.end
                );
                if (sub) {
                  setCurrentSubtitle(sub);
                  setShowPanel(true);
                  setExpandedNote(null);
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
        playerVars: { controls: 1, modestbranding: 1, playsinline: 1, rel: 0 },
      }
    );

    // onReady 전에도 ref 설정 (togglePlay 등에서 접근 가능하도록)
    playerInstanceRef.current = instance;

    // Fallback: onReady가 8초 안에 호출되지 않으면 강제로 playerReady 설정
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
    const p = playerInstanceRef.current;
    if (!p) {
      console.warn("togglePlay: playerInstance is null");
      return;
    }
    try {
      if (isPlaying) {
        p.pauseVideo();
      } else {
        p.playVideo();
      }
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

  const saveExpression = async (note) => {
    const sentence = currentSubtitle?.text || activeSubtitle?.text;
    if (savedExpressions.find((e) => e.word === note.word && e.video_id === video.id)) return;
    const expr = { ...note, sentence, video_id: video.id };
    // DB 저장 (로그인 시)
    if (user && supabase) {
      const { data, error } = await addSavedExpression(video.id, expr);
      if (!error && data) {
        setSavedExpressions((prev) => [data, ...prev]);
        return;
      }
      if (error) console.error("표현 저장 실패:", error.message);
    }
    // 비로그인 또는 DB 실패 시 로컬 state만
    setSavedExpressions((prev) => [expr, ...prev]);
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

  // Supabase가 설정되어 있으면 로그인 필요
  const canEdit = !supabase || !!user;

  const startEditing = () => {
    if (!canEdit) return;
    if (studyModeRef.current) {
      const sub = subtitles[studyIndexRef.current];
      if (sub) {
        originalTimingRef.current = { start: sub.start, end: sub.end };
        setEditData({
          pronunciation: sub.pronunciation || "",
          translation: sub.translation || "",
          start: sub.start.toFixed(2),
          end: sub.end.toFixed(2),
        });
        setIsEditing(true);
        isEditingRef.current = true;
      }
    } else if (currentSubtitle && showPanel) {
      originalTimingRef.current = { start: currentSubtitle.start, end: currentSubtitle.end };
      setEditData({
        pronunciation: currentSubtitle.pronunciation || "",
        translation: currentSubtitle.translation || "",
        start: currentSubtitle.start.toFixed(2),
        end: currentSubtitle.end.toFixed(2),
      });
      setIsEditing(true);
      isEditingRef.current = true;
    }
  };
  startEditingRef.current = startEditing;

  const cancelEditing = () => {
    // 반복 재생 중이면 원래 타이밍으로 복원
    if (loopTargetRef.current && originalTimingRef.current) {
      loopTargetRef.current = { ...originalTimingRef.current };
    }
    originalTimingRef.current = null;
    setIsEditing(false);
    isEditingRef.current = false;
    setEditData({ pronunciation: "", translation: "", start: "", end: "" });
  };

  const saveEdit = async () => {
    const targetIdx = studyModeRef.current ? studyIndexRef.current : subtitles.findIndex(s => s.index === currentSubtitle?.index);
    const targetSub = subtitles[targetIdx];
    if (!targetSub) return;
    setIsSaving(true);
    isSavingRef.current = true;
    try {
      if (user && supabase) {
        // === Supabase 모드: 클라이언트에서 직접 수정 후 DB 저장 ===
        const newSubs = [...subtitles];
        const sub = { ...newSubs[targetIdx] };
        sub.pronunciation = editData.pronunciation;
        sub.translation = editData.translation;
        sub.start = parseFloat(editData.start);
        sub.end = parseFloat(editData.end);

        // 인접 자막 시간 연동
        const affected = [];
        if (linkAdjacent) {
          if (targetIdx > 0) {
            newSubs[targetIdx - 1] = { ...newSubs[targetIdx - 1], end: sub.start };
            affected.push(newSubs[targetIdx - 1]);
          }
          if (targetIdx < newSubs.length - 1) {
            newSubs[targetIdx + 1] = { ...newSubs[targetIdx + 1], start: sub.end };
            affected.push(newSubs[targetIdx + 1]);
          }
        }
        newSubs[targetIdx] = sub;

        // Supabase 저장
        await saveToSupabase(newSubs);

        // 로컬 state 업데이트
        if (onUpdateSubtitle) {
          onUpdateSubtitle(sub);
          affected.forEach((s) => onUpdateSubtitle(s));
        }
        if (!studyModeRef.current) setCurrentSubtitle(sub);
        if (loopTargetRef.current) {
          loopTargetRef.current = { start: sub.start, end: sub.end };
        }
      } else {
        // === 레거시 모드: Vite dev 서버 API ===
        const res = await fetch(
          `/api/subtitle/${video.id}/${targetSub.index}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pronunciation: editData.pronunciation,
              translation: editData.translation,
              start: parseFloat(editData.start),
              end: parseFloat(editData.end),
              linkAdjacent,
            }),
          }
        );
        if (!res.ok) throw new Error("저장 실패");
        const result = await res.json();
        if (onUpdateSubtitle) {
          onUpdateSubtitle(result.subtitle);
          if (result.affected) {
            result.affected.forEach((s) => onUpdateSubtitle(s));
          }
        }
        if (!studyModeRef.current) setCurrentSubtitle(result.subtitle);
        if (loopTargetRef.current) {
          loopTargetRef.current = { start: result.subtitle.start, end: result.subtitle.end };
        }
      }
      originalTimingRef.current = null;
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
      let newSubtitles;

      if (user && supabase) {
        // === Supabase 모드: 클라이언트에서 합치기 ===
        newSubtitles = [...subtitles];
        const currIdx = studyIndexRef.current;
        const prev = { ...newSubtitles[currIdx - 1] };
        const cur = newSubtitles[currIdx];

        prev.text = prev.text.trimEnd() + " " + cur.text.trimStart();
        prev.end = cur.end;
        if (prev.pronunciation && cur.pronunciation) {
          prev.pronunciation = prev.pronunciation.trimEnd() + " " + cur.pronunciation.trimStart();
        } else { delete prev.pronunciation; }
        if (prev.translation && cur.translation) {
          prev.translation = prev.translation.trimEnd() + " " + cur.translation.trimStart();
        } else { delete prev.translation; }
        if (prev.notes && cur.notes) { prev.notes = [...prev.notes, ...cur.notes]; }
        else if (cur.notes) { prev.notes = cur.notes; }

        newSubtitles[currIdx - 1] = prev;
        newSubtitles.splice(currIdx, 1);
        newSubtitles.forEach((s, i) => { s.index = i; });

        await saveToSupabase(newSubtitles);
      } else {
        // === 레거시 모드 ===
        const res = await fetch(`/api/subtitle/merge/${video.id}/${curr.index}`, { method: "POST" });
        if (!res.ok) throw new Error("합치기 실패");
        const result = await res.json();
        newSubtitles = result.subtitles;
      }

      if (onMergeSubtitles) onMergeSubtitles(newSubtitles);
      const newIdx = Math.max(0, studyIndexRef.current - 1);
      studyIndexRef.current = newIdx;
      setStudyIndex(newIdx);
      setHash(video.id, newSubtitles[newIdx].index, false, "study");
      if (loopTargetRef.current) {
        const newSub = newSubtitles[newIdx];
        loopTargetRef.current = { start: newSub.start, end: newSub.end };
      }
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
      let newSubtitles;

      if (user && supabase) {
        // === Supabase 모드: 클라이언트에서 분리 ===
        newSubtitles = [...subtitles];
        const idx = studyIndexRef.current;
        const words = sub.text.split(/\s+/);
        const textA = words.slice(0, splitPoint).join(" ");
        const textB = words.slice(splitPoint).join(" ");
        const ratio = textA.length / (textA.length + textB.length);
        const duration = sub.end - sub.start;
        const midTime = Math.round((sub.start + duration * ratio) * 100) / 100;

        const splitField = (text) => {
          if (!text) return [undefined, undefined];
          const fw = text.split(/\s+/);
          const r = Math.max(1, Math.min(fw.length - 1, Math.round(fw.length * ratio)));
          return [fw.slice(0, r).join(" "), fw.slice(r).join(" ")];
        };
        const [pronA, pronB] = splitField(sub.pronunciation);
        const [transA, transB] = splitField(sub.translation);

        const subA = { ...sub, text: textA, end: midTime };
        const subB = { text: textB, start: midTime, end: sub.end };
        if (pronA) subA.pronunciation = pronA; else delete subA.pronunciation;
        if (pronB) subB.pronunciation = pronB;
        if (transA) subA.translation = transA; else delete subA.translation;
        if (transB) subB.translation = transB;
        delete subB.notes;
        if (!sub.notes || sub.notes.length === 0) delete subA.notes;

        newSubtitles.splice(idx, 1, subA, subB);
        newSubtitles.forEach((s, i) => { s.index = i; });

        await saveToSupabase(newSubtitles);
      } else {
        // === 레거시 모드 ===
        const res = await fetch(`/api/subtitle/split/${video.id}/${sub.index}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ splitAfterWord: splitPoint }),
        });
        if (!res.ok) throw new Error("분리 실패");
        const result = await res.json();
        newSubtitles = result.subtitles;
      }

      if (onMergeSubtitles) onMergeSubtitles(newSubtitles);
      setHash(video.id, newSubtitles[studyIndexRef.current].index, false, "study");
      if (loopTargetRef.current) {
        const newSub = newSubtitles[studyIndexRef.current];
        loopTargetRef.current = { start: newSub.start, end: newSub.end };
      }
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
      {/* Cockpit Header */}
      <div
        className="cockpit-panel"
        style={{
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button
          onClick={onBack}
          className="phys-btn"
          style={{
            color: "#f87171",
            padding: "5px 12px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: "700",
            fontFamily: "monospace",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span className="led led-red" /> ABORT
        </button>
        <span className="label-plate" style={{ color: T.cockpit.labelColor, flexShrink: 0 }}>
          CALLSIGN
        </span>
        <span
          style={{
            fontSize: "12px",
            color: T.cockpit.greenText,
            fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
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
            className="phys-btn"
            style={{
              background: studyMode ? "linear-gradient(180deg, #4a3700, #3a2d00) !important" : undefined,
              borderColor: studyMode ? "rgba(251,191,36,0.35) !important" : undefined,
              color: studyMode ? T.cockpit.amberText : T.cockpit.labelColor,
              padding: "5px 12px",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: "700",
              fontFamily: "monospace",
              flexShrink: 0,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span className={`led ${studyMode ? "led-amber" : "led-blue"}`} style={{ marginRight: "4px" }} />
            {studyMode ? "FLIGHT" : "SIM"}
          </button>
        )}
      </div>

      {showSaved ? (
        <div
          style={{ padding: "20px", maxWidth: "640px", margin: "0 auto" }}
        >
          <h3 style={{ marginBottom: "16px", fontSize: "16px", background: "linear-gradient(135deg, #e8e8ed, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            저장한 표현들
          </h3>
          {savedExpressions.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: T.textMuted,
                padding: "40px",
                background: T.surface,
                backdropFilter: T.blur,
                WebkitBackdropFilter: T.blur,
                borderRadius: T.radius.md,
                border: `1px solid ${T.border}`,
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
                    background: T.surface,
                    backdropFilter: T.blur,
                    WebkitBackdropFilter: T.blur,
                    borderRadius: T.radius.md,
                    padding: "16px",
                    borderLeft: `3px solid ${T.accent}`,
                    border: `1px solid ${T.border}`,
                    borderLeftColor: T.accent,
                    borderLeftWidth: "3px",
                    transition: `all 0.2s ${T.ease}`,
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
                          color: T.accentLight,
                          fontWeight: "700",
                          fontSize: "16px",
                        }}
                      >
                        {expr.word}
                      </span>
                      <span
                        style={{
                          color: T.gold,
                          marginLeft: "10px",
                          fontSize: "15px",
                        }}
                      >
                        {expr.actual}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (expr.id && user && supabase) {
                          const { error } = await removeSavedExpression(expr.id);
                          if (error) console.error("표현 삭제 실패:", error.message);
                        }
                        setSavedExpressions((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        );
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: T.textMuted,
                        cursor: "pointer",
                        fontSize: "18px",
                        transition: `color 0.2s ${T.ease}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.red; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}
                    >
                      ×
                    </button>
                  </div>
                  <div
                    style={{
                      color: T.textSec,
                      fontSize: "13px",
                      marginTop: "6px",
                    }}
                  >
                    {expr.meaning}
                  </div>
                  <div
                    style={{
                      color: T.textMuted,
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
            <div style={{ padding: "20px", animation: `slideUp 0.3s ${T.ease}` }}>
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
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    color: studyIndex === 0 ? T.textMuted : T.accentLight,
                    cursor: studyIndex === 0 ? "not-allowed" : "pointer",
                    padding: "10px 20px",
                    borderRadius: T.radius.sm,
                    fontSize: "14px",
                    fontWeight: "600",
                    opacity: studyIndex === 0 ? 0.5 : 1,
                    transition: `all 0.2s ${T.ease}`,
                  }}
                >
                  ← 이전
                </button>
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      color: T.textSec,
                      fontWeight: "600",
                      fontFamily: "monospace",
                      fontVariantNumeric: "tabular-nums",
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
                      background: "transparent", border: "none", color: T.textMuted,
                      cursor: "pointer", fontSize: "13px", padding: "2px 4px",
                      transition: `color 0.2s ${T.ease}`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}
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
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    color: studyIndex === subtitles.length - 1 ? T.textMuted : T.accentLight,
                    cursor: studyIndex === subtitles.length - 1 ? "not-allowed" : "pointer",
                    padding: "10px 20px",
                    borderRadius: T.radius.sm,
                    fontSize: "14px",
                    fontWeight: "600",
                    opacity: studyIndex === subtitles.length - 1 ? 0.5 : 1,
                    transition: `all 0.2s ${T.ease}`,
                  }}
                >
                  다음 →
                </button>
              </div>

              {/* Original */}
              <div style={{ background: splitMode ? "rgba(17,17,37,0.6)" : T.surface, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, borderRadius: T.radius.lg, padding: "20px", marginBottom: "12px", border: splitMode ? `1px solid ${T.borderHover}` : `1px solid ${T.border}`, transition: `all 0.3s ${T.ease}`, boxShadow: splitMode ? T.glow : T.shadow1 }}>
                <div style={{ fontSize: "11px", color: T.accent, fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px", opacity: 0.9 }}>
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
                  <div style={{ background: "linear-gradient(135deg, rgba(26,21,32,0.6), rgba(26,26,46,0.6))", backdropFilter: T.blur, WebkitBackdropFilter: T.blur, borderRadius: T.radius.lg, padding: "20px", marginBottom: "12px", border: "1px solid rgba(251,191,36,0.12)", boxShadow: T.glowGold }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ fontSize: "11px", color: T.gold, fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                        🔊 실제 발음
                      </div>
                      {!isEditing && !splitMode && canEdit && (
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

                  <div style={{ background: T.surface, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, borderRadius: T.radius.lg, padding: "20px", marginBottom: isEditing ? "12px" : "16px", border: `1px solid ${T.border}`, boxShadow: T.shadow1 }}>
                    <div style={{ fontSize: "11px", color: T.green, fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px", opacity: 0.9 }}>
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

                  {/* Timing edit in edit mode */}
                  {isEditing && (
                    <div style={{ background: T.surface, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, borderRadius: T.radius.lg, padding: "20px", marginBottom: "12px", border: `1px solid ${T.border}`, boxShadow: T.shadow1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <div style={{ fontSize: "11px", color: "#f59e0b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
                          ⏱ 타이밍 (초)
                        </div>
                        <button
                          onClick={() => setLinkAdjacent(!linkAdjacent)}
                          style={{
                            background: linkAdjacent ? "#292524" : "#1a1a2e",
                            border: linkAdjacent ? "1px solid #f59e0b" : "1px solid #333",
                            color: linkAdjacent ? "#fbbf24" : "#666",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        >
                          🔗 앞뒤 연동 {linkAdjacent ? "ON" : "OFF"}
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>시작</div>
                          <input
                            type="number"
                            step="0.1"
                            value={editData.start}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEditData({ ...editData, start: v });
                              if (loopTargetRef.current) {
                                loopTargetRef.current = { ...loopTargetRef.current, start: parseFloat(v) || 0 };
                              }
                            }}
                            style={{
                              width: "100%", background: "#0d0d15", border: "1px solid #f59e0b", borderRadius: "8px",
                              padding: "8px 10px", color: "#fbbf24", fontSize: "14px", fontWeight: "600",
                              outline: "none", boxSizing: "border-box",
                            }}
                          />
                        </div>
                        <div style={{ color: "#555", fontSize: "18px", paddingTop: "18px" }}>→</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>종료</div>
                          <input
                            type="number"
                            step="0.1"
                            value={editData.end}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEditData({ ...editData, end: v });
                              if (loopTargetRef.current) {
                                loopTargetRef.current = { ...loopTargetRef.current, end: parseFloat(v) || 0 };
                              }
                            }}
                            style={{
                              width: "100%", background: "#0d0d15", border: "1px solid #f59e0b", borderRadius: "8px",
                              padding: "8px 10px", color: "#fbbf24", fontSize: "14px", fontWeight: "600",
                              outline: "none", boxSizing: "border-box",
                            }}
                          />
                        </div>
                        <div style={{ color: "#555", fontSize: "12px", paddingTop: "18px", minWidth: "50px" }}>
                          {(parseFloat(editData.end) - parseFloat(editData.start)).toFixed(1)}초
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save/Cancel buttons in edit mode */}
                  {isEditing && (
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                      <button
                        onClick={saveEdit}
                        disabled={isSaving}
                        style={{
                          flex: 1, background: `linear-gradient(135deg, ${T.accent}, #8b5cf6)`, border: "none", color: "white",
                          padding: "12px", borderRadius: T.radius.md, cursor: isSaving ? "not-allowed" : "pointer",
                          fontSize: "14px", fontWeight: "700", opacity: isSaving ? 0.6 : 1,
                          boxShadow: "0 2px 12px rgba(99,102,241,0.3)", transition: `all 0.3s ${T.ease}`,
                        }}
                      >
                        {isSaving ? "저장 중..." : "💾 저장 (⌘S)"}
                      </button>
                      <button
                        onClick={cancelEditing}
                        style={{
                          flex: 1, background: T.surface, border: `1px solid ${T.border}`, color: T.textSec,
                          padding: "12px", borderRadius: T.radius.md, cursor: "pointer",
                          fontSize: "14px", fontWeight: "600", transition: `all 0.2s ${T.ease}`,
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
                  <div style={{ fontSize: "11px", color: T.textSec, fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px", padding: "0 4px" }}>
                    💡 발음 포인트
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {subtitles[studyIndex].notes.map((note, i) => (
                      <div
                        key={i}
                        style={{
                          background: T.surface,
                          backdropFilter: T.blur,
                          WebkitBackdropFilter: T.blur,
                          borderRadius: T.radius.md,
                          padding: "14px 16px",
                          cursor: "pointer",
                          border: expandedNote === i ? `1px solid ${T.borderHover}` : `1px solid ${T.border}`,
                          transition: `all 0.3s ${T.ease}`,
                          boxShadow: expandedNote === i ? T.glow : "none",
                        }}
                        onClick={() => setExpandedNote(expandedNote === i ? null : i)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ color: T.accentLight, fontWeight: "700", fontSize: "15px", fontFamily: "monospace" }}>
                              {note.word}
                            </span>
                            <span style={{ color: T.textMuted }}>→</span>
                            <span style={{ color: T.gold, fontWeight: "700", fontSize: "15px" }}>
                              {note.actual}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); saveExpression(note); }}
                            style={{
                              background: savedExpressions.find((e) => e.word === note.word && e.video_id === video.id) ? "linear-gradient(135deg, #22c55e, #16a34a)" : T.surface,
                              border: savedExpressions.find((e) => e.word === note.word && e.video_id === video.id) ? "none" : `1px solid ${T.border}`,
                              color: "white", padding: "4px 12px",
                              borderRadius: T.radius.sm, cursor: "pointer", fontSize: "12px",
                              transition: `all 0.2s ${T.ease}`,
                            }}
                          >
                            {savedExpressions.find((e) => e.word === note.word && e.video_id === video.id) ? "✓" : "+"}
                          </button>
                        </div>
                        {expandedNote === i && (
                          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.border}`, color: T.textSec, fontSize: "13px", lineHeight: "1.6", animation: `fadeIn 0.2s ${T.ease}` }}>
                            {note.meaning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Listen & Loop buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  onClick={() => {
                    const sub = subtitles[studyIndex];
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
                  }}
                  disabled={!playerReady}
                  style={{
                    flex: 1,
                    background: `linear-gradient(135deg, ${T.accent}, #8b5cf6)`,
                    border: "none",
                    color: "white",
                    padding: "14px",
                    borderRadius: T.radius.md,
                    cursor: playerReady ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: "700",
                    opacity: playerReady ? 1 : 0.4,
                    boxShadow: "0 2px 16px rgba(99,102,241,0.35)",
                    transition: `all 0.3s ${T.ease}`,
                  }}
                >
                  🔊 이 문장 듣기
                </button>
                <button
                  onClick={() => {
                    const sub = subtitles[studyIndex];
                    if (!playerInstanceRef.current || !sub) return;
                    if (continuousPlayRef.current) {
                      continuousPlayRef.current = false;
                      setIsContinuousPlay(false);
                      playerInstanceRef.current.pauseVideo();
                    } else {
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
                    background: isContinuousPlay ? "linear-gradient(135deg, #059669, #10b981)" : T.surface,
                    border: isContinuousPlay ? "none" : `1px solid ${T.border}`,
                    color: isContinuousPlay ? "#d1fae5" : T.accentLight,
                    padding: "14px 18px",
                    borderRadius: T.radius.md,
                    cursor: playerReady ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: "700",
                    opacity: playerReady ? 1 : 0.4,
                    transition: `all 0.3s ${T.ease}`,
                    boxShadow: isContinuousPlay ? "0 2px 12px rgba(16,185,129,0.3)" : "none",
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
                      loopTargetRef.current = null;
                      setIsLooping(false);
                      playerInstanceRef.current.pauseVideo();
                    } else {
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
                    background: isLooping ? `linear-gradient(135deg, ${T.accentDark}, ${T.accent})` : T.surface,
                    border: isLooping ? "none" : `1px solid ${T.border}`,
                    color: isLooping ? "#e0e7ff" : T.accentLight,
                    padding: "14px 18px",
                    borderRadius: T.radius.md,
                    cursor: playerReady ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: "700",
                    opacity: playerReady ? 1 : 0.4,
                    transition: `all 0.3s ${T.ease}`,
                    boxShadow: isLooping ? "0 2px 12px rgba(99,102,241,0.3)" : "none",
                  }}
                  title="반복 재생 (R)"
                >
                  🔄 {isLooping ? "반복 중" : "반복"}
                </button>
              </div>

            </div>
          )}

          <div style={{ display: studyMode ? "none" : "block" }}>

          {/* ═══ WINDSHIELD (Video + HUD) ═══ */}
          <div style={{
            position: "relative",
            background: "linear-gradient(180deg, #1a1a28, #12121e)",
            padding: "10px 10px 0 10px",
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,255,255,0.02)",
            borderBottom: "2px solid rgba(80,80,100,0.4)",
            borderTop: "1px solid rgba(60,60,80,0.3)",
          }}>
            {/* YouTube Player */}
            <div
              ref={playerRef}
              style={{
                width: "100%",
                background: "#000",
                borderRadius: "3px",
                overflow: "hidden",
                boxShadow: "inset 0 0 30px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.05)",
                border: "2px solid rgba(70,70,90,0.5)",
              }}
            >
              <div id={`yt-player-${video.id}`}></div>
            </div>

            {/* HUD Overlay — floating over windshield bottom */}
            <div
              className="hud-overlay"
              style={{
                position: "absolute",
                bottom: "24px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                background: T.cockpit.hudBg,
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                borderRadius: "8px",
                padding: "12px 18px",
                minWidth: "300px",
                maxWidth: "500px",
                width: "85%",
                border: `1px solid ${T.cockpit.hudBorder}`,
                animation: "hudPulse 3s ease-in-out infinite",
                transition: `all 0.3s ${T.ease}`,
                pointerEvents: "none",
              }}
            >
              {isLooping && (
                <div style={{ fontSize: "10px", color: T.cockpit.amberText, marginBottom: "6px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  🔄 LOOP ACTIVE
                </div>
              )}
              {activeSubtitle ? (
                <div>
                  {hudDisplay.original && (
                    <>
                      <div style={{ fontSize: "10px", color: T.cockpit.labelColor, fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px", opacity: 0.8 }}>ORIGINAL</div>
                      <div style={{ fontSize: "14px", color: "#e0e0e8", marginBottom: "8px", lineHeight: "1.4" }}>
                        {activeSubtitle.text}
                      </div>
                    </>
                  )}
                  {hasPronunciation && hudDisplay.pronunciation && (
                    <>
                      <div style={{ fontSize: "10px", color: T.cockpit.amberText, fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "3px", opacity: 0.8 }}>🔊 PRONUNCIATION</div>
                      <div style={{ fontSize: "17px", fontWeight: "700", color: T.cockpit.amberText, lineHeight: "1.3", marginBottom: hudDisplay.translation ? "6px" : "0" }}>
                        {activeSubtitle.pronunciation}
                      </div>
                    </>
                  )}
                  {hasPronunciation && hudDisplay.translation && (
                    <>
                      <div style={{ fontSize: "10px", color: T.cockpit.greenText, fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "3px", opacity: 0.8 }}>🇰🇷 TRANSLATION</div>
                      <div style={{ fontSize: "13px", color: "#a5f3c4", lineHeight: "1.4" }}>
                        {activeSubtitle.translation}
                      </div>
                    </>
                  )}
                  {!hudDisplay.original && !hudDisplay.pronunciation && !hudDisplay.translation && (
                    <div style={{ fontSize: "11px", color: T.textMuted, textAlign: "center", fontFamily: "monospace", letterSpacing: "0.1em" }}>
                      HUD OFF
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "11px", color: T.textMuted, textAlign: "center", fontFamily: "monospace", letterSpacing: "0.1em" }}>
                  AWAITING SIGNAL...
                </div>
              )}
            </div>
          </div>

          {/* Flight Gauge (Progress bar) — physical gauge bezel */}
          {playerReady && (
            <div className="gauge-bezel" style={{ margin: "0", borderRadius: "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="label-plate" style={{ color: T.cockpit.greenText, flexShrink: 0 }}>ALT</span>
                <div
                  style={{
                    position: "relative",
                    height: "8px",
                    flex: 1,
                    background: "#0e0e1a",
                    borderRadius: "4px",
                    cursor: "pointer",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.03)",
                    border: "1px solid rgba(60,60,80,0.4)",
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
                      background: "linear-gradient(90deg, #34d399, #6366f1, #fbbf24)",
                      borderRadius: "3px",
                      transition: isPlaying ? "none" : "width 0.2s",
                      boxShadow: "0 0 8px rgba(99,102,241,0.4), 0 0 2px rgba(99,102,241,0.6)",
                    }}
                  />
                  {subtitles.map((sub, i) => {
                    const d = getDuration() || 100;
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          top: "-2px",
                          left: `${(sub.start / d) * 100}%`,
                          width: "1px",
                          height: "12px",
                          background: "rgba(99,102,241,0.3)",
                        }}
                      />
                    );
                  })}
                </div>
                <span style={{ fontSize: "11px", color: T.cockpit.greenText, fontFamily: "monospace", fontVariantNumeric: "tabular-nums", minWidth: "76px", textAlign: "right" }}>
                  {formatTime(currentTime)}<span style={{ color: T.textMuted }}>/</span>{formatTime(getDuration())}
                </span>
              </div>
            </div>
          )}

          {/* ═══ COCKPIT INSTRUMENT PANEL ═══ */}
          <div className="cockpit-panel" style={{ padding: "20px 16px 16px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1.2fr auto 1fr",
                gap: "0",
                alignItems: "stretch",
              }}
            >
              {/* Column 1: THROTTLE (Speed) — Lever */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "0 12px" }}>
                <span className="label-plate" style={{ color: T.cockpit.amberText }}>THROTTLE</span>
                {/* Lever track */}
                <div
                  style={{
                    position: "relative",
                    width: "44px",
                    height: "100px",
                    background: "linear-gradient(180deg, #0e0e1a, #1a1a2c, #0e0e1a)",
                    borderRadius: "8px",
                    border: T.cockpit.metalBorder,
                    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.03)",
                    opacity: playerReady ? 1 : 0.4,
                    touchAction: "none",
                  }}
                >
                  {/* Speed notch marks */}
                  {[0.5, 0.75, 1, 1.25, 1.5].map((s, i) => {
                    const y = 8 + ((4 - i) / 4) * (100 - 16);
                    return (
                      <div key={s} style={{ position: "absolute", left: 0, right: 0, top: `${y}px`, display: "flex", alignItems: "center", pointerEvents: "none" }}>
                        <div style={{ width: "6px", height: "1px", background: s === 1 ? T.cockpit.greenText : "rgba(100,100,130,0.4)", marginLeft: "2px" }} />
                        <div style={{ flex: 1 }} />
                        <div style={{ width: "6px", height: "1px", background: s === 1 ? T.cockpit.greenText : "rgba(100,100,130,0.4)", marginRight: "2px" }} />
                      </div>
                    );
                  })}
                  {/* Center rail groove */}
                  <div style={{
                    position: "absolute",
                    left: "50%",
                    top: "8px",
                    bottom: "8px",
                    width: "4px",
                    marginLeft: "-2px",
                    background: "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(30,30,50,0.3))",
                    borderRadius: "2px",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
                    pointerEvents: "none",
                  }} />
                  {/* Lever handle — drag target */}
                  {(() => {
                    const steps = [0.5, 0.75, 1, 1.25, 1.5];
                    const idx = steps.indexOf(speed) !== -1 ? steps.indexOf(speed) : 2;
                    const y = 8 + ((4 - idx) / 4) * (100 - 16);
                    return (
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: `${y}px`,
                          transform: "translate(-50%, -50%)",
                          width: "36px",
                          height: "20px",
                          background: T.cockpit.btnUp,
                          border: T.cockpit.btnBorder,
                          borderRadius: "4px",
                          boxShadow: `${T.cockpit.btnShadow}, 0 0 8px rgba(251,191,36,${speed !== 1 ? "0.15" : "0"})`,
                          cursor: playerReady ? "grab" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 1,
                        }}
                        onPointerDown={(e) => {
                          if (!playerReady) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const handle = e.currentTarget;
                          handle.setPointerCapture(e.pointerId);
                          handle.style.cursor = "grabbing";
                          handle.style.background = T.cockpit.btnDown;
                          const track = handle.parentElement.getBoundingClientRect();
                          const onMove = (ev) => {
                            const ratio = 1 - Math.max(0, Math.min(1, (ev.clientY - track.top - 8) / (track.height - 16)));
                            const si = Math.round(ratio * (steps.length - 1));
                            updateSpeed(steps[si]);
                          };
                          const onUp = () => {
                            handle.style.cursor = "grab";
                            handle.style.background = T.cockpit.btnUp;
                            handle.removeEventListener("pointermove", onMove);
                            handle.removeEventListener("pointerup", onUp);
                            handle.removeEventListener("pointercancel", onUp);
                          };
                          handle.addEventListener("pointermove", onMove);
                          handle.addEventListener("pointerup", onUp);
                          handle.addEventListener("pointercancel", onUp);
                        }}
                      >
                        {/* Grip lines */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", pointerEvents: "none" }}>
                          {[0,1,2].map(i => (
                            <div key={i} style={{ width: "14px", height: "1px", background: "rgba(180,180,200,0.25)", borderRadius: "1px" }} />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {/* Speed readout */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span className={`led ${speed !== 1 ? "led-amber" : "led-green"}`} />
                  <span style={{ fontSize: "10px", color: speed !== 1 ? T.cockpit.amberText : T.cockpit.greenText, fontFamily: "monospace" }}>
                    {speed.toFixed(2)}x
                  </span>
                </div>
              </div>

              {/* Seam 1 */}
              <div className="panel-seam" />

              {/* Column 2: ENGINE (Play/Pause) */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "0 16px" }}>
                <span className="label-plate" style={{ color: T.cockpit.labelColor }}>
                  <span className={`led ${isPlaying ? "led-green led-blink" : "led-off"}`} />
                  ENGINE
                </span>
                {/* Physical START/STOP button */}
                <div style={{
                  position: "relative",
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #2a2a3e, #1a1a2c)",
                  border: "3px solid rgba(80,80,100,0.5)",
                  boxShadow: isPlaying
                    ? "0 0 25px rgba(99,102,241,0.4), 0 0 60px rgba(99,102,241,0.15), inset 0 0 15px rgba(0,0,0,0.3)"
                    : "0 4px 8px rgba(0,0,0,0.5), inset 0 0 15px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: isPlaying ? "engineGlow 2s ease-in-out infinite" : "none",
                }}>
                  {/* Outer ring indicator */}
                  <div style={{
                    position: "absolute",
                    inset: "-6px",
                    borderRadius: "50%",
                    border: isPlaying ? "2px solid rgba(99,102,241,0.4)" : "2px solid rgba(60,60,80,0.3)",
                    transition: "all 0.3s",
                    pointerEvents: "none",
                  }} />
                  <button
                    onClick={togglePlay}
                    disabled={!playerReady}
                    style={{
                      background: isPlaying
                        ? "linear-gradient(145deg, #4f46e5, #6366f1)"
                        : "linear-gradient(145deg, #3a3a50, #2a2a3e)",
                      border: "none",
                      color: isPlaying ? "white" : "#8888aa",
                      cursor: playerReady ? "pointer" : "not-allowed",
                      borderRadius: "50%",
                      width: "54px",
                      height: "54px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: playerReady ? 1 : 0.4,
                      transition: `all 0.3s ${T.ease}`,
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                    onMouseEnter={(e) => { if (playerReady) e.currentTarget.style.transform = "scale(1.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    title="재생/일시정지 (Space)"
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
                </div>
                <span style={{ fontSize: "9px", color: T.textMuted, fontFamily: "monospace", letterSpacing: "0.1em" }}>
                  {isPlaying ? "▶ RUNNING" : "■ STOPPED"}
                </span>
              </div>

              {/* Seam 2 */}
              <div className="panel-seam" />

              {/* Column 3: NAVIGATION (Prev/Next + Loop) */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "0 12px" }}>
                <span className="label-plate" style={{ color: T.cockpit.labelColor }}>NAV</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", width: "100%" }}>
                  <button
                    onClick={goToPrevSentence}
                    disabled={!playerReady}
                    className="phys-btn"
                    style={{
                      color: T.accentLight,
                      cursor: playerReady ? "pointer" : "not-allowed",
                      padding: "8px 4px",
                      borderRadius: "5px",
                      fontSize: "10px",
                      fontWeight: "700",
                      fontFamily: "monospace",
                      opacity: playerReady ? 1 : 0.4,
                    }}
                    title="이전 문장 (←)"
                  >
                    ◀ PREV
                  </button>
                  <button
                    onClick={goToNextSentence}
                    disabled={!playerReady}
                    className="phys-btn"
                    style={{
                      color: T.accentLight,
                      cursor: playerReady ? "pointer" : "not-allowed",
                      padding: "8px 4px",
                      borderRadius: "5px",
                      fontSize: "10px",
                      fontWeight: "700",
                      fontFamily: "monospace",
                      opacity: playerReady ? 1 : 0.4,
                    }}
                    title="다음 문장 (→)"
                  >
                    NEXT ▶
                  </button>
                  <button
                    onClick={skipBack}
                    disabled={!playerReady}
                    className="phys-btn"
                    style={{
                      color: T.textSec,
                      cursor: playerReady ? "pointer" : "not-allowed",
                      padding: "6px 4px",
                      borderRadius: "5px",
                      fontSize: "9px",
                      fontFamily: "monospace",
                      opacity: playerReady ? 1 : 0.4,
                    }}
                    title="5초 뒤로"
                  >
                    -5s
                  </button>
                  <button
                    onClick={skipForward}
                    disabled={!playerReady}
                    className="phys-btn"
                    style={{
                      color: T.textSec,
                      cursor: playerReady ? "pointer" : "not-allowed",
                      padding: "6px 4px",
                      borderRadius: "5px",
                      fontSize: "9px",
                      fontFamily: "monospace",
                      opacity: playerReady ? 1 : 0.4,
                    }}
                    title="5초 앞으로"
                  >
                    +5s
                  </button>
                </div>
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
                  className="phys-btn"
                  style={{
                    width: "100%",
                    background: isLooping ? "linear-gradient(180deg, #4f46e5, #3730a3) !important" : undefined,
                    borderColor: isLooping ? "rgba(99,102,241,0.5) !important" : undefined,
                    color: isLooping ? "#e0e7ff" : T.cockpit.amberText,
                    cursor: playerReady ? "pointer" : "not-allowed",
                    padding: "7px 12px",
                    borderRadius: "5px",
                    fontSize: "10px",
                    fontWeight: "700",
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                    opacity: playerReady ? 1 : 0.4,
                    boxShadow: isLooping ? `${T.cockpit.glowStrong}, inset 0 1px 0 rgba(255,255,255,0.1)` : undefined,
                  }}
                  title="반복 재생 (R)"
                >
                  <span className={`led ${isLooping ? "led-amber led-blink" : "led-off"}`} style={{ marginRight: "5px" }} />
                  {isLooping ? "LOOP ON" : "LOOP"}
                </button>
              </div>
            </div>
            {/* ── HUD DISPLAY toggles ── */}
            <div style={{
              marginTop: "12px",
              paddingTop: "10px",
              borderTop: T.cockpit.seam,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}>
              <span className="label-plate" style={{ color: T.cockpit.labelColor, marginRight: "6px" }}>DISPLAY</span>
              {[
                { key: "original", label: "ORI", color: T.cockpit.labelColor, led: "led-blue" },
                { key: "pronunciation", label: "PRON", color: T.cockpit.amberText, led: "led-amber" },
                { key: "translation", label: "TRNS", color: T.cockpit.greenText, led: "led-green" },
              ].map((item) => (
                <button
                  key={item.key}
                  className="phys-btn"
                  onClick={() => setHudDisplay((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "4px",
                    fontSize: "9px",
                    fontWeight: "700",
                    fontFamily: "monospace",
                    letterSpacing: "0.08em",
                    color: hudDisplay[item.key] ? item.color : T.textMuted,
                    cursor: "pointer",
                    background: hudDisplay[item.key]
                      ? "linear-gradient(180deg, #2e2e44, #222236) !important"
                      : undefined,
                    borderColor: hudDisplay[item.key]
                      ? `${item.color}44 !important`
                      : undefined,
                    boxShadow: hudDisplay[item.key]
                      ? `inset 0 2px 4px rgba(0,0,0,0.4), 0 0 8px ${item.color}22`
                      : undefined,
                  }}
                >
                  <span className={`led ${hudDisplay[item.key] ? item.led : "led-off"}`} style={{ marginRight: "4px" }} />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Bottom screws decoration */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", padding: "0 2px" }}>
              <span style={{ fontSize: "8px", color: T.cockpit.screwColor, textShadow: "0 1px 1px rgba(0,0,0,0.5)" }}>⊕</span>
              <span style={{ fontSize: "8px", color: T.textMuted, fontFamily: "monospace", letterSpacing: "0.15em" }}>FLIGHT CONTROL UNIT</span>
              <span style={{ fontSize: "8px", color: T.cockpit.screwColor, textShadow: "0 1px 1px rgba(0,0,0,0.5)" }}>⊕</span>
            </div>
          </div>

          {/* ═══ DATA BANK (Learning Panel) ═══ */}
          {showPanel && currentSubtitle && hasPronunciation && (
            <div className="cockpit-panel" style={{ padding: "20px 20px 16px", animation: `slideUp 0.3s ${T.ease}` }}>

              <div
                style={{
                  background: T.cockpit.instrument,
                  borderRadius: "6px",
                  padding: "16px 18px",
                  marginBottom: "10px",
                  border: T.cockpit.metalBorder,
                  borderLeft: "3px solid rgba(99,102,241,0.5)",
                  boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.02)",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    color: T.cockpit.labelColor,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: "10px",
                    fontFamily: "monospace",
                  }}
                >
                  ━━ ORIGINAL ━━
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
                  background: T.cockpit.instrument,
                  borderRadius: "6px",
                  padding: "16px 18px",
                  marginBottom: "10px",
                  border: T.cockpit.metalBorder,
                  borderLeft: "3px solid rgba(251,191,36,0.5)",
                  boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.02)",
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
                      fontSize: "9px",
                      color: T.cockpit.amberText,
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      fontFamily: "monospace",
                    }}
                  >
                    ━━ 🔊 PRONUNCIATION ━━
                  </div>
                  {!isEditing && canEdit && (
                    <button
                      onClick={startEditing}
                      style={{
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        color: T.textSec,
                        padding: "4px 12px",
                        borderRadius: T.radius.sm,
                        cursor: "pointer",
                        fontSize: "12px",
                        transition: `all 0.2s ${T.ease}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.color = T.text; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSec; }}
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
                  background: T.cockpit.instrument,
                  borderRadius: "6px",
                  padding: "16px 18px",
                  marginBottom: "14px",
                  border: T.cockpit.metalBorder,
                  borderLeft: "3px solid rgba(52,211,153,0.5)",
                  boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.02)",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    color: T.cockpit.greenText,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: "10px",
                    fontFamily: "monospace",
                  }}
                >
                  ━━ 🇰🇷 TRANSLATION ━━
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
                      background: `linear-gradient(135deg, #22c55e, #16a34a)`,
                      border: "none",
                      color: "white",
                      padding: "12px",
                      borderRadius: T.radius.md,
                      cursor: isSaving ? "wait" : "pointer",
                      fontSize: "14px",
                      fontWeight: "700",
                      opacity: isSaving ? 0.6 : 1,
                      boxShadow: "0 2px 12px rgba(34,197,94,0.3)",
                      transition: `all 0.3s ${T.ease}`,
                    }}
                  >
                    {isSaving ? "저장 중..." : "✓ 저장"}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      color: T.textSec,
                      padding: "12px",
                      borderRadius: T.radius.md,
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "700",
                      transition: `all 0.2s ${T.ease}`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}
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
                      fontSize: "9px",
                      color: T.cockpit.labelColor,
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      marginBottom: "10px",
                      padding: "0 4px",
                      fontFamily: "monospace",
                    }}
                  >
                    ━━ 💡 FLIGHT NOTES ━━
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
                          background: T.cockpit.instrument,
                          borderRadius: "5px",
                          padding: "12px 14px",
                          cursor: "pointer",
                          border: T.cockpit.metalBorder,
                          borderLeft: expandedNote === i
                            ? "3px solid rgba(99,102,241,0.5)"
                            : "3px solid rgba(60,60,80,0.3)",
                          transition: `all 0.3s ${T.ease}`,
                          boxShadow: expandedNote === i
                            ? "inset 0 1px 4px rgba(0,0,0,0.3), 0 0 12px rgba(99,102,241,0.1)"
                            : "inset 0 1px 4px rgba(0,0,0,0.3)",
                        }}
                        onClick={() =>
                          setExpandedNote(expandedNote === i ? null : i)
                        }
                        onMouseEnter={(e) => { if (expandedNote !== i) e.currentTarget.style.borderColor = "rgba(196,181,253,0.15)"; }}
                        onMouseLeave={(e) => { if (expandedNote !== i) e.currentTarget.style.borderColor = T.border; }}
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
                                (e) => e.word === note.word && e.video_id === video.id
                              )
                                ? "linear-gradient(135deg, #22c55e, #16a34a)"
                                : T.surface,
                              border: savedExpressions.find(
                                (e) => e.word === note.word && e.video_id === video.id
                              )
                                ? "none"
                                : `1px solid ${T.border}`,
                              color: "white",
                              padding: "4px 12px",
                              borderRadius: T.radius.sm,
                              cursor: "pointer",
                              fontSize: "12px",
                              transition: `all 0.2s ${T.ease}`,
                              boxShadow: savedExpressions.find(
                                (e) => e.word === note.word && e.video_id === video.id
                              )
                                ? "0 2px 8px rgba(34,197,94,0.3)"
                                : "none",
                            }}
                          >
                            {savedExpressions.find(
                              (e) => e.word === note.word && e.video_id === video.id
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
                              borderTop: `1px solid ${T.border}`,
                              color: T.textSec,
                              fontSize: "13px",
                              lineHeight: "1.6",
                              animation: `fadeIn 0.2s ${T.ease}`,
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

              <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
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
                  className="phys-btn"
                  style={{
                    flex: 1,
                    background: "linear-gradient(180deg, #4f46e5, #3730a3) !important",
                    borderColor: "rgba(99,102,241,0.4) !important",
                    color: "white",
                    padding: "12px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "700",
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                  }}
                >
                  <span className="led led-blue" style={{ marginRight: "5px" }} />
                  REPEAT
                </button>
                <button
                  onClick={() => {
                    loopTargetRef.current = null;
                    setIsLooping(false);
                    setShowPanel(false);
                    if (playerInstanceRef.current)
                      playerInstanceRef.current.playVideo();
                  }}
                  className="phys-btn"
                  style={{
                    flex: 1,
                    color: T.cockpit.greenText,
                    padding: "12px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "700",
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                  }}
                >
                  <span className="led led-green" style={{ marginRight: "5px" }} />
                  RESUME
                </button>
              </div>
            </div>
          )}

          </div>

          {/* ═══ FLIGHT LOG (Sentence Timeline) ═══ */}
          <div className="cockpit-panel" style={{ padding: "16px 20px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span className="label-plate" style={{ color: T.cockpit.labelColor }}>
                <span className="led led-green" />
                FLIGHT LOG
              </span>
              <span style={{ fontSize: "9px", color: T.textMuted, fontFamily: "monospace" }}>
                {subtitles.length} ENTRIES
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                maxHeight: "300px",
                overflowY: "auto",
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
                      padding: "8px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
                      borderLeft: isActive
                        ? "3px solid rgba(99,102,241,0.6)"
                        : "3px solid transparent",
                      transition: `all 0.2s ${T.ease}`,
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      boxShadow: isActive ? "0 0 15px rgba(99,102,241,0.1)" : "none",
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(99,102,241,0.05)"; e.currentTarget.style.borderLeftColor = "rgba(99,102,241,0.2)"; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; } }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: isActive ? T.cockpit.amberText : T.textMuted,
                        minWidth: "36px",
                        fontFamily: "monospace",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: isActive ? "700" : "400",
                      }}
                    >
                      {formatTime(sub.start)}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: isActive ? T.accentLight : T.textSec,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        transition: `color 0.2s ${T.ease}`,
                        fontFamily: isActive ? "inherit" : "inherit",
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
                        color: T.textMuted,
                        cursor: "pointer",
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        flexShrink: 0,
                        transition: `color 0.2s ${T.ease}`,
                        fontFamily: "monospace",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.cockpit.labelColor; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}
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
  const [baseSubtitles, setBaseSubtitles] = useState([]); // 원본 자막 (정적 JSON)
  const [initialSubIndex, setInitialSubIndex] = useState(null);
  const [initialMode, setInitialMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [savedExpressions, setSavedExpressions] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [ytApiReady, setYtApiReady] = useState(false);

  // Auth 상태
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(!!supabase);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Supabase Auth 세션 감지
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 로그인 시 저장한 표현 + 즐겨찾기 DB에서 로드
  useEffect(() => {
    if (!user || !supabase) {
      if (!user) {
        setSavedExpressions([]);
        setFavoriteIds([]);
      }
      return;
    }
    getSavedExpressions().then((data) => setSavedExpressions(data));
    getFavoriteVideos().then((ids) => setFavoriteIds(ids));
  }, [user]);

  // 즐겨찾기 토글
  const handleToggleFavorite = useCallback(async (videoId) => {
    if (!user || !supabase) return;
    const isFav = favoriteIds.includes(videoId);
    if (isFav) {
      setFavoriteIds((prev) => prev.filter((id) => id !== videoId));
      const { error } = await removeFavoriteVideo(videoId);
      if (error) {
        console.error("즐겨찾기 해제 실패:", error.message);
        setFavoriteIds((prev) => [...prev, videoId]);
      }
    } else {
      setFavoriteIds((prev) => [videoId, ...prev]);
      const { error } = await addFavoriteVideo(videoId);
      if (error) {
        console.error("즐겨찾기 추가 실패:", error.message);
        setFavoriteIds((prev) => prev.filter((id) => id !== videoId));
      }
    }
  }, [user, favoriteIds]);

  // 뒤로가기(popstate) 시 영상 목록으로 복귀
  useEffect(() => {
    const handlePopState = () => {
      const { videoId } = parseHash();
      if (!videoId) {
        setSelectedVideo(null);
        setSubtitles([]);
        setBaseSubtitles([]);
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
    fetch(`${import.meta.env.BASE_URL}videos/index.json`)
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

  // Load subtitle data (정적 JSON + Supabase 사용자 데이터 확인)
  const loadVideo = async (video) => {
    setLoading(true);
    try {
      // 1. 기본 자막 로드 (정적 JSON)
      const res = await fetch(
        `${import.meta.env.BASE_URL}videos/${video.id}.json`
      );
      if (!res.ok) throw new Error("data not found");
      const baseData = await res.json();
      setBaseSubtitles(baseData);

      // 2. 로그인 상태면 사용자 편집 데이터 확인
      let finalData = baseData;
      if (user) {
        const userData = await getUserSubtitles(video.id);
        if (userData) {
          finalData = userData;
        }
      }

      setSubtitles(finalData);
      setSelectedVideo(video);
    } catch (err) {
      console.error("자막 로드 실패:", err);
      alert("자막 데이터를 로드할 수 없습니다.");
    } finally {
      setLoading(false);
    }
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
    setBaseSubtitles([]);
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

  // Supabase에 사용자 자막 저장 (로그인 상태일 때)
  const saveToSupabase = useCallback(
    async (newSubtitles) => {
      if (!user || !selectedVideo) return;
      const { error } = await saveUserSubtitles(
        selectedVideo.id,
        newSubtitles
      );
      if (error) console.error("Supabase 저장 실패:", error.message);
    },
    [user, selectedVideo]
  );

  // 기본 자막으로 되돌리기
  const handleResetToBase = useCallback(async () => {
    if (!selectedVideo || !user) return;
    if (!confirm("편집 내용을 모두 삭제하고 원본 자막으로 되돌릴까요?")) return;
    await resetUserSubtitles(selectedVideo.id);
    setSubtitles(baseSubtitles);
  }, [selectedVideo, user, baseSubtitles]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily:
          '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <GlobalStyles />
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(10,10,15,0.8)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: T.shadow1,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: selectedVideo ? "pointer" : "default",
            transition: `opacity 0.2s ${T.ease}`,
          }}
          onClick={selectedVideo ? handleBack : undefined}
          onMouseEnter={(e) => { if (selectedVideo) e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: T.radius.sm,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
            }}
          >
            🎬
          </div>
          <span style={{
            fontWeight: "700",
            fontSize: "18px",
            background: "linear-gradient(135deg, #e8e8ed, #c4b5fd)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}>
            MovieTalk
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {selectedVideo && (
            <>
              <button
                onClick={() => setShowShortcuts(true)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  color: T.textSec,
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: `all 0.2s ${T.ease}`,
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.color = T.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSec; }}
              >
                ?
              </button>
              <button
                onClick={() => setShowSaved(!showSaved)}
                style={{
                  background: showSaved ? `linear-gradient(135deg, ${T.accent}, #8b5cf6)` : T.surface,
                  border: showSaved ? "none" : `1px solid ${T.border}`,
                  color: T.text,
                  padding: "8px 16px",
                  borderRadius: T.radius.pill,
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  transition: `all 0.3s ${T.ease}`,
                  boxShadow: showSaved ? "0 2px 12px rgba(99,102,241,0.3)" : "none",
                  backdropFilter: showSaved ? "none" : "blur(8px)",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => { if (!showSaved) { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.background = T.surfaceHover; } }}
                onMouseLeave={(e) => { if (!showSaved) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surface; } }}
              >
                📚 저장한 표현
              </button>
            </>
          )}
          {/* Auth 버튼 */}
          {supabase && !authLoading && (
            <>
              {user ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {user.user_metadata?.avatar_url && (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt=""
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: `2px solid ${T.border}`,
                        boxShadow: T.shadow1,
                      }}
                    />
                  )}
                  <span style={{ fontSize: "13px", color: T.textSec, letterSpacing: "0.01em" }}>
                    {user.user_metadata?.full_name ||
                      user.user_metadata?.name ||
                      user.email?.split("@")[0]}
                  </span>
                  <button
                    onClick={signOut}
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      color: T.accentLight,
                      padding: "6px 12px",
                      borderRadius: T.radius.pill,
                      cursor: "pointer",
                      fontSize: "12px",
                      transition: `all 0.2s ${T.ease}`,
                      backdropFilter: "blur(8px)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.background = T.surfaceHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surface; }}
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    background: `linear-gradient(135deg, ${T.accent}, #8b5cf6)`,
                    border: "none",
                    color: "#fff",
                    padding: "8px 18px",
                    borderRadius: T.radius.pill,
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
                    transition: `all 0.3s ${T.ease}`,
                    letterSpacing: "0.01em",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(99,102,241,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  로그인
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: `fadeIn 0.2s ${T.ease}`,
          }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            style={{
              background: T.surfaceSolid,
              borderRadius: T.radius.lg,
              padding: "36px",
              minWidth: "320px",
              textAlign: "center",
              border: `1px solid ${T.border}`,
              boxShadow: T.shadow3,
              animation: `slideUp 0.3s ${T.ease}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                marginBottom: "24px",
                fontSize: "20px",
                fontWeight: "700",
                background: "linear-gradient(135deg, #e8e8ed, #c4b5fd)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              로그인
            </h3>
            <p
              style={{
                marginBottom: "24px",
                fontSize: "13px",
                color: T.textSec,
                lineHeight: "1.5",
              }}
            >
              로그인하면 자막 편집 내용이 저장됩니다
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  signInWithGoogle();
                }}
                style={{
                  background: "#fff",
                  color: "#333",
                  border: "none",
                  padding: "13px 20px",
                  borderRadius: T.radius.md,
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  transition: `all 0.3s ${T.ease}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path
                    fill="#FFC107"
                    d="M43.6 20.1H42V20H24v8h11.3C33.9 33.5 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.3 14.7l6.6 4.8C14.5 15.4 18.8 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5 0 9.6-1.8 13.1-4.9l-6-5.2C29.2 35.8 26.7 36 24 36c-5.4 0-9.8-3.5-11.4-8.3l-6.5 5C9.5 39.6 16.2 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6 5.2C36.5 39.4 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"
                  />
                </svg>
                Google로 로그인
              </button>
            </div>
            <button
              onClick={() => setShowLoginModal(false)}
              style={{
                marginTop: "20px",
                background: "none",
                border: "none",
                color: T.textMuted,
                cursor: "pointer",
                fontSize: "13px",
                transition: `color 0.2s ${T.ease}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: T.textMuted,
            animation: `fadeIn 0.3s ${T.ease}`,
          }}
        >
          <div style={{ fontSize: "24px", marginBottom: "12px", animation: "glowPulse 1.5s infinite" }}>⏳</div>
          로딩 중...
        </div>
      )}

      {/* Video list or Player */}
      {!loading && !selectedVideo && (
        <VideoListScreen videos={videos} onSelect={handleSelectVideo} favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} user={user} />
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
          user={user}
          saveToSupabase={saveToSupabase}
          onResetToBase={handleResetToBase}
          showSaved={showSaved}
          savedExpressions={savedExpressions}
          setSavedExpressions={setSavedExpressions}
        />
      )}

      {/* 단축키 안내 모달 */}
      {showShortcuts && (
        <div
          onClick={() => setShowShortcuts(false)}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: `fadeIn 0.2s ${T.ease}`,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.surfaceSolid,
              borderRadius: T.radius.lg,
              padding: "28px 32px",
              maxWidth: "400px",
              width: "90%",
              border: `1px solid ${T.border}`,
              boxShadow: T.shadow3,
              animation: `slideUp 0.3s ${T.ease}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "700", margin: 0, background: "linear-gradient(135deg, #e8e8ed, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>단축키 안내</h3>
              <button onClick={() => setShowShortcuts(false)} style={{ background: "none", border: "none", color: T.textMuted, fontSize: "20px", cursor: "pointer", transition: `color 0.2s ${T.ease}` }} onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }} onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}>×</button>
            </div>
            <div style={{ fontSize: "14px", color: T.textSec, lineHeight: "2.2" }}>
              <div style={{ color: T.accentLight, fontWeight: "600", marginBottom: "4px", letterSpacing: "0.03em", fontSize: "12px", textTransform: "uppercase" }}>영상 모드</div>
              {[
                ["Space", "재생 / 일시정지"],
                ["←", "이전 문장으로 이동"],
                ["→", "다음 문장으로 이동"],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                  <kbd style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "2px 10px", borderRadius: T.radius.sm, fontSize: "12px", color: T.text, fontFamily: "monospace" }}>{key}</kbd>
                  <span style={{ color: T.textSec }}>{desc}</span>
                </div>
              ))}
              <div style={{ color: T.accentLight, fontWeight: "600", marginTop: "14px", marginBottom: "4px", letterSpacing: "0.03em", fontSize: "12px", textTransform: "uppercase" }}>학습 모드</div>
              {[
                ["←  →", "이전 / 다음 문장"],
                ["Space", "현재 문장 재생"],
                ["Esc", "학습 모드 종료"],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                  <kbd style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "2px 10px", borderRadius: T.radius.sm, fontSize: "12px", color: T.text, fontFamily: "monospace" }}>{key}</kbd>
                  <span style={{ color: T.textSec }}>{desc}</span>
                </div>
              ))}
              <div style={{ color: T.accentLight, fontWeight: "600", marginTop: "14px", marginBottom: "4px", letterSpacing: "0.03em", fontSize: "12px", textTransform: "uppercase" }}>편집</div>
              {[
                ["Ctrl/⌘ + E", "편집 모드 진입"],
                ["Ctrl/⌘ + S", "편집 저장"],
                ["Enter", "편집 저장 (입력 필드)"],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                  <kbd style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "2px 10px", borderRadius: T.radius.sm, fontSize: "12px", color: T.text, fontFamily: "monospace" }}>{key}</kbd>
                  <span style={{ color: T.textSec }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
