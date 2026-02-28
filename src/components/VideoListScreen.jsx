import { T } from "../styles/tokens";
import { supabase } from "../lib/supabase";

export function VideoListScreen({ videos, onSelect, favoriteIds, onToggleFavorite, user }) {
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
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
