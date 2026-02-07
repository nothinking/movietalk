#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MovieTalk 파이프라인 스크립트
유튜브 URL에서 자막 추출부터 발음 생성까지의 전체 워크플로우를 처리합니다.

사용 방법:
    python pipeline.py "https://www.youtube.com/watch?v=VIDEO_ID" -o movietalk_data.json
    python pipeline.py "URL" -o output.json --demo  # 데모 모드 (실제 추출 없음)

주요 기능:
- 자막 추출 (extract_subtitles.py)
- 발음 생성 (generate_pronunciation.py)
- 데모 모드 (하드코딩된 샘플 데이터로 테스트)
- 전체 워크플로우 오류 처리
"""

import json
import argparse
import logging
import sys
import os
from pathlib import Path
from typing import List, Dict, Optional
import tempfile
import shutil

from extract_subtitles import SubtitleExtractor
from generate_pronunciation import PronunciationGenerator


# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('pipeline.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


# 데모용 샘플 자막 데이터
DEMO_SUBTITLES = [
    {
        'index': 1,
        'start': 0.0,
        'end': 3.5,
        'text': "I'm gonna tell you something."
    },
    {
        'index': 2,
        'start': 3.5,
        'end': 7.0,
        'text': "You're gonna love this movie."
    },
    {
        'index': 3,
        'start': 7.0,
        'end': 10.5,
        'text': "It's got everything you need."
    },
    {
        'index': 4,
        'start': 10.5,
        'end': 14.0,
        'text': "I'd like to know what you think."
    },
    {
        'index': 5,
        'start': 14.0,
        'end': 17.5,
        'text': "They're waiting for us outside."
    }
]

# 데모용 예상 발음 데이터
DEMO_PRONUNCIATION = [
    {
        'pronunciation': '아임 거나 텔유 썸씽.',
        'translation': '너한테 뭔가 말해 줄 게 있어.',
        'notes': [
            {'word': "I'm", 'actual': '아임', 'meaning': "I am의 축약형"},
            {'word': 'gonna', 'actual': '거나', 'meaning': 'going to의 축약형'},
        ]
    },
    {
        'pronunciation': '유어 거나 러브 디스 무비.',
        'translation': '이 영화를 정말 좋아할 거야.',
        'notes': [
            {'word': "You're", 'actual': '유어', 'meaning': "You are의 축약형"},
            {'word': 'gonna', 'actual': '거나', 'meaning': 'going to의 축약형'},
        ]
    },
    {
        'pronunciation': '잇츠 갓 에브리싱 유 니드.',
        'translation': '필요한 것들이 모두 들어있어.',
        'notes': [
            {'word': "It's", 'actual': '잇츠', 'meaning': "It is의 축약형"},
            {'word': 'everything', 'actual': '에브리씽', 'meaning': 'th 발음과 연음'},
        ]
    },
    {
        'pronunciation': '아이드 라이크 투 노우 왓 유 씽크.',
        'translation': '너 생각이 뭔지 알고 싶어.',
        'notes': [
            {'word': "I'd", 'actual': '아이드', 'meaning': "I would의 축약형"},
            {'word': 'like', 'actual': '라이크', 'meaning': 'ai 이중모음'},
        ]
    },
    {
        'pronunciation': '데어 웨이팅 포러스 아웃사이드.',
        'translation': '그들이 밖에서 우리를 기다리고 있어.',
        'notes': [
            {'word': "They're", 'actual': '데어', 'meaning': "They are의 축약형"},
            {'word': 'waiting', 'actual': '웨이팅', 'meaning': 'ing의 약화 발음'},
        ]
    }
]


class MovieTalkPipeline:
    """자막 추출부터 발음 생성까지의 전체 파이프라인"""

    def __init__(self, cookies_from_browser: str = None, cookies_file: str = None):
        """
        초기화

        Args:
            cookies_from_browser: 쿠키를 가져올 브라우저 이름
            cookies_file: 쿠키 파일 경로
        """
        self.temp_dir = None
        self.subtitles_data = []
        self.cookies_from_browser = cookies_from_browser
        self.cookies_file = cookies_file

    def _create_temp_dir(self) -> str:
        """
        임시 디렉토리를 생성합니다.

        Returns:
            임시 디렉토리 경로
        """
        self.temp_dir = tempfile.mkdtemp(prefix='movietalk_')
        logger.info(f"임시 디렉토리 생성: {self.temp_dir}")
        return self.temp_dir

    def _cleanup_temp_dir(self) -> None:
        """임시 디렉토리를 정리합니다."""
        if self.temp_dir and Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)
            logger.info("임시 디렉토리 정리 완료")

    def _extract_subtitles(self, youtube_url: str) -> bool:
        """
        자막을 추출합니다.

        Args:
            youtube_url: 유튜브 URL

        Returns:
            성공 여부
        """
        try:
            logger.info("=" * 50)
            logger.info("단계 1: 자막 추출")
            logger.info("=" * 50)

            extractor = SubtitleExtractor(
                cookies_from_browser=self.cookies_from_browser,
                cookies_file=self.cookies_file
            )
            self.subtitles_data = extractor.extract(youtube_url)

            if not self.subtitles_data:
                logger.error("자막 추출에 실패했습니다.")
                return False

            logger.info(f"✓ 자막 추출 성공: {len(self.subtitles_data)}개")
            return True

        except Exception as e:
            logger.error(f"자막 추출 중 오류: {str(e)}")
            return False

    def _generate_pronunciation(self) -> List[Dict]:
        """
        발음을 생성합니다.

        Returns:
            발음이 추가된 자막 리스트
        """
        try:
            logger.info("=" * 50)
            logger.info("단계 2: 발음 생성")
            logger.info("=" * 50)

            # 임시 파일에 자막 저장
            temp_subtitles_path = Path(self.temp_dir) / 'temp_subtitles.json'

            with open(temp_subtitles_path, 'w', encoding='utf-8') as f:
                json.dump(self.subtitles_data, f, ensure_ascii=False, indent=2)

            logger.info(f"임시 자막 파일 생성: {temp_subtitles_path}")

            # 발음 생성
            generator = PronunciationGenerator()

            result = generator.generate(str(temp_subtitles_path))

            if not result:
                logger.error("발음 생성에 실패했습니다.")
                return []

            logger.info(f"✓ 발음 생성 성공: {len(result)}개")
            return result

        except Exception as e:
            logger.error(f"발음 생성 중 오류: {str(e)}")
            return []

    def _generate_demo_data(self) -> List[Dict]:
        """
        데모 모드로 샘플 데이터를 생성합니다.

        Returns:
            발음이 추가된 자막 리스트
        """
        logger.info("=" * 50)
        logger.info("데모 모드: 샘플 데이터 사용")
        logger.info("=" * 50)

        result = []

        for i, subtitle in enumerate(DEMO_SUBTITLES):
            if i < len(DEMO_PRONUNCIATION):
                merged = {
                    **subtitle,
                    **DEMO_PRONUNCIATION[i]
                }
                result.append(merged)
            else:
                result.append(subtitle)

        logger.info(f"✓ 샘플 데이터 생성: {len(result)}개")
        return result

    def run(self, youtube_url: str, output_path: str, demo_mode: bool = False) -> bool:
        """
        파이프라인을 실행합니다.

        Args:
            youtube_url: 유튜브 URL (데모 모드에서는 무시됨)
            output_path: 출력 파일 경로
            demo_mode: 데모 모드 여부

        Returns:
            성공 여부
        """
        try:
            # 임시 디렉토리 생성
            self._create_temp_dir()

            logger.info("MovieTalk 파이프라인 시작")
            logger.info(f"출력 경로: {output_path}")

            # 단계 1: 자막 추출
            if demo_mode:
                logger.info("=" * 50)
                logger.info("데모 모드: 자막 추출 스킵")
                logger.info("=" * 50)
                self.subtitles_data = DEMO_SUBTITLES
            else:
                if not self._extract_subtitles(youtube_url):
                    logger.error("파이프라인 실패: 자막 추출 단계에서 오류")
                    return False

            # 단계 2: 발음 생성
            if demo_mode:
                result = self._generate_demo_data()
            else:
                result = self._generate_pronunciation()

            if not result:
                logger.error("파이프라인 실패: 발음 생성 단계에서 오류")
                return False

            # 단계 3: 결과 저장
            logger.info("=" * 50)
            logger.info("단계 3: 결과 저장")
            logger.info("=" * 50)

            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            logger.info(f"✓ 최종 결과 저장: {output_path}")
            logger.info("=" * 50)
            logger.info("파이프라인 완료!")
            logger.info("=" * 50)

            return True

        except Exception as e:
            logger.error(f"파이프라인 실행 중 오류: {str(e)}")
            return False

        finally:
            # 임시 디렉토리 정리
            self._cleanup_temp_dir()


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description='유튜브 영상에서 자막을 추출하고 발음을 생성하는 전체 파이프라인',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
예시:
  # Chrome 쿠키 사용 (추천)
  python pipeline.py "https://www.youtube.com/watch?v=VIDEO_ID" -o data.json --cookies-from-browser chrome

  # 쿠키 없이 실행 (일부 영상에서 실패할 수 있음)
  python pipeline.py "https://www.youtube.com/watch?v=VIDEO_ID" -o data.json

  # 데모 모드 (샘플 데이터로 테스트, API 비용 없음)
  python pipeline.py "URL" -o output.json --demo

  # 상세 로그 출력
  python pipeline.py "URL" -o output.json --cookies-from-browser chrome -v

환경변수:
  ANTHROPIC_API_KEY: Anthropic API 키 (발음 생성 시 필수)

주의사항:
  - 데모 모드 (-m, --demo)를 사용하면 실제 자막 추출을 건너뜁니다
  - API 호출 비용이 발생합니다 (Anthropic Claude API 사용)
        '''
    )

    parser.add_argument(
        'url',
        help='유튜브 영상 URL (데모 모드에서는 무시됨)'
    )

    parser.add_argument(
        '-o', '--output',
        default='movietalk_data.json',
        help='출력 JSON 파일 경로 (기본값: movietalk_data.json)'
    )

    parser.add_argument(
        '-m', '--demo',
        action='store_true',
        help='데모 모드: 샘플 데이터로 테스트 (자막 추출 스킵)'
    )

    parser.add_argument(
        '--cookies-from-browser', default=None,
        help='쿠키를 가져올 브라우저 (chrome, firefox, safari, edge) — PO 토큰 문제 해결'
    )

    parser.add_argument(
        '--cookies', default=None,
        help='쿠키 파일 경로 (Netscape 형식)'
    )

    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='상세 로그 출력'
    )

    args = parser.parse_args()

    # 로그 레벨 설정
    if args.verbose:
        logger.setLevel(logging.DEBUG)

    # 파이프라인 실행
    pipeline = MovieTalkPipeline(
        cookies_from_browser=args.cookies_from_browser,
        cookies_file=args.cookies
    )

    if pipeline.run(args.url, args.output, demo_mode=args.demo):
        print(f"\n✓ 완료: 결과가 저장되었습니다.")
        print(f"  위치: {args.output}")
        sys.exit(0)
    else:
        print(f"\n✗ 실패: 파이프라인 실행 중 오류가 발생했습니다.")
        print(f"  로그 파일을 확인하세요: pipeline.log")
        sys.exit(1)


if __name__ == '__main__':
    main()
