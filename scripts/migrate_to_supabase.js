/**
 * 마이그레이션 스크립트: public/videos/ JSON → Supabase videos 테이블
 *
 * 사용법:
 *   node --env-file=.env.local scripts/migrate_to_supabase.js
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const videosDir = resolve(__dirname, "../public/videos");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// service_role key 우선, 없으면 anon key 사용
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ VITE_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY(또는 VITE_SUPABASE_ANON_KEY) 환경변수를 설정하세요.");
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY가 없어 anon key를 사용합니다. RLS로 인해 실패할 수 있습니다.\n");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  // 1. index.json 읽기
  const indexPath = resolve(videosDir, "index.json");
  const videoList = JSON.parse(readFileSync(indexPath, "utf-8"));
  console.log(`📋 ${videoList.length}개 영상 발견\n`);

  let success = 0;
  let failed = 0;

  for (const video of videoList) {
    try {
      // 2. 개별 자막 JSON 읽기
      const subtitlePath = resolve(videosDir, `${video.id}.json`);
      const subtitles = JSON.parse(readFileSync(subtitlePath, "utf-8"));

      // 3. Supabase에 upsert
      const { error } = await supabase.from("videos").upsert({
        id: video.id,
        title: video.title,
        channel: video.channel,
        subtitle_count: video.subtitleCount || subtitles.length,
        duration: video.duration || 0,
        has_pronunciation: video.hasPronunciation || false,
        subtitles: subtitles,
        added_at: video.addedAt ? new Date(video.addedAt).toISOString() : new Date().toISOString(),
        // added_by는 null (마이그레이션 데이터이므로)
      });

      if (error) throw error;

      console.log(`✅ ${video.id} — ${video.title}`);
      success++;
    } catch (err) {
      console.error(`❌ ${video.id} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🏁 완료: 성공 ${success}, 실패 ${failed}`);
}

migrate();
