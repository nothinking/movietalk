#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
유튜브 영어 자막 추출 스크립트

YouTube URL에서 영어 자막만 추출하여 JSON으로 저장합니다.
기존 extract_subtitles.py의 SubtitleExtractor를 재사용합니다.

사용법:
    python fetch_english_subs.py "https://www.youtube.com/watch?v=VIDEO_ID"
    python fetch_english_subs.py VIDEO_ID -o my_subs.json
    python fetch_english_subs.py VIDEO_ID --raw          # 문장 보정 없이 원본
    python fetch_english_subs.py VIDEO_ID --stdout        # 파일 저장 없이 stdout 출력
"""

import argparse
import json
import re
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).parent
VIDEOS_DIR = PROJECT_DIR / "public" / "videos"

sys.path.insert(0, str(PROJECT_DIR))
from extract_subtitles import SubtitleExtractor


def extract_video_id(url: str) -> str:
    """YouTube URL 또는 video ID에서 ID를 추출합니다."""
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
    return None


def main():
    parser = argparse.ArgumentParser(
        description='유튜브 영어 자막을 추출하여 JSON으로 저장합니다.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
예시:
  python fetch_english_subs.py "https://www.youtube.com/watch?v=VIDEO_ID"
  python fetch_english_subs.py VIDEO_ID -o subs.json
  python fetch_english_subs.py VIDEO_ID --raw --stdout
        '''
    )
    parser.add_argument('url', help='YouTube URL 또는 비디오 ID')
    parser.add_argument('-o', '--output', default=None,
                        help='출력 파일 경로 (기본: public/videos/{video_id}_en.json)')
    parser.add_argument('--raw', action='store_true',
                        help='문장 단위 보정 없이 원본 자막 그대로 출력')
    parser.add_argument('--stdout', action='store_true',
                        help='파일 저장 없이 stdout으로 JSON 출력')
    parser.add_argument('--cookies-from-browser', default=None,
                        help='브라우저 쿠키 사용 (예: chrome)')

    args = parser.parse_args()

    video_id = extract_video_id(args.url)
    if not video_id:
        print(f"오류: 유효하지 않은 YouTube URL입니다: {args.url}", file=sys.stderr)
        sys.exit(1)

    youtube_url = f"https://www.youtube.com/watch?v={video_id}"

    extractor = SubtitleExtractor(cookies_from_browser=args.cookies_from_browser)
    subtitles = extractor.extract(youtube_url, fix_sentences=not args.raw)

    if not subtitles:
        print("오류: 자막 추출에 실패했습니다.", file=sys.stderr)
        sys.exit(1)

    # stdout 출력
    if args.stdout:
        print(json.dumps(subtitles, ensure_ascii=False, indent=2))
        return

    # 파일 저장
    output_path = args.output or str(VIDEOS_DIR / f"{video_id}_en.json")
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(subtitles, f, ensure_ascii=False, indent=2)

    print(f"완료: {len(subtitles)}개 영어 자막 → {output_path}")


if __name__ == '__main__':
    main()
