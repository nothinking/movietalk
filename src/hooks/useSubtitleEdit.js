import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { setHash } from "./useHashRouter";

/**
 * 자막 편집/합치기/분리 훅
 */
export function useSubtitleEdit({
  videoId,
  subtitles,
  user,
  studyModeRef,
  studyIndexRef,
  currentSubtitle,
  setCurrentSubtitle,
  showPanel,
  loopTargetRef,
  onUpdateSubtitle,
  onMergeSubtitles,
  saveToSupabase,
  setStudyIndex,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ pronunciation: "", translation: "", start: "", end: "" });
  const [linkAdjacent, setLinkAdjacent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitPoints, setSplitPoints] = useState({ text: null, pronunciation: null, translation: null });
  const [isSplitting, setIsSplitting] = useState(false);

  const saveEditRef = useRef(null);
  const startEditingRef = useRef(null);
  const isEditingRef = useRef(false);
  const originalTimingRef = useRef(null);
  const isSavingRef = useRef(false);

  const canEdit = !supabase || !!user;
  const splitAllSelected = splitPoints.text != null && splitPoints.pronunciation != null && splitPoints.translation != null;

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
        const newSubs = [...subtitles];
        const sub = { ...newSubs[targetIdx] };
        sub.pronunciation = editData.pronunciation;
        sub.translation = editData.translation;
        sub.start = parseFloat(editData.start);
        sub.end = parseFloat(editData.end);

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
        await saveToSupabase(newSubs);

        if (onUpdateSubtitle) {
          onUpdateSubtitle(sub);
          affected.forEach((s) => onUpdateSubtitle(s));
        }
        if (!studyModeRef.current) setCurrentSubtitle(sub);
        if (loopTargetRef.current) {
          loopTargetRef.current = { start: sub.start, end: sub.end };
        }
      } else {
        const res = await fetch(`/api/subtitle/${videoId}/${targetSub.index}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pronunciation: editData.pronunciation,
            translation: editData.translation,
            start: parseFloat(editData.start),
            end: parseFloat(editData.end),
            linkAdjacent,
          }),
        });
        if (!res.ok) throw new Error("저장 실패");
        const result = await res.json();
        if (onUpdateSubtitle) {
          onUpdateSubtitle(result.subtitle);
          if (result.affected) result.affected.forEach((s) => onUpdateSubtitle(s));
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

  const mergeWithPrev = async () => {
    if (!studyModeRef.current || studyIndexRef.current <= 0) return;
    const curr = subtitles[studyIndexRef.current];
    if (!curr) return;

    if (!confirm(`"${subtitles[studyIndexRef.current - 1].text.slice(0, 30)}..." 에\n"${curr.text}" 를 합칩니다.\n\n계속할까요?`)) return;

    setIsMerging(true);
    try {
      let newSubtitles;
      if (user && supabase) {
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
        const res = await fetch(`/api/subtitle/merge/${videoId}/${curr.index}`, { method: "POST" });
        if (!res.ok) throw new Error("합치기 실패");
        const result = await res.json();
        newSubtitles = result.subtitles;
      }

      if (onMergeSubtitles) onMergeSubtitles(newSubtitles);
      const newIdx = Math.max(0, studyIndexRef.current - 1);
      studyIndexRef.current = newIdx;
      setStudyIndex(newIdx);
      setHash(videoId, newSubtitles[newIdx].index, false, "edit");
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

  const startSplit = () => {
    setSplitMode(true);
    setSplitPoints({ text: null, pronunciation: null, translation: null });
  };

  const cancelSplit = () => {
    setSplitMode(false);
    setSplitPoints({ text: null, pronunciation: null, translation: null });
  };

  const confirmSplit = async () => {
    if (!splitAllSelected) return;
    const sub = subtitles[studyIndexRef.current];
    if (!sub) return;

    setIsSplitting(true);
    try {
      let newSubtitles;
      if (user && supabase) {
        newSubtitles = [...subtitles];
        const idx = studyIndexRef.current;
        const words = sub.text.split(/\s+/);
        const textA = words.slice(0, splitPoints.text).join(" ");
        const textB = words.slice(splitPoints.text).join(" ");
        const ratio = textA.length / (textA.length + textB.length);
        const duration = sub.end - sub.start;
        const midTime = Math.round((sub.start + duration * ratio) * 100) / 100;

        let pronA, pronB;
        if (sub.pronunciation) {
          const pw = sub.pronunciation.split(/\s+/);
          pronA = pw.slice(0, splitPoints.pronunciation).join(" ");
          pronB = pw.slice(splitPoints.pronunciation).join(" ");
        }
        let transA, transB;
        if (sub.translation) {
          const tw = sub.translation.split(/\s+/);
          transA = tw.slice(0, splitPoints.translation).join(" ");
          transB = tw.slice(splitPoints.translation).join(" ");
        }

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
        const res = await fetch(`/api/subtitle/split/${videoId}/${sub.index}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ splitAfterWord: splitPoints.text }),
        });
        if (!res.ok) throw new Error("분리 실패");
        const result = await res.json();
        newSubtitles = result.subtitles;
      }

      if (onMergeSubtitles) onMergeSubtitles(newSubtitles);
      setHash(videoId, newSubtitles[studyIndexRef.current].index, false, "edit");
      if (loopTargetRef.current) {
        const newSub = newSubtitles[studyIndexRef.current];
        loopTargetRef.current = { start: newSub.start, end: newSub.end };
      }
    } catch (err) {
      alert("분리 실패: " + err.message);
    } finally {
      setIsSplitting(false);
      setSplitMode(false);
      setSplitPoints({ text: null, pronunciation: null, translation: null });
    }
  };

  const deleteNote = async (noteIndex) => {
    if (!confirm("이 발음 포인트를 삭제하시겠습니까?")) return;
    try {
      if (user && supabase) {
        const newSubtitles = [...subtitles];
        const sub = { ...newSubtitles[studyIndexRef.current] };
        sub.notes = sub.notes.filter((_, i) => i !== noteIndex);
        if (sub.notes.length === 0) delete sub.notes;
        newSubtitles[studyIndexRef.current] = sub;
        await saveToSupabase(newSubtitles);
        if (onMergeSubtitles) onMergeSubtitles(newSubtitles);
      }
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  };

  return {
    isEditing,
    setIsEditing,
    editData,
    setEditData,
    linkAdjacent,
    setLinkAdjacent,
    isSaving,
    isMerging,
    splitMode,
    splitPoints,
    setSplitPoints,
    isSplitting,
    splitAllSelected,
    canEdit,
    isEditingRef,
    isSavingRef,
    saveEditRef,
    startEditingRef,
    startEditing,
    cancelEditing,
    saveEdit,
    mergeWithPrev,
    startSplit,
    cancelSplit,
    confirmSplit,
    deleteNote,
  };
}
