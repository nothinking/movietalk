import { T } from "../styles/tokens";

export function ShortcutsModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, animation: `fadeIn 0.2s ${T.ease}`,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.surfaceSolid, borderRadius: T.radius.lg,
          padding: "28px 32px", maxWidth: "400px", width: "90%",
          border: `1px solid ${T.border}`, boxShadow: T.shadow3,
          animation: `slideUp 0.3s ${T.ease}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "17px", fontWeight: "700", margin: 0, background: "linear-gradient(135deg, #e8e8ed, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>단축키 안내</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textMuted, fontSize: "20px", cursor: "pointer", transition: `color 0.2s ${T.ease}` }} onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }} onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}>×</button>
        </div>
        <div style={{ fontSize: "14px", color: T.textSec, lineHeight: "2.2" }}>
          <div style={{ color: T.accentLight, fontWeight: "600", marginBottom: "4px", letterSpacing: "0.03em", fontSize: "12px", textTransform: "uppercase" }}>영상 모드</div>
          {[["Space", "재생 / 일시정지"], ["←", "이전 문장으로 이동"], ["→", "다음 문장으로 이동"]].map(([key, desc]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
              <kbd style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "2px 10px", borderRadius: T.radius.sm, fontSize: "12px", color: T.text, fontFamily: "monospace" }}>{key}</kbd>
              <span style={{ color: T.textSec }}>{desc}</span>
            </div>
          ))}
          <div style={{ color: T.accentLight, fontWeight: "600", marginTop: "14px", marginBottom: "4px", letterSpacing: "0.03em", fontSize: "12px", textTransform: "uppercase" }}>학습 모드</div>
          {[["←  →", "이전 / 다음 문장"], ["Space", "현재 문장 재생"], ["Esc", "학습 모드 종료"]].map(([key, desc]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
              <kbd style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "2px 10px", borderRadius: T.radius.sm, fontSize: "12px", color: T.text, fontFamily: "monospace" }}>{key}</kbd>
              <span style={{ color: T.textSec }}>{desc}</span>
            </div>
          ))}
          <div style={{ color: T.accentLight, fontWeight: "600", marginTop: "14px", marginBottom: "4px", letterSpacing: "0.03em", fontSize: "12px", textTransform: "uppercase" }}>편집</div>
          {[["Ctrl/⌘ + E", "편집 모드 진입"], ["Ctrl/⌘ + S", "편집 저장"], ["Enter", "편집 저장 (입력 필드)"]].map(([key, desc]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
              <kbd style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "2px 10px", borderRadius: T.radius.sm, fontSize: "12px", color: T.text, fontFamily: "monospace" }}>{key}</kbd>
              <span style={{ color: T.textSec }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
