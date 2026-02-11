import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase가 설정되지 않았으면 null (로컬 전용 모드)
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// --- Auth 헬퍼 ---

export async function signInWithGoogle() {
  if (!supabase) return { error: { message: "Supabase 미설정" } };
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

export async function signInWithKakao() {
  if (!supabase) return { error: { message: "Supabase 미설정" } };
  return supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

// --- 사용자 자막 CRUD ---

/** 사용자의 편집 자막 가져오기 (없으면 null) */
export async function getUserSubtitles(videoId) {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_subtitles")
    .select("subtitles")
    .eq("user_id", user.id)
    .eq("video_id", videoId)
    .single();

  if (error || !data) return null;
  return data.subtitles;
}

/** 사용자 자막 저장 (upsert) */
export async function saveUserSubtitles(videoId, subtitles) {
  if (!supabase) return { error: { message: "Supabase 미설정" } };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "로그인 필요" } };

  const { error } = await supabase.from("user_subtitles").upsert(
    {
      user_id: user.id,
      video_id: videoId,
      subtitles,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,video_id" }
  );

  return { error };
}

// --- 저장한 표현 CRUD ---

/** 사용자의 저장 표현 전체 조회 */
export async function getSavedExpressions() {
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_expressions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

/** 표현 저장 (upsert — 같은 영상+단어면 업데이트) */
export async function addSavedExpression(videoId, expression) {
  if (!supabase) return { error: { message: "Supabase 미설정" } };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "로그인 필요" } };

  const { data, error } = await supabase
    .from("saved_expressions")
    .upsert(
      {
        user_id: user.id,
        video_id: videoId,
        word: expression.word,
        actual: expression.actual,
        meaning: expression.meaning,
        sentence: expression.sentence,
      },
      { onConflict: "user_id,video_id,word" }
    )
    .select()
    .single();

  return { data, error };
}

/** 표현 삭제 (UUID로) */
export async function removeSavedExpression(id) {
  if (!supabase) return { error: { message: "Supabase 미설정" } };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "로그인 필요" } };

  const { error } = await supabase
    .from("saved_expressions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error };
}

// --- 즐겨찾기 영상 CRUD ---

/** 사용자의 즐겨찾기 영상 ID 목록 조회 */
export async function getFavoriteVideos() {
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("favorite_videos")
    .select("video_id")
    .eq("user_id", user.id);

  if (error || !data) return [];
  return data.map((d) => d.video_id);
}

/** 즐겨찾기 추가 */
export async function addFavoriteVideo(videoId) {
  if (!supabase) return { error: { message: "Supabase 미설정" } };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "로그인 필요" } };

  const { error } = await supabase
    .from("favorite_videos")
    .upsert(
      { user_id: user.id, video_id: videoId },
      { onConflict: "user_id,video_id" }
    );

  return { error };
}

/** 즐겨찾기 해제 */
export async function removeFavoriteVideo(videoId) {
  if (!supabase) return { error: { message: "Supabase 미설정" } };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "로그인 필요" } };

  const { error } = await supabase
    .from("favorite_videos")
    .delete()
    .eq("user_id", user.id)
    .eq("video_id", videoId);

  return { error };
}

/** 사용자 자막 초기화 (기본 자막으로 되돌리기) */
export async function resetUserSubtitles(videoId) {
  if (!supabase) return { error: { message: "Supabase 미설정" } };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "로그인 필요" } };

  const { error } = await supabase
    .from("user_subtitles")
    .delete()
    .eq("user_id", user.id)
    .eq("video_id", videoId);

  return { error };
}
