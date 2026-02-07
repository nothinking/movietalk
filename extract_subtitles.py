#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MovieTalk 자막 추출 스크립트
유튜브 영상에서 자막을 추출하여 JSON 형식으로 저장합니다.

사용 방법:
    python extract_subtitles.py "https://www.youtube.com/watch?v=VIDEO_ID" -o subtitles.json

주요 기능:
- youtube-transcript-api를 사용한 자막 추출 (1차 시도)
- yt-dlp CLI를 사용한 자막 추출 (2차 폴백)
- 한글, 영어 자막 자동 감지
- 자동 생성 자막 지원
- 구조화된 JSON 출력
"""

import json
import argparse
import logging
import os
import re
import subprocess
import sys
import tempfile
import glob
from pathlib import Path
from typing import List, Dict, Optional

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('extract_subtitles.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


class SubtitleExtractor:
    """유튜브 영상에서 자막을 추출하는 클래스"""

    def __init__(self, cookies_from_browser: str = None, cookies_file: str = None):
        self.subtitles_data = []
        self.cookies_from_browser = cookies_from_browser
        self.cookies_file = cookies_file

    @staticmethod
    def _extract_video_id(url: str) -> Optional[str]:
        """YouTube URL에서 비디오 ID를 추출합니다."""
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com/watch\?.*v=([a-zA-Z0-9_-]{11})',
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        # 이미 비디오 ID인 경우
        if re.match(r'^[a-zA-Z0-9_-]{11}$', url):
            return url

        return None

    @staticmethod
    def _validate_youtube_url(url: str) -> bool:
        """유튜브 URL 유효성을 검사합니다."""
        youtube_patterns = [
            r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=[\w-]{11}',
            r'(?:https?://)?youtu\.be/[\w-]{11}',
        ]
        for pattern in youtube_patterns:
            if re.match(pattern, url):
                return True
        return False

    def _try_youtube_transcript_api(self, video_id: str) -> Optional[List[Dict]]:
        """
        방법 1: youtube-transcript-api 사용 (가장 안정적)
        v1.x (인스턴스 기반) 과 v0.x (클래스 메서드 기반) 모두 지원.
        """
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
        except ImportError:
            logger.warning("youtube-transcript-api가 설치되지 않았습니다.")
            logger.warning("설치: pip install youtube-transcript-api")
            return None

        try:
            logger.info("방법 1: youtube-transcript-api로 자막 추출 시도...")

            # v1.x (인스턴스 기반) vs v0.x (클래스 메서드 기반) 분기
            is_v1 = not hasattr(YouTubeTranscriptApi, 'list_transcripts')

            if is_v1:
                return self._transcript_api_v1(YouTubeTranscriptApi, video_id)
            else:
                return self._transcript_api_v0(YouTubeTranscriptApi, video_id)

        except Exception as e:
            logger.warning(f"youtube-transcript-api 실패: {e}")
            return None

    def _transcript_api_v1(self, ApiClass, video_id: str) -> Optional[List[Dict]]:
        """youtube-transcript-api v1.x (인스턴스 기반 API)"""
        logger.info("  API 버전: v1.x (인스턴스 기반)")
        api = ApiClass()

        # 자막 목록 조회
        try:
            transcript_list = api.list(video_id)
            logger.info(f"  사용 가능한 자막: {[t.language_code for t in transcript_list]}")
        except Exception as e:
            logger.warning(f"  자막 목록 조회 실패: {e}")
            # 목록 실패 시 직접 fetch 시도
            return self._transcript_api_v1_direct_fetch(api, video_id)

        # 우선순위에 따라 자막 선택
        selected = None
        for t in transcript_list:
            if t.language_code.startswith('en') and not t.is_generated:
                selected = t
                logger.info(f"  선택: 수동 영어 ({t.language_code})")
                break

        if not selected:
            for t in transcript_list:
                if t.language_code == 'ko' and not t.is_generated:
                    selected = t
                    logger.info(f"  선택: 수동 한국어")
                    break

        if not selected:
            for t in transcript_list:
                if t.language_code.startswith('en') and t.is_generated:
                    selected = t
                    logger.info(f"  선택: 자동 생성 영어 ({t.language_code})")
                    break

        if not selected:
            for t in transcript_list:
                if t.language_code == 'ko' and t.is_generated:
                    selected = t
                    logger.info(f"  선택: 자동 생성 한국어")
                    break

        if not selected:
            # 아무 자막이나 선택
            for t in transcript_list:
                selected = t
                logger.info(f"  선택: {t.language_code} (기타)")
                break

        if not selected:
            logger.warning("  적절한 자막을 찾지 못했습니다.")
            return None

        # 자막 fetch
        raw_data = selected.fetch()
        return self._parse_transcript_snippets(raw_data)

    def _transcript_api_v1_direct_fetch(self, api, video_id: str) -> Optional[List[Dict]]:
        """목록 조회 실패 시 직접 fetch 시도 (v1.x)"""
        for langs in [['en'], ['en-US'], ['ko']]:
            try:
                logger.info(f"  직접 fetch 시도: {langs}")
                raw_data = api.fetch(video_id, languages=langs)
                return self._parse_transcript_snippets(raw_data)
            except Exception:
                continue

        # 언어 지정 없이 기본 자막 시도
        try:
            logger.info("  기본 자막 fetch 시도...")
            raw_data = api.fetch(video_id)
            return self._parse_transcript_snippets(raw_data)
        except Exception as e:
            logger.warning(f"  직접 fetch 실패: {e}")
            return None

    def _transcript_api_v0(self, ApiClass, video_id: str) -> Optional[List[Dict]]:
        """youtube-transcript-api v0.x (클래스 메서드 기반 API)"""
        logger.info("  API 버전: v0.x (클래스 메서드 기반)")

        try:
            transcript_list = ApiClass.list_transcripts(video_id)
        except Exception as e:
            logger.warning(f"  자막 목록 조회 실패: {e}")
            return None

        transcript = None
        for find_fn, desc in [
            (lambda: transcript_list.find_manually_created_transcript(['en', 'en-US']), "수동 영어"),
            (lambda: transcript_list.find_manually_created_transcript(['ko']), "수동 한국어"),
            (lambda: transcript_list.find_generated_transcript(['en', 'en-US']), "자동 영어"),
            (lambda: transcript_list.find_generated_transcript(['ko']), "자동 한국어"),
        ]:
            try:
                transcript = find_fn()
                logger.info(f"  선택: {desc} ({transcript.language})")
                break
            except Exception:
                continue

        if not transcript:
            return None

        raw_data = transcript.fetch()
        return self._parse_transcript_entries(raw_data)

    def _parse_transcript_snippets(self, raw_data) -> List[Dict]:
        """v1.x FetchedTranscriptSnippet 객체 리스트를 파싱합니다."""
        subtitles = []
        index = 1
        for entry in raw_data:
            # v1.x: 속성 접근 (entry.text, entry.start, entry.duration)
            # 또는 dict-like 접근 지원
            if hasattr(entry, 'text'):
                text = str(entry.text).strip()
                start = float(entry.start)
                duration = float(entry.duration)
            else:
                text = str(entry.get('text', '')).strip()
                start = float(entry.get('start', 0))
                duration = float(entry.get('duration', 0))

            text = re.sub(r'\[.*?\]', '', text).strip()
            if text:
                subtitles.append({
                    'index': index,
                    'start': round(start, 2),
                    'end': round(start + duration, 2),
                    'text': text
                })
                index += 1

        logger.info(f"  자막 추출 완료: {len(subtitles)}개")
        return subtitles if subtitles else None

    def _parse_transcript_entries(self, raw_data) -> List[Dict]:
        """v0.x dict 리스트를 파싱합니다."""
        subtitles = []
        for i, entry in enumerate(raw_data, 1):
            text = entry.get('text', '').strip()
            text = re.sub(r'\[.*?\]', '', text).strip()
            if text:
                subtitles.append({
                    'index': i,
                    'start': round(entry['start'], 2),
                    'end': round(entry['start'] + entry['duration'], 2),
                    'text': text
                })
        logger.info(f"  자막 추출 완료: {len(subtitles)}개")
        return subtitles if subtitles else None

    def _try_ytdlp_cli(self, youtube_url: str) -> Optional[List[Dict]]:
        """
        방법 2: yt-dlp CLI를 subprocess로 호출 (Python API보다 안정적)
        """
        temp_dir = tempfile.mkdtemp(prefix='movietalk_subs_')

        try:
            logger.info("방법 2: yt-dlp CLI로 자막 추출 시도...")

            # yt-dlp 실행 가능 여부 확인 (CLI 또는 python -m)
            ytdlp_cmd = None
            for candidate in [
                ['yt-dlp'],
                [sys.executable, '-m', 'yt_dlp'],
            ]:
                try:
                    subprocess.run(candidate + ['--version'], capture_output=True, check=True, timeout=10)
                    ytdlp_cmd = candidate
                    logger.info(f"  yt-dlp 발견: {' '.join(candidate)}")
                    break
                except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
                    continue

            if not ytdlp_cmd:
                logger.warning("yt-dlp를 찾을 수 없습니다. (CLI 및 python -m 모두 실패)")
                return None

            # 여러 조합으로 시도
            attempts = [
                ("자동+수동 영어 자막", ['--write-auto-sub', '--write-sub', '--sub-lang', 'en']),
                ("자동 영어 자막", ['--write-auto-sub', '--sub-lang', 'en']),
                ("수동 영어 자막", ['--write-sub', '--sub-lang', 'en']),
                ("자동+수동 한국어 자막", ['--write-auto-sub', '--write-sub', '--sub-lang', 'ko']),
            ]

            for desc, extra_opts in attempts:
                cmd = ytdlp_cmd + [
                    '--skip-download',
                    '--sub-format', 'vtt/srt/best',
                    '-o', os.path.join(temp_dir, '%(id)s'),
                ] + extra_opts

                # 쿠키 옵션 추가
                if self.cookies_from_browser:
                    cmd += ['--cookies-from-browser', self.cookies_from_browser]
                elif self.cookies_file:
                    cmd += ['--cookies', self.cookies_file]

                cmd.append(youtube_url)

                logger.info(f"  시도: {desc}")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

                # 다운로드된 자막 파일 확인
                sub_files = (
                    glob.glob(os.path.join(temp_dir, '*.vtt')) +
                    glob.glob(os.path.join(temp_dir, '*.srt'))
                )

                if sub_files:
                    logger.info(f"  성공! 파일: {sub_files[0]}")
                    return self._parse_subtitle_file(sub_files[0])

                # 다음 시도를 위해 temp_dir 비우기
                for f in glob.glob(os.path.join(temp_dir, '*')):
                    os.remove(f)

            logger.warning("yt-dlp CLI: 모든 시도 실패")
            return None

        except subprocess.TimeoutExpired:
            logger.warning("yt-dlp CLI: 타임아웃")
            return None
        except Exception as e:
            logger.warning(f"yt-dlp CLI 실패: {e}")
            return None
        finally:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _parse_subtitle_file(self, filepath: str) -> List[Dict]:
        """자막 파일을 파싱합니다."""
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        if filepath.endswith('.vtt'):
            return self._parse_vtt_content(content)
        else:
            return self._parse_srt_content(content)

    def _parse_timestamp(self, timestamp_str: str) -> float:
        """자막 타임스탬프를 초 단위로 변환합니다."""
        timestamp_str = timestamp_str.replace(',', '.')
        try:
            parts = timestamp_str.split(':')
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = float(parts[2])
            return round(hours * 3600 + minutes * 60 + seconds, 2)
        except (ValueError, IndexError):
            logger.warning(f"타임스탬프 파싱 실패: {timestamp_str}")
            return 0.0

    def _parse_srt_content(self, content: str) -> List[Dict]:
        """SRT 형식 파싱"""
        subtitles = []
        pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})\n([\s\S]*?)(?=\n\n|\Z)'
        for match in re.finditer(pattern, content):
            index, start, end, text = match.groups()
            text = re.sub(r'<[^>]+>', '', text)
            text = ' '.join(text.split())
            if text.strip():
                subtitles.append({
                    'index': int(index),
                    'start': self._parse_timestamp(start),
                    'end': self._parse_timestamp(end),
                    'text': text.strip()
                })
        return subtitles

    def _parse_vtt_content(self, content: str) -> List[Dict]:
        """VTT 형식 파싱"""
        subtitles = []
        if 'WEBVTT' in content:
            parts = content.split('\n\n', 1)
            content = parts[1] if len(parts) > 1 else content.replace('WEBVTT', '')

        pattern = r'(?:\d+\n)?(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})(?:[^\n]*)?\n([\s\S]*?)(?=\n\n|\Z)'
        index = 1
        for match in re.finditer(pattern, content.strip()):
            start, end, text = match.groups()
            text = re.sub(r'<[^>]+>', '', text)
            text = ' '.join(text.split())
            if text.strip():
                subtitles.append({
                    'index': index,
                    'start': self._parse_timestamp(start),
                    'end': self._parse_timestamp(end),
                    'text': text.strip()
                })
                index += 1
        return subtitles

    def _merge_duplicate_subtitles(self, subtitles: List[Dict]) -> List[Dict]:
        """연속으로 같은 텍스트인 자막을 병합합니다."""
        if not subtitles:
            return subtitles
        merged = []
        prev = None
        for sub in subtitles:
            if prev and sub['text'] == prev['text']:
                prev['end'] = sub['end']
            else:
                if prev:
                    merged.append(prev)
                prev = sub.copy()
        if prev:
            merged.append(prev)
        for i, sub in enumerate(merged, 1):
            sub['index'] = i
        return merged

    def extract(self, youtube_url: str) -> List[Dict]:
        """
        유튜브 영상에서 자막을 추출합니다.
        3가지 방법을 순서대로 시도:
        1. youtube-transcript-api (가장 안정적)
        2. yt-dlp CLI (subprocess)
        """
        if not self._validate_youtube_url(youtube_url):
            logger.error("유효하지 않은 유튜브 URL입니다.")
            return []

        video_id = self._extract_video_id(youtube_url)
        if not video_id:
            logger.error("비디오 ID를 추출할 수 없습니다.")
            return []

        logger.info(f"비디오 ID: {video_id}")

        # 방법 1: youtube-transcript-api
        result = self._try_youtube_transcript_api(video_id)

        # 방법 2: yt-dlp CLI
        if not result:
            result = self._try_ytdlp_cli(youtube_url)

        if not result:
            logger.error(
                "모든 자막 추출 방법이 실패했습니다.\n"
                "  확인사항:\n"
                "  1. pip install youtube-transcript-api 실행\n"
                "  2. 해당 영상에 자막이 있는지 YouTube에서 직접 확인\n"
                "  3. --cookies-from-browser chrome 옵션 사용"
            )
            return []

        # 중복 병합
        original = len(result)
        self.subtitles_data = self._merge_duplicate_subtitles(result)
        if original != len(self.subtitles_data):
            logger.info(f"중복 병합: {original} → {len(self.subtitles_data)}개")

        logger.info(f"최종 자막: {len(self.subtitles_data)}개")
        return self.subtitles_data

    def save_to_json(self, output_path: str) -> bool:
        """추출된 자막을 JSON 파일로 저장합니다."""
        try:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(self.subtitles_data, f, ensure_ascii=False, indent=2)
            logger.info(f"저장 완료: {output_path}")
            return True
        except Exception as e:
            logger.error(f"저장 실패: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(
        description='유튜브 영상에서 자막을 추출하여 JSON으로 저장합니다.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
예시:
  python extract_subtitles.py "https://www.youtube.com/watch?v=VIDEO_ID" -o subtitles.json
  python extract_subtitles.py "URL" -o subtitles.json --cookies-from-browser chrome
        '''
    )
    parser.add_argument('url', help='유튜브 영상 URL')
    parser.add_argument('-o', '--output', default='subtitles.json')
    parser.add_argument('--cookies-from-browser', default=None)
    parser.add_argument('--cookies', default=None)
    parser.add_argument('-v', '--verbose', action='store_true')

    args = parser.parse_args()
    if args.verbose:
        logger.setLevel(logging.DEBUG)

    extractor = SubtitleExtractor(
        cookies_from_browser=args.cookies_from_browser,
        cookies_file=args.cookies
    )
    subtitles = extractor.extract(args.url)

    if not subtitles:
        sys.exit(1)

    if extractor.save_to_json(args.output):
        print(f"\n✓ 성공: {len(subtitles)}개의 자막이 저장되었습니다.")
        print(f"  저장 위치: {args.output}")
    else:
        print("\n✗ 실패: 저장에 실패했습니다.")
        sys.exit(1)


if __name__ == '__main__':
    main()
