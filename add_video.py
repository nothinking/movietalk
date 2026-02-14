#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MovieTalk - 새 영상 추가 스크립트

YouTube URL로 자막을 추출하고 발음 데이터를 생성하여
웹앱의 영상 목록에 추가합니다.

사용법:
    # 자막 추출만 (API key 없을 때)
    python add_video.py "https://www.youtube.com/watch?v=VIDEO_ID"
    python add_video.py "https://youtube.com/shorts/VIDEO_ID"

    # 자막 추출 + 발음 자동 생성 (API key 필요)
    ANTHROPIC_API_KEY=sk-... python add_video.py "https://www.youtube.com/watch?v=VIDEO_ID"

    # Claude Code CLI로 발음 생성 (API key 불필요)
    python add_video.py --use-claude-code "https://www.youtube.com/watch?v=VIDEO_ID"

    # 이미 추출된 자막에 발음 데이터 추가
    python add_video.py --generate-pronunciation VIDEO_ID

    # Claude Code로 기존 자막에 발음 추가
    python add_video.py --generate-pronunciation --use-claude-code VIDEO_ID
"""

import json
import argparse
import os
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

# 프로젝트 루트
PROJECT_DIR = Path(__file__).parent
PUBLIC_DIR = PROJECT_DIR / "public"
VIDEOS_DIR = PUBLIC_DIR / "videos"
INDEX_FILE = VIDEOS_DIR / "index.json"


def extract_video_id(url: str) -> str:
    """YouTube URL에서 비디오 ID를 추출합니다."""
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url):
        return url

    patterns = [
        r'(?:youtube\.com/(?:watch\?v=|shorts/|embed/)|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/watch\?.*v=([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    raise ValueError(f"유효하지 않은 YouTube URL: {url}")


def get_video_metadata(video_id: str) -> dict:
    """yt-dlp로 영상 메타데이터(제목, 채널명, 길이)를 가져옵니다."""
    for cmd_base in [['yt-dlp'], [sys.executable, '-m', 'yt_dlp']]:
        try:
            result = subprocess.run(
                cmd_base + [
                    '--dump-json',
                    '--skip-download',
                    f'https://www.youtube.com/watch?v={video_id}'
                ],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                info = json.loads(result.stdout)
                return {
                    'title': info.get('title', f'Video {video_id}'),
                    'channel': info.get('channel', info.get('uploader', 'Unknown')),
                    'duration': info.get('duration', 0),
                }
        except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
            continue

    # yt-dlp 없으면 기본값
    print("  ⚠ yt-dlp를 찾을 수 없어 메타데이터를 가져오지 못했습니다.")
    return {
        'title': f'Video {video_id}',
        'channel': 'Unknown',
        'duration': 0,
    }


def extract_subtitles(youtube_url: str, video_id: str, fix_sentences: bool = True) -> list:
    """기존 extract_subtitles.py를 활용하여 자막을 추출합니다."""
    sys.path.insert(0, str(PROJECT_DIR))
    from extract_subtitles import SubtitleExtractor

    extractor = SubtitleExtractor()
    subtitles = extractor.extract(youtube_url, fix_sentences=fix_sentences)

    if not subtitles:
        raise RuntimeError("자막 추출에 실패했습니다.")

    return subtitles


def generate_pronunciation(subtitles: list) -> list:
    """Anthropic API로 발음 데이터를 생성합니다."""
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return None

    try:
        import anthropic
    except ImportError:
        print("  ⚠ anthropic 패키지가 없습니다. pip install anthropic")
        return None

    print(f"  🔄 Claude API로 발음 데이터 생성 중... ({len(subtitles)}개)")

    client = anthropic.Anthropic(api_key=api_key)
    all_results = []

    # 5개씩 배치 처리
    batch_size = 5
    for i in range(0, len(subtitles), batch_size):
        batch = subtitles[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(subtitles) + batch_size - 1) // batch_size
        print(f"    배치 {batch_num}/{total_batches} 처리 중...")

        prompt = f"""다음 영어 자막들의 실제 발음을 한글로 표기해주세요.

규칙:
- 교과서 발음이 아닌 원어민의 실제 빠른 발음을 한글로 표기
- going to → 거나(gonna), want to → 워나(wanna), got to → 가라(gotta)
- 모음 사이의 t → ㄹ (water → 워러)
- d+y → 쥬, t+y → 추
- 자음+모음 연결 (연음)
- 약한 음절은 축약
- notes에는 2~4개의 발음 포인트를 포함

입력:
{json.dumps(batch, ensure_ascii=False, indent=2)}

