-- MovieTalk Supabase DB Schema
-- Supabase SQL Editor에서 실행하세요.

-- 1. 사용자 프로필 테이블
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 사용자별 자막 데이터 (사용자가 편집한 전체 자막 배열)
CREATE TABLE user_subtitles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  subtitles JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, video_id)
);

-- RLS 정책: 자기 데이터만 접근 가능
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE user_subtitles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subtitles" ON user_subtitles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subtitles" ON user_subtitles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subtitles" ON user_subtitles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subtitles" ON user_subtitles
  FOR DELETE USING (auth.uid() = user_id);

-- 3. 저장한 표현 (사용자별 발음 표현 저장)
CREATE TABLE saved_expressions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  word TEXT NOT NULL,
  actual TEXT,
  meaning TEXT,
  sentence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id, word)
);

ALTER TABLE saved_expressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own expressions" ON saved_expressions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expressions" ON saved_expressions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own expressions" ON saved_expressions
  FOR DELETE USING (auth.uid() = user_id);

-- 4. 즐겨찾기 영상 (별표)
CREATE TABLE favorite_videos (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, video_id)
);

ALTER TABLE favorite_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON favorite_videos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorite_videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorite_videos
  FOR DELETE USING (auth.uid() = user_id);

-- 신규 사용자 가입 시 프로필 자동 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
