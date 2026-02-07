#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MovieTalk 발음 생성 스크립트
추출된 자막에서 발음, 번역, 발음 해설을 생성합니다.

사용 방법:
    python generate_pronunciation.py subtitles.json -o movietalk_data.json

주요 기능:
- Claude API를 사용한 발음/번역 생성
- 배치 처리를 통한 효율적인 API 호출
- 영어 축약, 연음 등의 발음 특성 분석
- 구조화된 JSON 출력
"""

import json
import argparse
import logging
import sys
import os
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

# Anthropic 클라이언트 라이브러리
try:
    from anthropic import Anthropic
except ImportError:
    print("에러: anthropic 패키지가 설치되지 않았습니다.")
    print("설치: pip install anthropic")
    sys.exit(1)


# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('generate_pronunciation.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


class PronunciationGenerator:
    """Claude API를 사용하여 발음을 생성하는 클래스"""

    # Claude API 발음 생성 프롬프트
    PRONUNCIATION_PROMPT = """당신은 영어 발음을 한글로 표기하는 전문가입니다.

다음 영어 자막들에 대해 자연스러운 한글 발음, 번역, 그리고 발음 특성을 분석해주세요.

**지침:**
1. 한글 표기는 실제 영어 발음을 반영해야 합니다 (축약형, 연음, 탈락 포함)
2. 발음은 듣기에 자연스러운 영어 발음을 기반으로 합니다
3. 번역은 자연스러운 한국어 표현으로 제공합니다
4. 발음 특성은 축약(contraction), 연음(linking), 탈락(deletion) 등을 포함합니다

**예시:**
입력: "I'm gonna tell you something."
출력:
{{
  "pronunciation": "아임 거나 텔유 썸씽.",
  "translation": "너한테 뭔가 말해 줄 게 있어.",
  "notes": [
    {{"word": "I'm", "actual": "아임", "meaning": "I am의 축약형"}},
    {{"word": "gonna", "actual": "거나", "meaning": "going to의 축약형, 일상 회화의 자연스러운 발음"}},
    {{"word": "tell", "actual": "텔", "meaning": "t와 y 사이의 연음"}},
    {{"word": "something", "actual": "썸씽", "meaning": "t 발음이 약화되고 -ing의 g가 약하게 발음"}}
  ]
}}

**자막 텍스트들:**
{subtitles_text}

**요구사항:**
1. 각 자막마다 JSON 객체 하나씩 생성
2. 모든 응답은 유효한 JSON 배열 형식이어야 합니다
3. 각 객체는 "pronunciation", "translation", "notes" 필드를 포함해야 합니다
4. notes 배열의 각 항목은 "word", "actual", "meaning" 필드를 포함해야 합니다
5. 발음은 가능한 한 자연스럽고 실용적이어야 합니다