출력 형식 (JSON 배열만, 마크다운 없이):
[
  {{
    "index": 숫자,
    "start": 숫자,
    "end": 숫자,
    "text": "영어 원문",
    "pronunciation": "한글 발음",
    "translation": "한국어 번역",
    "notes": [
      {{"word": "영어", "actual": "한글발음", "meaning": "설명"}}
    ]
  }}
]"""

        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}]
            )

            text = response.content[0].text
            # JSON 추출
            json_match = re.search(r'\[[\s\S]*\]', text)
            if json_match:
                batch_results = json.loads(json_match.group())
                all_results.extend(batch_results)
            else:
                print(f"    ⚠ 배치 {batch_num}: JSON 파싱 실패, 건너뜀")
        except Exception as e:
            print(f"    ⚠ 배치 {batch_num} 실패: {e}")

    if all_results:
        # index 재정렬
        for i, item in enumerate(all_results):
            item['index'] = i + 1
        return all_results
    return None


def load_index() -> list:
    """영상 목록 index.json을 로드합니다."""
    if INDEX_FILE.exists():
        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def save_index(index: list):
    """영상 목록 index.json을 저장합니다."""
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def save_video_data(video_id: str, data: list):
    """영상 자막 데이터를 저장합니다."""
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    filepath = VIDEOS_DIR / f"{video_id}.json"
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return filepath


def generate_pronunciation_claude_code(subtitles: list, video_id: str, retry: bool = True) -> list:
    """Claude Code CLI로 발음 데이터를 생성합니다 (API 키 불필요)."""
    try:
        subprocess.run(['claude', '--version'], capture_output=True, timeout=5)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("   ⚠ claude CLI를 찾을 수 없습니다.")
        return None

    # 자막 데이터를 임시 저장 후 gen_pronunciation.py 호출
    from gen_pronunciation import generate_for_video

    # 먼저 자막 파일을 임시 저장
    filepath = VIDEOS_DIR / f"{video_id}.json"
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(subtitles, f, ensure_ascii=False, indent=2)

    # gen_pronunciation 실행
    success = generate_for_video(video_id, batch_size=24, retry=retry)
    if not success:
        return None

    # 결과 읽기
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def add_video(youtube_url: str, skip_pronunciation: bool = False, use_claude_code: bool = False,
              retry: bool = True, fix_sentences: bool = True):
    """새 영상을 추가합니다."""
    video_id = extract_video_id(youtube_url)
    full_url = f"https://www.youtube.com/watch?v={video_id}"

    print(f"\n🎬 MovieTalk - 새 영상 추가")
    print(f"   Video ID: {video_id}")

    # 이미 존재하는지 확인
    index = load_index()
    existing = next((v for v in index if v['id'] == video_id), None)
    if existing:
        print(f"   ⚠ 이미 등록된 영상입니다: {existing['title']}")
        response = input("   덮어쓰시겠습니까? (y/N): ").strip().lower()
        if response != 'y':
            print("   취소되었습니다.")
            return

    # 1. 메타데이터 가져오기
    print(f"\n📋 Step 1: 영상 정보 가져오기...")
    metadata = get_video_metadata(video_id)
    print(f"   제목: {metadata['title']}")
    print(f"   채널: {metadata['channel']}")
    if metadata['duration']:
        mins = metadata['duration'] // 60
        secs = metadata['duration'] % 60
        print(f"   길이: {mins}:{secs:02d}")

    # 2. 자막 추출
    print(f"\n📝 Step 2: 자막 추출...")
    subtitles = extract_subtitles(full_url, video_id, fix_sentences=fix_sentences)
    print(f"   ✓ {len(subtitles)}개 자막 추출 완료")

    # 3. 발음 데이터 생성
    final_data = subtitles
    has_pronunciation = False

    if not skip_pronunciation:
        print(f"\n🔊 Step 3: 발음 데이터 생성...")
        if use_claude_code:
            pronunciation_data = generate_pronunciation_claude_code(subtitles, video_id, retry=retry)
        else:
            pronunciation_data = generate_pronunciation(subtitles)
        if pronunciation_data:
            final_data = pronunciation_data
            has_pronunciation = True
            print(f"   ✓ {len(pronunciation_data)}개 발음 데이터 생성 완료")
        else:
            if use_claude_code:
                print("   ⚠ Claude Code 발음 생성 실패, 자막만 저장합니다.")
            elif os.environ.get('ANTHROPIC_API_KEY'):
                print("   ⚠ 발음 생성 실패, 자막만 저장합니다.")
            else:
                print("   ℹ ANTHROPIC_API_KEY가 없어 자막만 저장합니다.")
                print("   ℹ 나중에 다음 명령으로 발음 데이터를 추가할 수 있습니다:")
                print(f"     python add_video.py --generate-pronunciation --use-claude-code {video_id}")
    else:
        print(f"\n⏭ Step 3: 발음 생성 건너뜀 (--skip-pronunciation)")

    # 4. 저장
    print(f"\n💾 Step 4: 저장...")
    filepath = save_video_data(video_id, final_data)
    print(f"   ✓ {filepath}")

    # 5. index.json 업데이트
    if existing:
        existing.update({
            'title': metadata['title'],
            'channel': metadata['channel'],
            'subtitleCount': len(final_data),
            'duration': metadata.get('duration', 0),
            'hasPronunciation': has_pronunciation,
            'addedAt': str(date.today()),
        })
    else:
        index.append({
            'id': video_id,
            'title': metadata['title'],
            'channel': metadata['channel'],
            'subtitleCount': len(final_data),
            'duration': metadata.get('duration', 0),
            'hasPronunciation': has_pronunciation,
            'addedAt': str(date.today()),
        })

    save_index(index)
    print(f"   ✓ index.json 업데이트 ({len(index)}개 영상)")

    # 완료
    print(f"\n✅ 완료!")
    print(f"   영상: {metadata['title']}")
    print(f"   자막: {len(final_data)}개")
    print(f"   발음: {'✓ 생성됨' if has_pronunciation else '✗ 없음 (자막만 저장)'}")
    print(f"   npm run dev 로 확인하세요.\n")


def generate_pronunciation_for_existing(video_id: str):
    """이미 추출된 자막에 발음 데이터를 추가합니다."""
    filepath = VIDEOS_DIR / f"{video_id}.json"
    if not filepath.exists():
        print(f"✗ {video_id}.json 파일이 없습니다.")
        sys.exit(1)

    with open(filepath, 'r', encoding='utf-8') as f:
        subtitles = json.load(f)

    # 이미 발음 데이터가 있는지 확인
    if subtitles and 'pronunciation' in subtitles[0]:
        print(f"ℹ 이미 발음 데이터가 있습니다 ({len(subtitles)}개).")
        response = input("덮어쓰시겠습니까? (y/N): ").strip().lower()
        if response != 'y':
            return

    print(f"🔊 {video_id}: 발음 데이터 생성 중...")
    result = generate_pronunciation(subtitles)
    if result:
        save_video_data(video_id, result)
        # index 업데이트
        index = load_index()
        for v in index:
            if v['id'] == video_id:
                v['hasPronunciation'] = True
                v['subtitleCount'] = len(result)
        save_index(index)
        print(f"✅ {len(result)}개 발음 데이터 저장 완료")
    else:
        print("✗ 발음 생성 실패")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='MovieTalk - YouTube 영상 추가 및 자막/발음 데이터 생성',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
예시:
  # 새 영상 추가 (자막 추출)
  python add_video.py "https://www.youtube.com/watch?v=VIDEO_ID"

  # Claude Code로 발음 데이터도 자동 생성 (API 키 불필요)
  python add_video.py --use-claude-code "https://www.youtube.com/watch?v=VIDEO_ID"

  # API key로 발음 데이터 자동 생성
  ANTHROPIC_API_KEY=sk-... python add_video.py "https://www.youtube.com/watch?v=VIDEO_ID"

  # 기존 자막에 Claude Code로 발음 추가
  python add_video.py --generate-pronunciation --use-claude-code VIDEO_ID

  # 자막만 추출 (발음 생성 건너뛰기)
  python add_video.py --skip-pronunciation "https://www.youtube.com/watch?v=VIDEO_ID"
        '''
    )

    parser.add_argument('url', help='YouTube URL 또는 비디오 ID')
    parser.add_argument('--skip-pronunciation', action='store_true',
                        help='발음 데이터 생성을 건너뜁니다')
    parser.add_argument('--generate-pronunciation', action='store_true',
                        help='기존 자막에 발음 데이터를 추가합니다')
    parser.add_argument('--use-claude-code', action='store_true',
                        help='Claude Code CLI로 발음 생성 (API 키 불필요)')
    parser.add_argument('--no-retry', action='store_true',
                        help='발음 생성 실패 시 재시도 안 함')
    parser.add_argument('--no-sentence-fix', action='store_true',
                        help='문장 단위 자막 보정을 건너뜁니다')

    args = parser.parse_args()

    if args.generate_pronunciation:
        if args.use_claude_code:
            from gen_pronunciation import generate_for_video
            print(f"🎬 Claude Code로 발음 데이터 생성: {args.url}")
            generate_for_video(args.url, retry=not args.no_retry)
        else:
            generate_pronunciation_for_existing(args.url)
    else:
        add_video(args.url, skip_pronunciation=args.skip_pronunciation,
                  use_claude_code=args.use_claude_code, retry=not args.no_retry,
                  fix_sentences=not args.no_sentence_fix)


if __name__ == '__main__':
    main()
