import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  signOut,
  getUserSubtitles,
  saveUserSubtitles,
  resetUserSubtitles,
  getSavedExpressions,
  getFavoriteVideos,
  addFavoriteVideo,
  removeFavoriteVideo,
} from "./lib/supabase";
import { T } from "./styles/tokens";
import { GlobalStyles } from "./styles/GlobalStyles";
import { VideoListScreen } from "./components/VideoListScreen";
import { PlayerScreen } from "./components/PlayerScreen";
import { LoginModal } from "./components/LoginModal";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { parseHash, setHash } from "./hooks/useHashRouter";

export default function MovieEnglishApp() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [baseSubtitles, setBaseSubtitles] = useState([]);
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
  const handleToggleFavorite = useCallback(
    async (videoId) => {
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
    },
    [user, favoriteIds]
  );

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

  // Load subtitle data from static JSON
  const loadVideo = async (video) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}videos/${video.id}.json`
      );
      if (!res.ok) throw new Error("data not found");
      const baseData = await res.json();
      setBaseSubtitles(baseData);

      let finalData = baseData;
      if (user) {
        const userData = await getUserSubtitles(video.id);
        if (userData) finalData = userData;
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

  // Load video index from static JSON + handle permalink on init
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.BASE_URL}videos/index.json`
        );
        const data = await res.json();
        setVideos(data);
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
      } catch (err) {
        console.log("영상 목록 로드 실패:", err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
          onMouseEnter={(e) => {
            if (selectedVideo) e.currentTarget.style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
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
          <span
            style={{
              fontWeight: "700",
              fontSize: "18px",
              background: "linear-gradient(135deg, #e8e8ed, #c4b5fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
            }}
          >
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = T.borderHover;
                  e.currentTarget.style.color = T.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.color = T.textSec;
                }}
              >
                ?
              </button>
              <button
                onClick={() => setShowSaved(!showSaved)}
                style={{
                  background: showSaved
                    ? `linear-gradient(135deg, ${T.accent}, #8b5cf6)`
                    : T.surface,
                  border: showSaved ? "none" : `1px solid ${T.border}`,
                  color: T.text,
                  padding: "8px 16px",
                  borderRadius: T.radius.pill,
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  transition: `all 0.3s ${T.ease}`,
                  boxShadow: showSaved
                    ? "0 2px 12px rgba(99,102,241,0.3)"
                    : "none",
                  backdropFilter: showSaved ? "none" : "blur(8px)",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => {
                  if (!showSaved) {
                    e.currentTarget.style.borderColor = T.borderHover;
                    e.currentTarget.style.background = T.surfaceHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showSaved) {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.background = T.surface;
                  }
                }}
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
                  <span
                    style={{
                      fontSize: "13px",
                      color: T.textSec,
                      letterSpacing: "0.01em",
                    }}
                  >
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = T.borderHover;
                      e.currentTarget.style.background = T.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = T.border;
                      e.currentTarget.style.background = T.surface;
                    }}
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 4px 20px rgba(99,102,241,0.5)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 2px 12px rgba(99,102,241,0.3)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
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
        <LoginModal onClose={() => setShowLoginModal(false)} />
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
          <div
            style={{
              fontSize: "24px",
              marginBottom: "12px",
              animation: "glowPulse 1.5s infinite",
            }}
          >
            ⏳
          </div>
          로딩 중...
        </div>
      )}

      {/* Video list or Player */}
      {!loading && !selectedVideo && (
        <VideoListScreen
          videos={videos}
          onSelect={handleSelectVideo}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
          user={user}
        />
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
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}