다음 자막들의 발음을 생성해주세요:
"""

    def __init__(self, api_key: Optional[str] = None):
        """
        초기화

        Args:
            api_key: Anthropic API 키 (기본값: ANTHROPIC_API_KEY 환경변수)
        """
        api_key = api_key or os.getenv('ANTHROPIC_API_KEY')

        if not api_key:
            logger.error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.")
            raise ValueError("API 키가 필요합니다. ANTHROPIC_API_KEY 환경변수를 설정하세요.")

        self.client = Anthropic(api_key=api_key)
        self.model = "claude-opus-4-6"
        self.batch_size = 5  # 한 번에 처리할 자막 개수

    def _load_subtitles(self, input_path: str) -> List[Dict]:
        """
        JSON 파일에서 자막을 로드합니다.

        Args:
            input_path: 입력 JSON 파일 경로

        Returns:
            자막 데이터 리스트
        """
        try:
            input_path = Path(input_path)

            if not input_path.exists():
                logger.error(f"파일을 찾을 수 없습니다: {input_path}")
                return []

            with open(input_path, 'r', encoding='utf-8') as f:
                subtitles = json.load(f)

            logger.info(f"{len(subtitles)}개의 자막을 로드했습니다.")
            return subtitles

        except json.JSONDecodeError as e:
            logger.error(f"JSON 파일 파싱 실패: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"파일 로드 중 오류 발생: {str(e)}")
            return []

    def _generate_pronunciation_batch(self, batch: List[Dict]) -> List[Dict]:
        """
        배치의 자막들에 대한 발음을 생성합니다.

        Args:
            batch: 자막 데이터 리스트

        Returns:
            발음이 추가된 자막 리스트
        """
        # 자막 텍스트 포맷팅
        subtitles_text = '\n'.join([
            f'{i+1}. "{item["text"]}"'
            for i, item in enumerate(batch)
        ])

        prompt = self.PRONUNCIATION_PROMPT.format(subtitles_text=subtitles_text)

        try:
            logger.info(f"Claude API 호출 중... ({len(batch)}개 자막)")

            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ]
            )

            response_text = response.content[0].text

            # 응답에서 JSON 추출
            try:
                # JSON 배열 부분 추출
                json_start = response_text.find('[')
                json_end = response_text.rfind(']') + 1

                if json_start != -1 and json_end > json_start:
                    json_str = response_text[json_start:json_end]
                    pronunciation_data = json.loads(json_str)
                else:
                    logger.error("응답에서 JSON 배열을 찾을 수 없습니다.")
                    return []

                # 원본 자막 데이터와 병합
                result = []
                for i, item in enumerate(batch):
                    if i < len(pronunciation_data):
                        merged = {
                            **item,
                            **pronunciation_data[i]
                        }
                        result.append(merged)
                    else:
                        logger.warning(f"자막 {i}에 대한 발음 데이터를 찾을 수 없습니다.")
                        result.append(item)

                logger.info(f"배치 처리 완료: {len(result)}개 자막")
                return result

            except json.JSONDecodeError as e:
                logger.error(f"JSON 파싱 실패: {str(e)}")
                logger.debug(f"응답 텍스트: {response_text[:500]}")
                return []

        except Exception as e:
            logger.error(f"API 호출 중 오류 발생: {str(e)}")
            return []

    def generate(self, input_path: str) -> List[Dict]:
        """
        자막 파일에서 발음을 생성합니다.

        Args:
            input_path: 입력 자막 JSON 파일 경로

        Returns:
            발음이 추가된 자막 리스트
        """
        # 자막 로드
        subtitles = self._load_subtitles(input_path)

        if not subtitles:
            logger.error("자막 로드에 실패했습니다.")
            return []

        # 배치 처리
        result = []
        total_batches = (len(subtitles) + self.batch_size - 1) // self.batch_size

        for i in range(0, len(subtitles), self.batch_size):
            batch_num = i // self.batch_size + 1
            batch = subtitles[i:i + self.batch_size]

            logger.info(f"배치 처리 중... ({batch_num}/{total_batches})")

            batch_result = self._generate_pronunciation_batch(batch)

            if batch_result:
                result.extend(batch_result)

            # API 속도 제한 대비
            if batch_num < total_batches:
                import time
                time.sleep(1)  # 배치 간 1초 대기

        logger.info(f"총 {len(result)}개의 자막 처리 완료")
        return result

    def save_to_json(self, data: List[Dict], output_path: str) -> bool:
        """
        처리된 자막을 JSON 파일로 저장합니다.

        Args:
            data: 처리된 자막 데이터
            output_path: 출력 파일 경로

        Returns:
            성공 여부
        """
        try:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            logger.info(f"발음 데이터가 저장되었습니다: {output_path}")
            return True

        except Exception as e:
            logger.error(f"JSON 저장 중 오류 발생: {str(e)}")
            return False


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description='자막 JSON에서 발음, 번역, 발음 특성을 생성합니다.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
예시:
  python generate_pronunciation.py subtitles.json -o movietalk_data.json
  python generate_pronunciation.py subtitles.json -o output/data.json -v

환경변수:
  ANTHROPIC_API_KEY: Anthropic API 키 (필수)
        '''
    )

    parser.add_argument(
        'input',
        help='입력 자막 JSON 파일 경로'
    )

    parser.add_argument(
        '-o', '--output',
        default='movietalk_data.json',
        help='출력 JSON 파일 경로 (기본값: movietalk_data.json)'
    )

    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='상세 로그 출력'
    )

    parser.add_argument(
        '-b', '--batch-size',
        type=int,
        default=5,
        help='한 번에 처리할 자막 개수 (기본값: 5)'
    )

    args = parser.parse_args()

    # 로그 레벨 설정
    if args.verbose:
        logger.setLevel(logging.DEBUG)

    # 배치 크기 검증
    if args.batch_size < 1 or args.batch_size > 20:
        logger.error("배치 크기는 1 이상 20 이하여야 합니다.")
        sys.exit(1)

    # 발음 생성기 초기화
    try:
        generator = PronunciationGenerator()
        generator.batch_size = args.batch_size
    except ValueError as e:
        logger.error(str(e))
        sys.exit(1)

    # 발음 생성
    data = generator.generate(args.input)

    if not data:
        logger.error("발음 생성에 실패했습니다.")
        sys.exit(1)

    # JSON 저장
    if generator.save_to_json(data, args.output):
        print(f"\n✓ 성공: {len(data)}개 자막의 발음이 생성되었습니다.")
        print(f"  저장 위치: {args.output}")
        sys.exit(0)
    else:
        print("\n✗ 실패: JSON 저장에 실패했습니다.")
        sys.exit(1)


if __name__ == '__main__':
    main()
