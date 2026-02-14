-- MovieTalk: videos 테이블 생성
-- Supabase SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,                    -- YouTube video ID
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  subtitle_count INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  has_pronunciation BOOLEAN DEFAULT false,
  subtitles JSONB NOT NULL DEFAULT '[]'::jsonb,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능
CREATE POLICY "videos_select_all" ON videos
  FOR SELECT USING (true);

-- 로그인 유저만 등록 가능
CREATE POLICY "videos_insert_auth" ON videos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 본인이 등록한 영상만 수정 가능
CREATE POLICY "videos_update_owner" ON videos
  FOR UPDATE USING (auth.uid() = added_by);

-- 본인이 등록한 영상만 삭제 가능
CREATE POLICY "videos_delete_owner" ON videos
  FOR DELETE USING (auth.uid() = added_by);
