import { useState, useRef, useCallback } from "react";
import { T } from "../styles/tokens";
import { PlayIcon, PauseIcon } from "./icons";
import { setHash } from "../hooks/useHashRouter";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { usePlaybackControl } from "../hooks/usePlaybackControl";
import { useStudyMode } from "../hooks/useStudyMode";
import { useSubtitleEdit } from "../hooks/useSubtitleEdit";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import {
  supabase,
  addSavedExpression,
  removeSavedExpression,
} from "../lib/supabase";

export function PlayerScreen({
  video,
  subtitles,
  onBack,
  onUpdateSubtitle,
  onMergeSubtitles,
  initialSubIndex,
  initialMode,
  user,
  saveToSupabase,
  onResetToBase,
  showSaved,
  savedExpressions,
  setSavedExpressions,
}) {
  const [expandedNote, setExpandedNote] = useState(null);
  const [videoCollapsed, setVideoCollapsed] = useState(() => {
    try { return localStorage.getItem("videoCollapsed") === "true"; } catch { return false; }
  });

  const hasPronunciation = subtitles.length > 0 && "pronunciation" in subtitles[0];

  // ── Shared refs ──
  const loopTargetRef = useRef(null);
  const continuousPlayRef = useRef(false);

  // ── Study Mode ──
  const study = useStudyMode({
    videoId: video.id,
    subtitles,
    initialSubIndex,
    initialMode,
    hasPronunciation,
    playerInstanceRef: null, // will be set after player hook
    loopTargetRef,
    setIsLooping: null, // will be set after player hook
    continuousPlayRef,
    setIsContinuousPlay: null, // will be set after player hook
  });

  // ── YouTube Player ──
  const player = useYouTubePlayer({
    videoId: video.id,
    subtitles,
    initialSubIndex,
    initialMode,
    speed: 1,
    loopTargetRef,
    continuousPlayRef,
    studyModeRef: study.studyModeRef,
    studyIndexRef: study.studyIndexRef,
    onStudyIndexChange: study.setStudyIndex,
  });

  // Wire up study mode refs that depend on player
  study.studyModeRef.current && (null); // study already uses its own refs
  // Patch setIsLooping/setIsContinuousPlay into study (they come from player)
  const exitStudyMode = (activeSubtitle) => {
    study.studyModeRef.current = false;
    study.setStudyMode(false);
    loopTargetRef.current = null;
    player.setIsLooping(false);
    continuousPlayRef.current = false;
    player.setIsContinuousPlay(false);
    if (player.playerInstanceRef.current) player.playerInstanceRef.current.pauseVideo();
    setHash(video.id, activeSubtitle ? activeSubtitle.index : null);
  };

  const enterStudyMode = (activeSubtitle) => {
    const idx = activeSubtitle
      ? subtitles.findIndex((s) => s.index === activeSubtitle.index)
      : 0;
    const newIdx = Math.max(0, idx);
    study.studyModeRef.current = true;
    study.studyIndexRef.current = newIdx;
    study.setStudyMode(true);
    study.setStudyIndex(newIdx);
    setExpandedNote(null);
    setHash(video.id, subtitles[newIdx].index, false, "edit");
    if (player.playerInstanceRef.current) player.playerInstanceRef.current.pauseVideo();
  };

  // ── Playback Control ──
  const playback = usePlaybackControl({
    playerInstanceRef: player.playerInstanceRef,
    isPlaying: player.isPlaying,
    subtitles,
    videoId: video.id,
    loopTargetRef,
    setIsLooping: player.setIsLooping,
    setShowPanel: player.setShowPanel,
  });

  // ── Subtitle Edit ──
  const edit = useSubtitleEdit({
    videoId: video.id,
    subtitles,
    user,
    studyModeRef: study.studyModeRef,
    studyIndexRef: study.studyIndexRef,
    currentSubtitle: player.currentSubtitle,
    setCurrentSubtitle: player.setCurrentSubtitle,
    showPanel: player.showPanel,
    loopTargetRef,
    onUpdateSubtitle,
    onMergeSubtitles,
    saveToSupabase,
    setStudyIndex: study.setStudyIndex,
  });

  // ── Keyboard Shortcuts ──
  useKeyboardShortcuts({
    videoId: video.id,
    subtitles,
    playerInstanceRef: player.playerInstanceRef,
    studyModeRef: study.studyModeRef,
    studyIndexRef: study.studyIndexRef,
    isEditingRef: edit.isEditingRef,
    isSavingRef: edit.isSavingRef,
    saveEditRef: edit.saveEditRef,
    startEditingRef: edit.startEditingRef,
    loopTargetRef,
    continuousPlayRef,
    setStudyMode: study.setStudyMode,
    setStudyIndex: study.setStudyIndex,
    setIsLooping: player.setIsLooping,
    setIsContinuousPlay: player.setIsContinuousPlay,
    goToPrevSentence: playback.goToPrevSentence,
    goToNextSentence: playback.goToNextSentence,
  });

  // ── Save Expression ──
  const saveExpression = async (note) => {
    const sentence = player.currentSubtitle?.text || player.activeSubtitle?.text;
    if (savedExpressions.find((e) => e.word === note.word && e.video_id === video.id)) return;
    const expr = { ...note, sentence, video_id: video.id };
    if (user && supabase) {
      const { data, error } = await addSavedExpression(video.id, expr);
      if (!error && data) {
        setSavedExpressions((prev) => [data, ...prev]);
        return;
      }
      if (error) console.error("표현 저장 실패:", error.message);
    }
    setSavedExpressions((prev) => [expr, ...prev]);
  };

  // ── Study navigation helper ──
  const navigateStudy = (direction) => {
    const newIdx = direction === "prev"
      ? Math.max(0, study.studyIndex - 1)
      : Math.min(subtitles.length - 1, study.studyIndex + 1);
    study.studyIndexRef.current = newIdx;
    study.setStudyIndex(newIdx);
    setExpandedNote(null);
    if (edit.isEditing) edit.cancelEditing();
    if (edit.splitMode) edit.cancelSplit();
    setHash(video.id, subtitles[newIdx].index, false, "edit");
    if (loopTargetRef.current && player.playerInstanceRef.current) {
      const s = subtitles[newIdx];
      loopTargetRef.current = { start: s.start, end: s.end };
      player.playerInstanceRef.current.seekTo(s.start);
      player.playerInstanceRef.current.playVideo();
    }
  };

  // Aliases for readability
  const { studyMode, studyIndex, hudDisplay, setHudDisplay } = study;
  const { playerRef, playerReady, isPlaying, currentTime, showPanel, currentSubtitle, activeSubtitle, isLooping, isContinuousPlay } = player;
  const { isEditing, editData, setEditData, linkAdjacent, setLinkAdjacent, isSaving, isMerging, splitMode, splitPoints, setSplitPoints, isSplitting, splitAllSelected, canEdit } = edit;

  return (
    <>
      {/* ═══ COCKPIT HEADER ═══ */}
      <div className="cockpit-panel" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={onBack} className="phys-btn" style={{ color: "#f87171", padding: "5px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <span className="led led-red" /> ABORT
        </button>
        <span className="label-plate" style={{ color: T.cockpit.labelColor, flexShrink: 0 }}>CALLSIGN</span>
        <span style={{ fontSize: "12px", color: T.cockpit.greenText, fontFamily: "'JetBrains Mono', 'SF Mono', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
          {video.title}
        </span>
        {hasPronunciation && (
          <button
            onClick={() => {
              if (studyMode) exitStudyMode(activeSubtitle);
              else enterStudyMode(activeSubtitle);
            }}
            className="phys-btn"
            style={{
              background: studyMode ? "linear-gradient(180deg, #4a3700, #3a2d00) !important" : undefined,
              borderColor: studyMode ? "rgba(251,191,36,0.35) !important" : undefined,
              color: studyMode ? T.cockpit.amberText : T.cockpit.labelColor,
              padding: "5px 12px", borderRadius: "5px", cursor: "pointer",
              fontSize: "10px", fontWeight: "700", fontFamily: "monospace", flexShrink: 0,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            <span className={`led ${studyMode ? "led-amber" : "led-blue"}`} style={{ marginRight: "4px" }} />
            {studyMode ? "FLIGHT" : "EDIT"}
          </button>
        )}
      </div>

      {showSaved ? (
        /* ═══ SAVED EXPRESSIONS VIEW ═══ */
        <div style={{ padding: "20px", maxWidth: "640px", margin: "0 auto" }}>
          <h3 style={{ marginBottom: "16px", fontSize: "16px", background: "linear-gradient(135deg, #e8e8ed, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            저장한 표현들
          </h3>
          {savedExpressions.length === 0 ? (
            <div style={{ textAlign: "center", color: T.textMuted, padding: "40px", background: T.surface, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, borderRadius: T.radius.md, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: "32px", marginBottom: "12px" }}>📭</p>
              <p>아직 저장한 표현이 없어요</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {savedExpressions.map((expr, i) => (
                <div key={i} style={{ background: T.surface, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, borderRadius: T.radius.md, padding: "16px", border: `1px solid ${T.border}`, borderLeftColor: T.accent, borderLeftWidth: "3px", transition: `all 0.2s ${T.ease}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ color: T.accentLight, fontWeight: "700", fontSize: "16px" }}>{expr.word}</span>
                      <span style={{ color: T.gold, marginLeft: "10px", fontSize: "15px" }}>{expr.actual}</span>
                    </div>
                    <button
                      onClick={async () => {
                        if (expr.id && user && supabase) {
                          const { error } = await removeSavedExpression(expr.id);
                          if (error) console.error("표현 삭제 실패:", error.message);
                        }
                        setSavedExpressions((prev) => prev.filter((_, idx) => idx !== i));
                      }}
                      style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: "18px", transition: `color 0.2s ${T.ease}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.red; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}
                    >×</button>
                  </div>
                  <div style={{ color: T.textSec, fontSize: "13px", marginTop: "6px" }}>{expr.meaning}</div>
                  <div style={{ color: T.textMuted, fontSize: "12px", marginTop: "8px", fontStyle: "italic" }}>"{expr.sentence}"</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          {/* ═══ STUDY MODE ═══ */}
          {studyMode && subtitles[studyIndex] && (
            <div style={{ padding: "20px", animation: `slideUp 0.3s ${T.ease}` }}>
              {/* FIDS DISPLAY BOARD */}
              <div className="fids-board" style={{ marginBottom: "0" }}>
                <div className="fids-scan" />

                {/* ORIGINAL */}
                <div className="fids-header">
                  <span className="fids-tag" style={{ color: splitMode ? T.cockpit.redText : "#8b9cf7", borderColor: splitMode ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)" }}>
                    {splitMode ? "✂ CUT" : "TXT"}
                  </span>
                  <span style={{ fontSize: "9px", fontFamily: "'Courier New', monospace", color: splitMode ? T.cockpit.redText : "rgba(139,156,247,0.6)", letterSpacing: "0.1em", fontWeight: "600" }}>
                    {splitMode ? "SELECT SPLIT POINT" : "ORIGINAL"}
                  </span>
                  {splitMode && splitPoints.text != null && <span className="led led-green" style={{ marginLeft: "auto" }} />}
                </div>
                <div className="fids-content">
                  {splitMode ? (
                    <div style={{ fontSize: "18px", fontWeight: "700", lineHeight: "2.2", color: "#a5b4fc", display: "flex", flexWrap: "wrap", gap: "0px", alignItems: "center", textShadow: "0 0 12px rgba(99,102,241,0.5), 0 0 30px rgba(99,102,241,0.15)" }}>
                      {subtitles[studyIndex].text.split(/\s+/).map((word, wi, arr) => (
                        <span key={wi} style={{ display: "inline-flex", alignItems: "center" }}>
                          <span style={{ padding: "2px 5px", borderRadius: "2px", background: splitPoints.text != null && wi < splitPoints.text ? "rgba(99,102,241,0.2)" : "transparent", color: splitPoints.text != null && wi < splitPoints.text ? "#c4b5fd" : "#a5b4fc", transition: "all 0.15s ease" }}>{word}</span>
                          {wi < arr.length - 1 && (
                            <button onClick={() => setSplitPoints(p => ({ ...p, text: wi + 1 }))} style={{ background: splitPoints.text === wi + 1 ? "#ef4444" : "rgba(30,30,45,0.8)", border: splitPoints.text === wi + 1 ? "1px solid #ef4444" : "1px solid rgba(60,60,80,0.4)", color: splitPoints.text === wi + 1 ? "#fff" : "rgba(100,100,130,0.5)", cursor: "pointer", padding: "0 3px", margin: "0 2px", borderRadius: "2px", fontSize: "16px", lineHeight: "1.4", minWidth: "16px", fontWeight: "900", boxShadow: splitPoints.text === wi + 1 ? "0 0 8px rgba(239,68,68,0.4)" : "none" }} title={`"${arr.slice(0, wi + 1).join(' ')}" | "${arr.slice(wi + 1).join(' ')}"`}>|</button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "18px", fontWeight: "700", lineHeight: "1.6", color: "#a5b4fc", letterSpacing: "0.02em", textShadow: "0 0 12px rgba(99,102,241,0.5), 0 0 30px rgba(99,102,241,0.15)" }}>
                      {subtitles[studyIndex].text}
                    </div>
                  )}
                </div>
                {splitMode && (
                  <div className="fids-status" style={{ color: splitPoints.text != null ? "#34d399" : "rgba(100,100,130,0.5)", borderTop: "1px solid rgba(40,40,55,0.5)" }}>
                    {splitPoints.text != null ? "● CONFIRMED" : "○ AWAITING INPUT"}
                  </div>
                )}

                {/* PRONUNCIATION */}
                {hasPronunciation && (
                  <>
                    <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(80,80,100,0.3), transparent)" }} />
                    <div className="fids-header">
                      <span className="fids-tag" style={{ color: splitMode ? T.cockpit.redText : "#fbbf24", borderColor: splitMode ? "rgba(239,68,68,0.3)" : "rgba(251,191,36,0.3)" }}>
                        {splitMode ? "✂ CUT" : "🔊"}
                      </span>
                      <span style={{ fontSize: "9px", fontFamily: "'Courier New', monospace", color: splitMode ? T.cockpit.redText : "rgba(251,191,36,0.6)", letterSpacing: "0.1em", fontWeight: "600" }}>
                        {splitMode ? "SELECT SPLIT POINT" : "PRONUNCIATION"}
                      </span>
                      {splitMode && splitPoints.pronunciation != null && <span className="led led-green" style={{ marginLeft: "auto" }} />}
                    </div>
                    <div className="fids-content">
                      {isEditing ? (
                        <input type="text" value={editData.pronunciation} onChange={(e) => setEditData({ ...editData, pronunciation: e.target.value })} style={{ width: "100%", background: "transparent", border: "none", padding: "0", color: "#fbbf24", fontSize: "20px", fontWeight: "700", fontFamily: "'Courier New', monospace", outline: "none", boxSizing: "border-box", textShadow: "0 0 12px rgba(251,191,36,0.5), 0 0 30px rgba(251,191,36,0.15)" }} />
                      ) : splitMode && subtitles[studyIndex].pronunciation ? (
                        <div style={{ fontSize: "20px", fontWeight: "700", lineHeight: "2.2", color: "#fbbf24", display: "flex", flexWrap: "wrap", gap: "0px", alignItems: "center", textShadow: "0 0 12px rgba(251,191,36,0.5), 0 0 30px rgba(251,191,36,0.15)" }}>
                          {subtitles[studyIndex].pronunciation.split(/\s+/).map((word, wi, arr) => (
                            <span key={wi} style={{ display: "inline-flex", alignItems: "center" }}>
                              <span style={{ padding: "2px 5px", borderRadius: "2px", background: splitPoints.pronunciation != null && wi < splitPoints.pronunciation ? "rgba(251,191,36,0.15)" : "transparent", transition: "all 0.15s ease" }}>{word}</span>
                              {wi < arr.length - 1 && (
                                <button onClick={() => setSplitPoints(p => ({ ...p, pronunciation: wi + 1 }))} style={{ background: splitPoints.pronunciation === wi + 1 ? "#ef4444" : "rgba(30,30,45,0.8)", border: splitPoints.pronunciation === wi + 1 ? "1px solid #ef4444" : "1px solid rgba(60,60,80,0.4)", color: splitPoints.pronunciation === wi + 1 ? "#fff" : "rgba(100,100,130,0.5)", cursor: "pointer", padding: "0 3px", margin: "0 2px", borderRadius: "2px", fontSize: "16px", lineHeight: "1.4", minWidth: "16px", fontWeight: "900", boxShadow: splitPoints.pronunciation === wi + 1 ? "0 0 8px rgba(239,68,68,0.4)" : "none" }} title={`"${arr.slice(0, wi + 1).join(' ')}" | "${arr.slice(wi + 1).join(' ')}"`}>|</button>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: "20px", fontWeight: "700", lineHeight: "1.6", color: "#fbbf24", textShadow: "0 0 12px rgba(251,191,36,0.5), 0 0 30px rgba(251,191,36,0.15)" }}>
                          {subtitles[studyIndex].pronunciation}
                        </div>
                      )}
                    </div>
                    {splitMode && (
                      <div className="fids-status" style={{ color: splitPoints.pronunciation != null ? "#34d399" : "rgba(100,100,130,0.5)", borderTop: "1px solid rgba(40,40,55,0.5)" }}>
                        {splitPoints.pronunciation != null ? "● CONFIRMED" : "○ AWAITING INPUT"}
                      </div>
                    )}

                    {/* TRANSLATION */}
                    <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(80,80,100,0.3), transparent)" }} />
                    <div className="fids-header">
                      <span className="fids-tag" style={{ color: splitMode ? T.cockpit.redText : "#34d399", borderColor: splitMode ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.3)" }}>
                        {splitMode ? "✂ CUT" : "🇰🇷"}
                      </span>
                      <span style={{ fontSize: "9px", fontFamily: "'Courier New', monospace", color: splitMode ? T.cockpit.redText : "rgba(52,211,153,0.6)", letterSpacing: "0.1em", fontWeight: "600" }}>
                        {splitMode ? "SELECT SPLIT POINT" : "TRANSLATION"}
                      </span>
                      {splitMode && splitPoints.translation != null && <span className="led led-green" style={{ marginLeft: "auto" }} />}
                    </div>
                    <div className="fids-content">
                      {isEditing ? (
                        <input type="text" value={editData.translation} onChange={(e) => setEditData({ ...editData, translation: e.target.value })} style={{ width: "100%", background: "transparent", border: "none", padding: "0", color: "#a5f3c4", fontSize: "17px", fontWeight: "600", fontFamily: "'Courier New', monospace", outline: "none", boxSizing: "border-box", textShadow: "0 0 12px rgba(52,211,153,0.5), 0 0 30px rgba(52,211,153,0.15)" }} />
                      ) : splitMode && subtitles[studyIndex].translation ? (
                        <div style={{ fontSize: "17px", fontWeight: "600", lineHeight: "2.2", color: "#a5f3c4", display: "flex", flexWrap: "wrap", gap: "0px", alignItems: "center", textShadow: "0 0 12px rgba(52,211,153,0.5), 0 0 30px rgba(52,211,153,0.15)" }}>
                          {subtitles[studyIndex].translation.split(/\s+/).map((word, wi, arr) => (
                            <span key={wi} style={{ display: "inline-flex", alignItems: "center" }}>
                              <span style={{ padding: "2px 5px", borderRadius: "2px", background: splitPoints.translation != null && wi < splitPoints.translation ? "rgba(52,211,153,0.15)" : "transparent", transition: "all 0.15s ease" }}>{word}</span>
                              {wi < arr.length - 1 && (
                                <button onClick={() => setSplitPoints(p => ({ ...p, translation: wi + 1 }))} style={{ background: splitPoints.translation === wi + 1 ? "#ef4444" : "rgba(30,30,45,0.8)", border: splitPoints.translation === wi + 1 ? "1px solid #ef4444" : "1px solid rgba(60,60,80,0.4)", color: splitPoints.translation === wi + 1 ? "#fff" : "rgba(100,100,130,0.5)", cursor: "pointer", padding: "0 3px", margin: "0 2px", borderRadius: "2px", fontSize: "16px", lineHeight: "1.4", minWidth: "16px", fontWeight: "900", boxShadow: splitPoints.translation === wi + 1 ? "0 0 8px rgba(239,68,68,0.4)" : "none" }} title={`"${arr.slice(0, wi + 1).join(' ')}" | "${arr.slice(wi + 1).join(' ')}"`}>|</button>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: "17px", fontWeight: "600", lineHeight: "1.6", color: "#a5f3c4", textShadow: "0 0 12px rgba(52,211,153,0.5), 0 0 30px rgba(52,211,153,0.15)" }}>
                          {subtitles[studyIndex].translation}
                        </div>
                      )}
                    </div>
                    {splitMode && (
                      <div className="fids-status" style={{ color: splitPoints.translation != null ? "#34d399" : "rgba(100,100,130,0.5)", borderTop: "1px solid rgba(40,40,55,0.5)" }}>
                        {splitPoints.translation != null ? "● CONFIRMED" : "○ AWAITING INPUT"}
                      </div>
                    )}

                    {/* TIMING */}
                    <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(80,80,100,0.3), transparent)" }} />
                    <div className="fids-header" style={{ justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="fids-tag" style={{ color: T.cockpit.amberText, borderColor: "rgba(251,191,36,0.3)" }}>⏱</span>
                        <span style={{ fontSize: "9px", fontFamily: "'Courier New', monospace", color: "rgba(251,191,36,0.6)", letterSpacing: "0.1em", fontWeight: "600" }}>TIMING</span>
                      </div>
                      {isEditing && (
                        <button onClick={() => setLinkAdjacent(!linkAdjacent)} style={{ background: linkAdjacent ? "rgba(251,191,36,0.1)" : "transparent", border: linkAdjacent ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(60,60,80,0.4)", color: linkAdjacent ? "#fbbf24" : "rgba(100,100,130,0.5)", padding: "2px 8px", borderRadius: "2px", cursor: "pointer", fontSize: "9px", fontFamily: "'Courier New', monospace", fontWeight: "700", letterSpacing: "0.05em" }}>
                          LINK {linkAdjacent ? "ON" : "OFF"}
                        </button>
                      )}
                    </div>
                    <div className="fids-content" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      {isEditing ? (
                        <>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "9px", color: "rgba(251,191,36,0.5)", marginBottom: "4px", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" }}>START</div>
                            <input type="number" step="0.1" value={editData.start} onChange={(e) => { const v = e.target.value; setEditData({ ...editData, start: v }); if (loopTargetRef.current) loopTargetRef.current = { ...loopTargetRef.current, start: parseFloat(v) || 0 }; }} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "2px", padding: "8px 10px", color: "#fbbf24", fontSize: "14px", fontWeight: "700", fontFamily: "'Courier New', monospace", outline: "none", boxSizing: "border-box", textShadow: "0 0 8px rgba(251,191,36,0.4)" }} />
                          </div>
                          <div style={{ color: "rgba(251,191,36,0.3)", fontSize: "18px", paddingTop: "18px", fontFamily: "'Courier New', monospace" }}>▸</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "9px", color: "rgba(251,191,36,0.5)", marginBottom: "4px", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" }}>END</div>
                            <input type="number" step="0.1" value={editData.end} onChange={(e) => { const v = e.target.value; setEditData({ ...editData, end: v }); if (loopTargetRef.current) loopTargetRef.current = { ...loopTargetRef.current, end: parseFloat(v) || 0 }; }} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "2px", padding: "8px 10px", color: "#fbbf24", fontSize: "14px", fontWeight: "700", fontFamily: "'Courier New', monospace", outline: "none", boxSizing: "border-box", textShadow: "0 0 8px rgba(251,191,36,0.4)" }} />
                          </div>
                          <div style={{ color: "rgba(251,191,36,0.4)", fontSize: "12px", paddingTop: "18px", minWidth: "60px", fontFamily: "'Courier New', monospace", fontWeight: "700", textShadow: "0 0 6px rgba(251,191,36,0.3)" }}>
                            {(parseFloat(editData.end) - parseFloat(editData.start)).toFixed(1)}s
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "9px", color: "rgba(251,191,36,0.5)", marginBottom: "4px", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" }}>START</div>
                            <div style={{ color: "#fbbf24", fontSize: "14px", fontWeight: "700", fontFamily: "'Courier New', monospace", textShadow: "0 0 8px rgba(251,191,36,0.4)" }}>{subtitles[studyIndex].start.toFixed(1)}</div>
                          </div>
                          <div style={{ color: "rgba(251,191,36,0.3)", fontSize: "18px", fontFamily: "'Courier New', monospace" }}>▸</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "9px", color: "rgba(251,191,36,0.5)", marginBottom: "4px", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" }}>END</div>
                            <div style={{ color: "#fbbf24", fontSize: "14px", fontWeight: "700", fontFamily: "'Courier New', monospace", textShadow: "0 0 8px rgba(251,191,36,0.4)" }}>{subtitles[studyIndex].end.toFixed(1)}</div>
                          </div>
                          <div style={{ color: "rgba(251,191,36,0.4)", fontSize: "12px", minWidth: "60px", fontFamily: "'Courier New', monospace", fontWeight: "700", textShadow: "0 0 6px rgba(251,191,36,0.3)" }}>
                            {(subtitles[studyIndex].end - subtitles[studyIndex].start).toFixed(1)}s
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ═══ COCKPIT CONTROL PANEL ═══ */}
              {hasPronunciation && canEdit && (
                <div className="cockpit-panel" style={{ padding: "16px 16px 14px", marginBottom: "16px" }}>
                  {/* NAV */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "10px" }}>
                    <button onClick={() => navigateStudy("prev")} disabled={studyIndex === 0} className="phys-btn" style={{ padding: "10px 18px", borderRadius: "5px", cursor: studyIndex === 0 ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "700", opacity: studyIndex === 0 ? 0.4 : 1, lineHeight: "1" }}>◀</button>
                    <span style={{ fontSize: "11px", color: T.cockpit.greenText, fontFamily: "monospace", fontWeight: "700", fontVariantNumeric: "tabular-nums", textShadow: "0 0 6px rgba(52,211,153,0.4)", minWidth: "48px", textAlign: "center" }}>
                      {studyIndex + 1} / {subtitles.length}
                    </span>
                    <button onClick={() => navigateStudy("next")} disabled={studyIndex === subtitles.length - 1} className="phys-btn" style={{ padding: "10px 18px", borderRadius: "5px", cursor: studyIndex === subtitles.length - 1 ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "700", opacity: studyIndex === subtitles.length - 1 ? 0.4 : 1, lineHeight: "1" }}>▶</button>
                  </div>

                  {/* PLAYBACK */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                    <button onClick={() => { const sub = subtitles[studyIndex]; if (!playerReady || !player.playerInstanceRef.current || !sub) return; player.playerInstanceRef.current.seekTo(sub.start); player.playerInstanceRef.current.playVideo(); if (!loopTargetRef.current) { const checkEnd = setInterval(() => { if (player.playerInstanceRef.current) { const ct = player.playerInstanceRef.current.getCurrentTime(); if (ct >= sub.end) { player.playerInstanceRef.current.pauseVideo(); clearInterval(checkEnd); } } else clearInterval(checkEnd); }, 100); } }} className="phys-btn" style={{ flex: 1, padding: "10px", borderRadius: "5px", cursor: playerReady ? "pointer" : "not-allowed", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", opacity: playerReady ? 1 : 0.4, color: T.text }}>
                      <span className="led led-blue" style={{ marginRight: "5px" }} /> LISTEN
                    </button>
                    <button onClick={() => { const sub = subtitles[studyIndex]; if (!playerReady || !player.playerInstanceRef.current || !sub) return; if (loopTargetRef.current) { loopTargetRef.current = null; player.setIsLooping(false); player.playerInstanceRef.current.pauseVideo(); } else { continuousPlayRef.current = false; player.setIsContinuousPlay(false); loopTargetRef.current = { start: sub.start, end: sub.end }; player.setIsLooping(true); player.playerInstanceRef.current.seekTo(sub.start); player.playerInstanceRef.current.playVideo(); } }} className="phys-btn" style={{ flex: 1, padding: "10px", borderRadius: "5px", cursor: playerReady ? "pointer" : "not-allowed", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", opacity: playerReady ? 1 : 0.4, background: isLooping ? "linear-gradient(180deg, #4f46e5, #3730a3) !important" : undefined, borderColor: isLooping ? "rgba(99,102,241,0.4) !important" : undefined, color: isLooping ? "#fff" : T.cockpit.labelColor }}>
                      <span className={`led ${isLooping ? "led-blue led-blink" : "led-off"}`} style={{ marginRight: "5px" }} /> REPEAT
                    </button>
                    <button onClick={() => { const sub = subtitles[studyIndex]; if (!playerReady || !player.playerInstanceRef.current || !sub) return; if (continuousPlayRef.current) { continuousPlayRef.current = false; player.setIsContinuousPlay(false); player.playerInstanceRef.current.pauseVideo(); } else { loopTargetRef.current = null; player.setIsLooping(false); continuousPlayRef.current = true; player.setIsContinuousPlay(true); player.playerInstanceRef.current.seekTo(sub.start); player.playerInstanceRef.current.playVideo(); } }} className="phys-btn" style={{ flex: 1, padding: "10px", borderRadius: "5px", cursor: playerReady ? "pointer" : "not-allowed", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", opacity: playerReady ? 1 : 0.4, color: isContinuousPlay ? T.cockpit.greenText : T.textMuted }}>
                      <span className={`led ${isContinuousPlay ? "led-green led-blink" : "led-off"}`} style={{ marginRight: "5px" }} /> CONT
                    </button>
                  </div>

                  {/* COMMAND */}
                  <div style={{ display: "flex", gap: "6px", paddingTop: "10px", borderTop: T.cockpit.seam }}>
                    {isEditing ? (
                      <>
                        <button onClick={edit.saveEdit} disabled={isSaving} className="phys-btn" style={{ flex: 1, padding: "10px", borderRadius: "5px", cursor: isSaving ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", opacity: isSaving ? 0.6 : 1, background: "linear-gradient(180deg, #166534, #14532d) !important", borderColor: "rgba(52,211,153,0.4) !important", color: "#fff" }}>
                          <span className={`led ${isSaving ? "led-amber led-blink" : "led-green"}`} style={{ marginRight: "5px" }} /> {isSaving ? "SAVING..." : "SAVE"}
                        </button>
                        <button onClick={edit.cancelEditing} className="phys-btn" style={{ flex: 1, padding: "10px", borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", color: T.textMuted }}>CANCEL</button>
                      </>
                    ) : splitMode ? (
                      <>
                        <button onClick={edit.confirmSplit} disabled={!splitAllSelected || isSplitting} className="phys-btn" style={{ flex: 1, padding: "10px", borderRadius: "5px", cursor: splitAllSelected && !isSplitting ? "pointer" : "not-allowed", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", opacity: splitAllSelected ? 1 : 0.4, background: splitAllSelected ? "linear-gradient(180deg, #991b1b, #7f1d1d) !important" : undefined, borderColor: splitAllSelected ? "rgba(239,68,68,0.4) !important" : undefined, color: splitAllSelected ? "#fff" : T.textMuted }}>
                          <span className={`led ${splitAllSelected ? "led-red" : "led-off"}`} style={{ marginRight: "5px" }} /> CUT
                        </button>
                        <button onClick={edit.cancelSplit} className="phys-btn" style={{ flex: 1, padding: "10px", borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", color: T.textMuted }}>CANCEL</button>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "9px", fontFamily: "monospace", color: T.textMuted }}>
                          <span className={`led ${splitPoints.text != null ? "led-green" : "led-off"}`} />
                          <span className={`led ${splitPoints.pronunciation != null ? "led-green" : "led-off"}`} />
                          <span className={`led ${splitPoints.translation != null ? "led-green" : "led-off"}`} />
                        </div>
                      </>
                    ) : (
                      <>
                        <button onClick={edit.startEditing} className="phys-btn" style={{ flex: 1, padding: "10px", borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", color: T.cockpit.amberText }}>
                          <span className="led led-amber" style={{ marginRight: "5px" }} /> EDIT
                        </button>
                        <button onClick={edit.startSplit} disabled={subtitles[studyIndex].text.split(/\s+/).length < 2} className="phys-btn" style={{ flex: 1, padding: "10px", borderRadius: "5px", cursor: subtitles[studyIndex].text.split(/\s+/).length < 2 ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", opacity: subtitles[studyIndex].text.split(/\s+/).length < 2 ? 0.4 : 1, color: T.cockpit.redText }}>
                          <span className="led led-red" style={{ marginRight: "5px" }} /> SPLIT
                        </button>
                        {studyIndex > 0 && (
                          <button onClick={edit.mergeWithPrev} disabled={isMerging} className="phys-btn" style={{ flex: 1, padding: "10px", borderRadius: "5px", cursor: isMerging ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", opacity: isMerging ? 0.4 : 1, color: T.textMuted }}>
                            <span className={`led ${isMerging ? "led-red led-blink" : "led-off"}`} style={{ marginRight: "5px" }} /> MERGE
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Notes (Study Mode) */}
              {subtitles[studyIndex].notes && subtitles[studyIndex].notes.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: T.textSec, fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px", padding: "0 4px" }}>💡 발음 포인트</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {subtitles[studyIndex].notes.map((note, i) => (
                      <div key={i} style={{ background: T.surface, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, borderRadius: T.radius.md, padding: "14px 16px", cursor: "pointer", border: expandedNote === i ? `1px solid ${T.borderHover}` : `1px solid ${T.border}`, transition: `all 0.3s ${T.ease}`, boxShadow: expandedNote === i ? T.glow : "none" }} onClick={() => setExpandedNote(expandedNote === i ? null : i)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ color: T.accentLight, fontWeight: "700", fontSize: "15px", fontFamily: "monospace" }}>{note.word}</span>
                            <span style={{ color: T.textMuted }}>→</span>
                            <span style={{ color: T.gold, fontWeight: "700", fontSize: "15px" }}>{note.actual}</span>
                          </div>
                          <span style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button onClick={(e) => { e.stopPropagation(); saveExpression(note); }} style={{ background: savedExpressions.find((e) => e.word === note.word && e.video_id === video.id) ? "linear-gradient(135deg, #22c55e, #16a34a)" : T.surface, border: savedExpressions.find((e) => e.word === note.word && e.video_id === video.id) ? "none" : `1px solid ${T.border}`, color: "white", padding: "4px 12px", borderRadius: T.radius.sm, cursor: "pointer", fontSize: "12px", transition: `all 0.2s ${T.ease}` }}>
                              {savedExpressions.find((e) => e.word === note.word && e.video_id === video.id) ? "✓" : "+"}
                            </button>
                            {canEdit && (
                              <button onClick={(e) => { e.stopPropagation(); edit.deleteNote(i); }} style={{ background: "none", border: "1px solid rgba(239,68,68,0.2)", color: T.cockpit.redText, padding: "4px 8px", borderRadius: T.radius.sm, cursor: "pointer", fontSize: "11px", transition: `all 0.2s ${T.ease}`, opacity: 0.6 }} onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.background = "none"; }} title="발음포인트 삭제">✕</button>
                            )}
                          </span>
                        </div>
                        {expandedNote === i && (
                          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.border}`, color: T.textSec, fontSize: "13px", lineHeight: "1.6", animation: `fadeIn 0.2s ${T.ease}` }}>{note.meaning}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ VIDEO MODE ═══ */}
          <div style={{ display: studyMode ? "none" : "block" }}>

            {/* WINDSHIELD */}
            <div style={{ position: "relative", background: "linear-gradient(180deg, #1a1a28, #12121e)", padding: "10px 10px 0 10px", boxShadow: "inset 0 0 40px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,255,255,0.02)", borderBottom: "2px solid rgba(80,80,100,0.4)", borderTop: "1px solid rgba(60,60,80,0.3)" }}>
              <div ref={playerRef} style={{ width: "100%", background: "#000", borderRadius: "3px", overflow: "hidden", boxShadow: "inset 0 0 30px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.05)", border: "2px solid rgba(70,70,90,0.5)" }}>
                <div id={`yt-player-${video.id}`}></div>
              </div>

              {/* HUD Overlay */}
              <div className="hud-overlay" style={{ position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 10, background: T.cockpit.hudBg, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: "8px", padding: "12px 18px", minWidth: "300px", maxWidth: "500px", width: "85%", border: `1px solid ${T.cockpit.hudBorder}`, animation: "hudPulse 3s ease-in-out infinite", transition: `all 0.3s ${T.ease}`, pointerEvents: "none" }}>
                {isLooping && <div style={{ fontSize: "10px", color: T.cockpit.amberText, marginBottom: "6px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase" }}>🔄 LOOP ACTIVE</div>}
                {activeSubtitle ? (
                  <div>
                    {hudDisplay.original && (<><div style={{ fontSize: "10px", color: T.cockpit.labelColor, fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px", opacity: 0.8 }}>ORIGINAL</div><div style={{ fontSize: "14px", color: "#e0e0e8", marginBottom: "8px", lineHeight: "1.4" }}>{activeSubtitle.text}</div></>)}
                    {hasPronunciation && hudDisplay.pronunciation && (<><div style={{ fontSize: "10px", color: T.cockpit.amberText, fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "3px", opacity: 0.8 }}>🔊 PRONUNCIATION</div><div style={{ fontSize: "17px", fontWeight: "700", color: T.cockpit.amberText, lineHeight: "1.3", marginBottom: hudDisplay.translation ? "6px" : "0" }}>{activeSubtitle.pronunciation}</div></>)}
                    {hasPronunciation && hudDisplay.translation && (<><div style={{ fontSize: "10px", color: T.cockpit.greenText, fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "3px", opacity: 0.8 }}>🇰🇷 TRANSLATION</div><div style={{ fontSize: "13px", color: "#a5f3c4", lineHeight: "1.4" }}>{activeSubtitle.translation}</div></>)}
                    {!hudDisplay.original && !hudDisplay.pronunciation && !hudDisplay.translation && <div style={{ fontSize: "11px", color: T.textMuted, textAlign: "center", fontFamily: "monospace", letterSpacing: "0.1em" }}>HUD OFF</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: "11px", color: T.textMuted, textAlign: "center", fontFamily: "monospace", letterSpacing: "0.1em" }}>AWAITING SIGNAL...</div>
                )}
              </div>
            </div>

            {/* Flight Gauge */}
            {playerReady && (
              <div className="gauge-bezel" style={{ margin: "0", borderRadius: "0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="label-plate" style={{ color: T.cockpit.greenText, flexShrink: 0 }}>ALT</span>
                  <div style={{ position: "relative", height: "8px", flex: 1, background: "#0e0e1a", borderRadius: "4px", cursor: "pointer", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.03)", border: "1px solid rgba(60,60,80,0.4)" }} onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); playback.seekTo(((e.clientX - rect.left) / rect.width) * playback.getDuration()); }}>
                    <div style={{ height: "100%", width: `${playback.getDuration() > 0 ? (currentTime / playback.getDuration()) * 100 : 0}%`, background: "linear-gradient(90deg, #34d399, #6366f1, #fbbf24)", borderRadius: "3px", transition: isPlaying ? "none" : "width 0.2s", boxShadow: "0 0 8px rgba(99,102,241,0.4), 0 0 2px rgba(99,102,241,0.6)" }} />
                    {subtitles.map((sub, i) => { const d = playback.getDuration() || 100; return (<div key={i} style={{ position: "absolute", top: "-2px", left: `${(sub.start / d) * 100}%`, width: "1px", height: "12px", background: "rgba(99,102,241,0.3)" }} />); })}
                  </div>
                  <span style={{ fontSize: "11px", color: T.cockpit.greenText, fontFamily: "monospace", fontVariantNumeric: "tabular-nums", minWidth: "76px", textAlign: "right" }}>
                    {playback.formatTime(currentTime)}<span style={{ color: T.textMuted }}>/</span>{playback.formatTime(playback.getDuration())}
                  </span>
                </div>
              </div>
            )}

            {/* ═══ COCKPIT INSTRUMENT PANEL ═══ */}
            <div className="cockpit-panel" style={{ padding: "20px 16px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1.2fr auto 1fr", gap: "0", alignItems: "start" }}>
                {/* THROTTLE */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "0 8px" }}>
                  <span className="label-plate" style={{ color: T.cockpit.amberText }}>THROTTLE</span>
                  <div style={{ display: "flex", alignItems: "stretch", gap: "6px" }}>
                    {(() => {
                      const steps = [0.5, 0.75, 1, 1.25, 1.5];
                      const idx = steps.indexOf(playback.speed) !== -1 ? steps.indexOf(playback.speed) : 2;
                      const gh = 100; const pad = 8;
                      return (
                        <div style={{ position: "relative", width: "32px", height: `${gh}px`, background: "linear-gradient(180deg, #0a0a16, #12121e, #0a0a16)", borderRadius: "6px", border: T.cockpit.metalBorder, boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }}>
                          <div style={{ position: "absolute", bottom: `${pad}px`, left: "4px", right: "4px", height: `${(idx / 4) * (gh - pad * 2)}px`, background: playback.speed > 1 ? "linear-gradient(to top, rgba(251,191,36,0.4), rgba(251,191,36,0.15))" : playback.speed < 1 ? "linear-gradient(to top, rgba(99,102,241,0.4), rgba(99,102,241,0.15))" : "linear-gradient(to top, rgba(52,211,153,0.4), rgba(52,211,153,0.15))", borderRadius: "3px", transition: "height 0.2s ease, background 0.2s ease" }} />
                          {steps.map((s, i) => { const ny = pad + ((4 - i) / 4) * (gh - pad * 2); return (<div key={s} style={{ position: "absolute", left: 0, right: 0, top: `${ny}px`, transform: "translateY(-0.5px)", display: "flex", alignItems: "center", pointerEvents: "none" }}><div style={{ flex: 1, height: "1px", background: s === 1 ? T.cockpit.greenText : s === playback.speed ? T.cockpit.amberText : "rgba(100,100,130,0.3)", marginLeft: "3px", marginRight: "3px" }} /></div>); })}
                          <div style={{ position: "absolute", bottom: "0px", left: 0, right: 0, textAlign: "center", fontSize: "9px", fontFamily: "monospace", fontWeight: "700", color: playback.speed !== 1 ? T.cockpit.amberText : T.cockpit.greenText, textShadow: `0 0 6px ${playback.speed !== 1 ? "rgba(251,191,36,0.3)" : "rgba(52,211,153,0.3)"}`, transform: "translateY(14px)" }}>{playback.speed.toFixed(2)}</div>
                        </div>
                      );
                    })()}
                    <div style={{ position: "relative", width: "40px", height: "100px", background: "linear-gradient(180deg, #0c0c1a, #161624, #0c0c1a)", borderRadius: "20px", border: T.cockpit.metalBorder, boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)", opacity: playerReady ? 1 : 0.4, touchAction: "none" }}>
                      <div style={{ position: "absolute", top: "6px", left: 0, right: 0, textAlign: "center", fontSize: "8px", fontFamily: "monospace", color: "rgba(100,100,130,0.5)", pointerEvents: "none", userSelect: "none" }}>＋</div>
                      <div style={{ position: "absolute", bottom: "6px", left: 0, right: 0, textAlign: "center", fontSize: "8px", fontFamily: "monospace", color: "rgba(100,100,130,0.5)", pointerEvents: "none", userSelect: "none" }}>ー</div>
                      <div style={{ position: "absolute", left: "50%", top: "20px", bottom: "20px", width: "4px", marginLeft: "-2px", background: "linear-gradient(180deg, rgba(0,0,0,0.3), rgba(30,30,50,0.2))", borderRadius: "2px", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)", pointerEvents: "none" }} />
                      <div id="stick-knob" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "32px", height: "28px", borderRadius: "14px", background: T.cockpit.btnUp, border: T.cockpit.btnBorder, boxShadow: T.cockpit.btnShadow, display: "flex", alignItems: "center", justifyContent: "center", cursor: playerReady ? "grab" : "not-allowed", transition: "top 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease", zIndex: 1 }}
                        onPointerDown={(e) => {
                          if (!playerReady) return;
                          e.preventDefault(); e.stopPropagation();
                          const knob = e.currentTarget;
                          knob.setPointerCapture(e.pointerId);
                          knob.style.cursor = "grabbing";
                          knob.style.transition = "box-shadow 0.15s ease";
                          knob.style.boxShadow = T.cockpit.btnShadowPressed;
                          const startY = e.clientY;
                          const steps = [0.5, 0.75, 1, 1.25, 1.5];
                          const threshold = 18;
                          let currentDir = 0;
                          let repeatTimer = null;
                          const speedRef = { current: playback.speed };
                          const doStep = (dir) => { const idx = steps.indexOf(speedRef.current); if (dir === -1 && idx < steps.length - 1) { speedRef.current = steps[idx + 1]; playback.updateSpeed(steps[idx + 1]); } if (dir === 1 && idx > 0) { speedRef.current = steps[idx - 1]; playback.updateSpeed(steps[idx - 1]); } };
                          const startRepeat = (dir) => { if (currentDir === dir) return; clearInterval(repeatTimer); currentDir = dir; if (dir !== 0) { doStep(dir); repeatTimer = setInterval(() => doStep(currentDir), 350); } };
                          const onMove = (ev) => { const dy = ev.clientY - startY; const clamped = Math.max(-30, Math.min(30, dy)); knob.style.top = `calc(50% + ${clamped}px)`; if (dy < -threshold) startRepeat(-1); else if (dy > threshold) startRepeat(1); else startRepeat(0); };
                          const onUp = () => { clearInterval(repeatTimer); currentDir = 0; knob.style.cursor = "grab"; knob.style.transition = "top 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease"; knob.style.top = "50%"; knob.style.boxShadow = T.cockpit.btnShadow; knob.removeEventListener("pointermove", onMove); knob.removeEventListener("pointerup", onUp); knob.removeEventListener("pointercancel", onUp); };
                          knob.addEventListener("pointermove", onMove); knob.addEventListener("pointerup", onUp); knob.addEventListener("pointercancel", onUp);
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", pointerEvents: "none" }}>
                          {[0,1,2,3].map(i => (<div key={i} style={{ width: "3px", height: "3px", borderRadius: "50%", background: "rgba(180,180,200,0.2)" }} />))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                    <span className={`led ${playback.speed !== 1 ? "led-amber" : "led-green"}`} />
                    <span style={{ fontSize: "9px", color: T.textMuted, fontFamily: "monospace" }}>SPD</span>
                  </div>
                </div>
                <div className="panel-seam" />

                {/* ENGINE */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "0 16px" }}>
                  <span className="label-plate" style={{ color: T.cockpit.labelColor }}><span className={`led ${isPlaying ? "led-green led-blink" : "led-off"}`} /> ENGINE</span>
                  <div style={{ position: "relative", width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(145deg, #2a2a3e, #1a1a2c)", border: "3px solid rgba(80,80,100,0.5)", boxShadow: isPlaying ? "0 0 25px rgba(99,102,241,0.4), 0 0 60px rgba(99,102,241,0.15), inset 0 0 15px rgba(0,0,0,0.3)" : "0 4px 8px rgba(0,0,0,0.5), inset 0 0 15px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", animation: isPlaying ? "engineGlow 2s ease-in-out infinite" : "none" }}>
                    <div style={{ position: "absolute", inset: "-6px", borderRadius: "50%", border: isPlaying ? "2px solid rgba(99,102,241,0.4)" : "2px solid rgba(60,60,80,0.3)", transition: "all 0.3s", pointerEvents: "none" }} />
                    <button onClick={playback.togglePlay} disabled={!playerReady} style={{ background: isPlaying ? "linear-gradient(145deg, #4f46e5, #6366f1)" : "linear-gradient(145deg, #3a3a50, #2a2a3e)", border: "none", color: isPlaying ? "white" : "#8888aa", cursor: playerReady ? "pointer" : "not-allowed", borderRadius: "50%", width: "54px", height: "54px", display: "flex", alignItems: "center", justifyContent: "center", opacity: playerReady ? 1 : 0.4, transition: `all 0.3s ${T.ease}`, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.05)" }} onMouseEnter={(e) => { if (playerReady) e.currentTarget.style.transform = "scale(1.06)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }} title="재생/일시정지 (Space)">
                      {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                  </div>
                  <span style={{ fontSize: "9px", color: T.textMuted, fontFamily: "monospace", letterSpacing: "0.1em" }}>{isPlaying ? "▶ RUNNING" : "■ STOPPED"}</span>
                </div>
                <div className="panel-seam" />

                {/* NAV */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "0 12px", justifyContent: "center" }}>
                  <span className="label-plate" style={{ color: T.cockpit.labelColor }}>NAV</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", width: "100%" }}>
                    <button onClick={playback.goToPrevSentence} disabled={!playerReady} className="phys-btn" style={{ color: T.accentLight, cursor: playerReady ? "pointer" : "not-allowed", padding: "14px 4px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", fontFamily: "monospace", opacity: playerReady ? 1 : 0.4 }} title="이전 문장 (←)">◀ PREV</button>
                    <button onClick={playback.goToNextSentence} disabled={!playerReady} className="phys-btn" style={{ color: T.accentLight, cursor: playerReady ? "pointer" : "not-allowed", padding: "14px 4px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", fontFamily: "monospace", opacity: playerReady ? 1 : 0.4 }} title="다음 문장 (→)">NEXT ▶</button>
                  </div>
                  <button onClick={() => { if (isLooping) { loopTargetRef.current = null; player.setIsLooping(false); } else { playback.repeatCurrentSentence(); } }} disabled={!playerReady} className="phys-btn" style={{ width: "100%", background: isLooping ? "linear-gradient(180deg, #4f46e5, #3730a3) !important" : undefined, borderColor: isLooping ? "rgba(99,102,241,0.5) !important" : undefined, color: isLooping ? "#e0e7ff" : T.cockpit.amberText, cursor: playerReady ? "pointer" : "not-allowed", padding: "12px 12px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em", opacity: playerReady ? 1 : 0.4, boxShadow: isLooping ? `${T.cockpit.glowStrong}, inset 0 1px 0 rgba(255,255,255,0.1)` : undefined }} title="반복 재생 (R)">
                    <span className={`led ${isLooping ? "led-amber led-blink" : "led-off"}`} style={{ marginRight: "5px" }} /> {isLooping ? "LOOP ON" : "LOOP"}
                  </button>
                </div>
              </div>

              {/* HUD DISPLAY toggles */}
              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: T.cockpit.seam, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                {[{ key: "original", label: "ORI", color: T.cockpit.labelColor, led: "led-blue" }, { key: "pronunciation", label: "PRON", color: T.cockpit.amberText, led: "led-amber" }, { key: "translation", label: "TRNS", color: T.cockpit.greenText, led: "led-green" }].map((item) => (
                  <button key={item.key} className="phys-btn" onClick={() => setHudDisplay((prev) => ({ ...prev, [item.key]: !prev[item.key] }))} style={{ padding: "5px 10px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.08em", color: hudDisplay[item.key] ? item.color : T.textMuted, cursor: "pointer", background: hudDisplay[item.key] ? "linear-gradient(180deg, #2e2e44, #222236) !important" : undefined, borderColor: hudDisplay[item.key] ? `${item.color}44 !important` : undefined, boxShadow: hudDisplay[item.key] ? `inset 0 2px 4px rgba(0,0,0,0.4), 0 0 8px ${item.color}22` : undefined }}>
                    <span className={`led ${hudDisplay[item.key] ? item.led : "led-off"}`} style={{ marginRight: "4px" }} /> {item.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", padding: "0 2px" }}>
                <span style={{ fontSize: "8px", color: T.cockpit.screwColor, textShadow: "0 1px 1px rgba(0,0,0,0.5)" }}>⊕</span>
                <span style={{ fontSize: "8px", color: T.textMuted, fontFamily: "monospace", letterSpacing: "0.15em" }}>FLIGHT CONTROL UNIT</span>
                <span style={{ fontSize: "8px", color: T.cockpit.screwColor, textShadow: "0 1px 1px rgba(0,0,0,0.5)" }}>⊕</span>
              </div>
            </div>

            {/* DATA BANK */}
            {showPanel && currentSubtitle && hasPronunciation && (
              <div className="cockpit-panel" style={{ padding: "20px 20px 16px", animation: `slideUp 0.3s ${T.ease}` }}>
                <div style={{ background: T.cockpit.instrument, borderRadius: "6px", padding: "16px 18px", marginBottom: "10px", border: T.cockpit.metalBorder, borderLeft: "3px solid rgba(99,102,241,0.5)", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.02)" }}>
                  <div style={{ fontSize: "9px", color: T.cockpit.labelColor, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "10px", fontFamily: "monospace" }}>━━ ORIGINAL ━━</div>
                  <div style={{ fontSize: "18px", fontWeight: "600", lineHeight: "1.5", color: "#fff" }}>{currentSubtitle.text}</div>
                </div>
                <div style={{ background: T.cockpit.instrument, borderRadius: "6px", padding: "16px 18px", marginBottom: "10px", border: T.cockpit.metalBorder, borderLeft: "3px solid rgba(251,191,36,0.5)", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontSize: "9px", color: T.cockpit.amberText, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>━━ 🔊 PRONUNCIATION ━━</div>
                    {!isEditing && canEdit && (
                      <button onClick={edit.startEditing} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textSec, padding: "4px 12px", borderRadius: T.radius.sm, cursor: "pointer", fontSize: "12px", transition: `all 0.2s ${T.ease}` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.color = T.text; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSec; }}>✏️ 수정</button>
                    )}
                  </div>
                  {isEditing ? (
                    <input type="text" value={editData.pronunciation} onChange={(e) => setEditData((d) => ({ ...d, pronunciation: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter" && !isSaving) edit.saveEdit(); }} style={{ width: "100%", fontSize: "20px", fontWeight: "700", lineHeight: "1.5", color: "#fbbf24", background: "#0d0d14", border: "1px solid #6366f1", borderRadius: "8px", padding: "8px 12px", outline: "none", boxSizing: "border-box" }} />
                  ) : (
                    <div style={{ fontSize: "20px", fontWeight: "700", lineHeight: "1.5", color: "#fbbf24" }}>{currentSubtitle.pronunciation}</div>
                  )}
                </div>
                <div style={{ background: T.cockpit.instrument, borderRadius: "6px", padding: "16px 18px", marginBottom: "14px", border: T.cockpit.metalBorder, borderLeft: "3px solid rgba(52,211,153,0.5)", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.02)" }}>
                  <div style={{ fontSize: "9px", color: T.cockpit.greenText, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "10px", fontFamily: "monospace" }}>━━ 🇰🇷 TRANSLATION ━━</div>
                  {isEditing ? (
                    <input type="text" value={editData.translation} onChange={(e) => setEditData((d) => ({ ...d, translation: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter" && !isSaving) edit.saveEdit(); }} style={{ width: "100%", fontSize: "17px", fontWeight: "500", lineHeight: "1.5", color: "#a5f3c4", background: "#0d0d14", border: "1px solid #6366f1", borderRadius: "8px", padding: "8px 12px", outline: "none", boxSizing: "border-box" }} />
                  ) : (
                    <div style={{ fontSize: "17px", fontWeight: "500", lineHeight: "1.5", color: "#a5f3c4" }}>{currentSubtitle.translation}</div>
                  )}
                </div>
                {isEditing && (
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <button onClick={edit.saveEdit} disabled={isSaving} style={{ flex: 1, background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", color: "white", padding: "12px", borderRadius: T.radius.md, cursor: isSaving ? "wait" : "pointer", fontSize: "14px", fontWeight: "700", opacity: isSaving ? 0.6 : 1, boxShadow: "0 2px 12px rgba(34,197,94,0.3)", transition: `all 0.3s ${T.ease}` }}>{isSaving ? "저장 중..." : "✓ 저장"}</button>
                    <button onClick={edit.cancelEditing} disabled={isSaving} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, color: T.textSec, padding: "12px", borderRadius: T.radius.md, cursor: "pointer", fontSize: "14px", fontWeight: "700", transition: `all 0.2s ${T.ease}` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHover; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}>✕ 취소</button>
                  </div>
                )}
                {currentSubtitle.notes && currentSubtitle.notes.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "9px", color: T.cockpit.labelColor, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "10px", padding: "0 4px", fontFamily: "monospace" }}>━━ 💡 FLIGHT NOTES ━━</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {currentSubtitle.notes.map((note, i) => (
                        <div key={i} style={{ background: T.cockpit.instrument, borderRadius: "5px", padding: "12px 14px", cursor: "pointer", border: T.cockpit.metalBorder, borderLeft: expandedNote === i ? "3px solid rgba(99,102,241,0.5)" : "3px solid rgba(60,60,80,0.3)", transition: `all 0.3s ${T.ease}`, boxShadow: expandedNote === i ? "inset 0 1px 4px rgba(0,0,0,0.3), 0 0 12px rgba(99,102,241,0.1)" : "inset 0 1px 4px rgba(0,0,0,0.3)" }} onClick={() => setExpandedNote(expandedNote === i ? null : i)} onMouseEnter={(e) => { if (expandedNote !== i) e.currentTarget.style.borderColor = "rgba(196,181,253,0.15)"; }} onMouseLeave={(e) => { if (expandedNote !== i) e.currentTarget.style.borderColor = T.border; }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span style={{ color: "#a5b4fc", fontWeight: "700", fontSize: "15px", fontFamily: "monospace" }}>{note.word}</span>
                              <span style={{ color: "#444" }}>→</span>
                              <span style={{ color: "#fbbf24", fontWeight: "700", fontSize: "15px" }}>{note.actual}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); saveExpression(note); }} style={{ background: savedExpressions.find((e) => e.word === note.word && e.video_id === video.id) ? "linear-gradient(135deg, #22c55e, #16a34a)" : T.surface, border: savedExpressions.find((e) => e.word === note.word && e.video_id === video.id) ? "none" : `1px solid ${T.border}`, color: "white", padding: "4px 12px", borderRadius: T.radius.sm, cursor: "pointer", fontSize: "12px", transition: `all 0.2s ${T.ease}`, boxShadow: savedExpressions.find((e) => e.word === note.word && e.video_id === video.id) ? "0 2px 8px rgba(34,197,94,0.3)" : "none" }}>
                              {savedExpressions.find((e) => e.word === note.word && e.video_id === video.id) ? "✓" : "+"}
                            </button>
                          </div>
                          {expandedNote === i && (<div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.border}`, color: T.textSec, fontSize: "13px", lineHeight: "1.6", animation: `fadeIn 0.2s ${T.ease}` }}>{note.meaning}</div>)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                  <button onClick={() => { if (player.playerInstanceRef.current && currentSubtitle) { loopTargetRef.current = { start: currentSubtitle.start, end: currentSubtitle.end }; player.setIsLooping(true); player.setShowPanel(false); player.playerInstanceRef.current.seekTo(currentSubtitle.start); player.playerInstanceRef.current.playVideo(); } }} className="phys-btn" style={{ flex: 1, background: "linear-gradient(180deg, #4f46e5, #3730a3) !important", borderColor: "rgba(99,102,241,0.4) !important", color: "white", padding: "12px", borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em" }}>
                    <span className="led led-blue" style={{ marginRight: "5px" }} /> REPEAT
                  </button>
                  <button onClick={() => { loopTargetRef.current = null; player.setIsLooping(false); player.setShowPanel(false); if (player.playerInstanceRef.current) player.playerInstanceRef.current.playVideo(); }} className="phys-btn" style={{ flex: 1, color: T.cockpit.greenText, padding: "12px", borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "0.1em" }}>
                    <span className="led led-green" style={{ marginRight: "5px" }} /> RESUME
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══ FLIGHT LOG ═══ */}
          <div className="cockpit-panel" style={{ padding: "16px 20px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span className="label-plate" style={{ color: T.cockpit.labelColor }}><span className="led led-green" /> FLIGHT LOG</span>
              <span style={{ fontSize: "9px", color: T.textMuted, fontFamily: "monospace" }}>{subtitles.length} ENTRIES</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "300px", overflowY: "auto" }}>
              {subtitles.map((sub, i) => {
                const isActive = studyMode ? i === studyIndex : activeSubtitle && sub.index === activeSubtitle.index;
                return (
                  <div key={i} onClick={() => { if (studyMode) { const newIdx = subtitles.findIndex((s) => s.index === sub.index); if (newIdx !== -1) { study.studyIndexRef.current = newIdx; study.setStudyIndex(newIdx); setExpandedNote(null); setHash(video.id, sub.index, false, "edit"); } } else if (player.playerInstanceRef.current) { loopTargetRef.current = null; player.setIsLooping(false); player.setShowPanel(false); setHash(video.id, sub.index); player.playerInstanceRef.current.seekTo(sub.start); player.playerInstanceRef.current.playVideo(); } }} style={{ padding: "8px 12px", borderRadius: "4px", cursor: "pointer", background: isActive ? "rgba(99,102,241,0.1)" : "transparent", borderLeft: isActive ? "3px solid rgba(99,102,241,0.6)" : "3px solid transparent", transition: `all 0.2s ${T.ease}`, display: "flex", alignItems: "center", gap: "12px", boxShadow: isActive ? "0 0 15px rgba(99,102,241,0.1)" : "none" }} onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(99,102,241,0.05)"; e.currentTarget.style.borderLeftColor = "rgba(99,102,241,0.2)"; } }} onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; } }}>
                    <span style={{ fontSize: "10px", color: isActive ? T.cockpit.amberText : T.textMuted, minWidth: "36px", fontFamily: "monospace", fontVariantNumeric: "tabular-nums", fontWeight: isActive ? "700" : "400" }}>{playback.formatTime(sub.start)}</span>
                    <span style={{ fontSize: "12px", color: isActive ? T.accentLight : T.textSec, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: `color 0.2s ${T.ease}` }}>{sub.text}</span>
                    <button onClick={(e) => { e.stopPropagation(); let url = `${window.location.origin}${window.location.pathname}#v=${video.id}&s=${sub.index}`; if (studyMode) url += `&m=edit`; navigator.clipboard.writeText(url); e.currentTarget.textContent = "✓"; setTimeout(() => { e.currentTarget.textContent = "🔗"; }, 1000); }} style={{ background: "transparent", border: "none", color: T.textMuted, cursor: "pointer", fontSize: "11px", padding: "2px 6px", borderRadius: "4px", flexShrink: 0, transition: `color 0.2s ${T.ease}`, fontFamily: "monospace" }} onMouseEnter={(e) => { e.currentTarget.style.color = T.cockpit.labelColor; }} onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }} title="퍼머링크 복사">🔗</button>
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
