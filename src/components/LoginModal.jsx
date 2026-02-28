import { T } from "../styles/tokens";
import { signInWithGoogle } from "../lib/supabase";

export function LoginModal({ onClose }) {
  return (
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
      onClick={onClose}
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
        <h3 style={{ marginBottom: "24px", fontSize: "20px", fontWeight: "700", background: "linear-gradient(135deg, #e8e8ed, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          로그인
        </h3>
        <p style={{ marginBottom: "24px", fontSize: "13px", color: T.textSec, lineHeight: "1.5" }}>
          로그인하면 자막 편집 내용이 저장됩니다
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={() => { onClose(); signInWithGoogle(); }}
            style={{
              background: "#fff", color: "#333", border: "none",
              padding: "13px 20px", borderRadius: T.radius.md, cursor: "pointer",
              fontSize: "14px", fontWeight: "600",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              transition: `all 0.3s ${T.ease}`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.5 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.4 18.8 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5 0 9.6-1.8 13.1-4.9l-6-5.2C29.2 35.8 26.7 36 24 36c-5.4 0-9.8-3.5-11.4-8.3l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6 5.2C36.5 39.4 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
            </svg>
            Google로 로그인
          </button>
        </div>
        <button
          onClick={onClose}
          style={{ marginTop: "20px", background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: "13px", transition: `color 0.2s ${T.ease}` }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
