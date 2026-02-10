#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MovieTalk - Claude Code를 이용한 발음 데이터 생성

API 키 없이 claude CLI(Claude Code)를 활용하여
자막의 한글 발음/번역/발음 포인트를 자동 생성합니다.

사용법:
    # 특정 영상의 발음 데이터 생성
    python gen_pronunciation.py VIDEO_ID

    # 발음 데이터 없는 모든 영상 처리
    python gen_pronunciation.py --all

    # 배치 크기 조절 (기본 24)
    python gen_pronunciation.py VIDEO_ID --batch-size 12
"""

import json
import argparse
import re
import subprocess
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).parent
VIDEOS_DIR = PROJECT_DIR / "public" / "videos"
INDEX_FILE = VIDEOS_DIR / "index.json"

PROMPT_TEMPLATE = """다음 영어 자막 각각에 대해 한글 발음 데이터를 생성해주세요.

## 규칙

### pronunciation (한글 발음)
- 반드시 100% 한글로만 작성 (영어 단어 금지)
- 원어민의 실제 빠른 발음을 반영 (gonna, wanna, gotta 등 축약)
- 모음 사이 t→ㄹ (water→워러), 연음, 약한 음절 축약 반영
- 각 INDEX의 TEXT에 대해서만 생성. 절대 인접한 줄과 합치지 마세요.

### translation (한국어 번역)
- 자연스러운 한국어로 번역

### notes (발음 포인트) — 가장 중요!
- 한국어 화자가 놓치기 쉬운 **어려운 발음 변화**만 포함 (0~2개)
- 단어 뜻 설명이 아니라 **발음이 왜 변하는지** 설명
- 없으면 빈 배열 []로 두세요. 억지로 채우지 마세요.

#### 좋은 notes 예시 (이런 것만 포함):
- {{"word": "got it", "actual": "가릿", "meaning": "t+모음 연음, t→ㄹ 플랩"}}
- {{"word": "want to", "actual": "워나", "meaning": "want to→wanna 축약"}}
- {{"word": "hold your", "actual": "홀쥬어", "meaning": "d+y 구개음화로 '쥬' 발음"}}
- {{"word": "an example", "actual": "어니그잼플", "meaning": "n+모음 연음"}}

#### 나쁜 notes 예시 (이런 건 절대 포함하지 마세요):
- {{"word": "can", "actual": "캔", "meaning": "~할 수 있다"}} ← 단순 번역
- {{"word": "the", "actual": "더", "meaning": "정관사"}} ← 너무 쉬움
- {{"word": "AI", "actual": "에이아이", "meaning": "인공지능"}} ← 약어 설명
- {{"word": "Uh", "actual": "어", "meaning": "필러 표현"}} ← 불필요

## 입력
{subtitle_text}

## 출력 형식 (JSON 배열만, 마크다운이나 설명 없이 순수 JSON만)
[
  {{
    "index": 숫자,
    "pronunciation": "한글 발음만",
    "translation": "한국어 번역",
    "notes": [{{"word": "영어 구문", "actual": "한글발음", "meaning": "발음 변화 설명"}}]
  }}
]"""


def run_claude(prompt: str) -> str:
    """claude CLI를 호출하여 응답을 받습니다."""
    try:
        result = subprocess.run(
            ['claude', '-p', prompt, '--output-format', 'json'],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            print(f"    ✗ claude 실행 실패: {result.stderr[:200]}")
            return None

        response = json.loads(result.stdout)
        return response.get('result', '')
    except subprocess.TimeoutExpired:
        print("    ✗ claude 응답 시간 초과 (120초)")
        return None
    except (json.JSONDecodeError, KeyError) as e:
        print(f"    ✗ claude 응답 파싱 실패: {e}")
        return None
    except FileNotFoundError:
        print("    ✗ claude CLI를 찾을 수 없습니다. Claude Code가 설치되어 있는지 확인하세요.")
        sys.exit(1)


def parse_json_response(text: str) -> list:
    """응답에서 JSON 배열을 추출합니다."""
    if not text:
        return []

    # ```json ... ``` 블록 추출
    code_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if code_match:
        text = code_match.group(1).strip()

    # JSON 배열 추출
    json_match = re.search(r'\[[\s\S]*\]', text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    return []


def validate_batch(batch_result: list, expected_indices: list) -> tuple:
    """배치 결과의 정렬과 품질을 검증합니다.
    Returns: (validated, fallback) - 검증 통과 목록, 영어 포함 fallback 목록"""
    if not batch_result:
        return [], []

    result_map = {item['index']: item for item in batch_result}
    validated = []
    fallback = []

    for idx in expected_indices:
        if idx in result_map:
            item = result_map[idx]
            if not item.get('pronunciation'):
                print(f"      ⚠ [{idx}] 발음 없음, 건너뜀")
                continue
            # 영어 문자가 pronunciation에 있는지 확인
            if re.search(r'[a-zA-Z]', item.get('pronunciation', '')):
                print(f"      ⚠ [{idx}] 발음에 영어 포함")
                fallback.append(item)
                continue
            validated.append(item)
        else:
            print(f"      ⚠ [{idx}] 결과 누락")

    return validated, fallback


def generate_for_video(video_id: str, batch_size: int = 24, retry: bool = True):
    """특정 영상의 발음 데이터를 생성합니다."""
    filepath = VIDEOS_DIR / f"{video_id}.json"
    if not filepath.exists():
        print(f"✗ {video_id}.json 파일이 없습니다.")
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        subtitles = json.load(f)

    # 이미 발음 데이터가 있는지 확인
    if subtitles and 'pronunciation' in subtitles[0]:
        print(f"  ℹ 이미 발음 데이터가 있습니다 ({len(subtitles)}개)")
        response = input("  덮어쓰시겠습니까? (y/N): ").strip().lower()
        if response != 'y':
            return False

    total = len(subtitles)
    total_batches = (total + batch_size - 1) // batch_size
    all_results = {}
    fallback_results = {}
    failed_indices = []

    print(f"  🔊 발음 데이터 생성 시작 ({total}개 자막, {total_batches}개 배치)")

    for batch_num in range(total_batches):
        start = batch_num * batch_size
        end = min(start + batch_size, total)
        batch = subtitles[start:end]
        expected_indices = [s['index'] for s in batch]

        print(f"  📦 배치 {batch_num + 1}/{total_batches} ({start + 1}-{end})...")

        # 프롬프트 생성: 각 자막을 INDEX=N TEXT="..." 형식으로
        subtitle_lines = []
        for s in batch:
            subtitle_lines.append(f'INDEX={s["index"]} TEXT="{s["text"]}"')
        subtitle_text = '\n'.join(subtitle_lines)

        prompt = PROMPT_TEMPLATE.format(subtitle_text=subtitle_text)
        response = run_claude(prompt)
        batch_result = parse_json_response(response)
        validated, fallback = validate_batch(batch_result, expected_indices)

        for item in validated:
            all_results[item['index']] = item
        for item in fallback:
            fallback_results[item['index']] = item

        success = len(validated)
        fail = len(expected_indices) - success
        if fail > 0:
            failed_indices.extend([i for i in expected_indices if i not in all_results])
        print(f"    ✓ {success}/{len(expected_indices)} 완료" + (f" ({fail}개 실패)" if fail else ""))

    # 실패한 항목 재시도 (개별 처리)
    if failed_indices and retry:
        print(f"\n  🔄 실패한 {len(failed_indices)}개 항목 재시도...")
        for idx in failed_indices:
            sub = next(s for s in subtitles if s['index'] == idx)
            prompt = PROMPT_TEMPLATE.format(
                subtitle_text=f'INDEX={sub["index"]} TEXT="{sub["text"]}"'
            )
            response = run_claude(prompt)
            result = parse_json_response(response)
            if result:
                validated, fb = validate_batch(result, [idx])
                if validated:
                    all_results[idx] = validated[0]
                    print(f"    ✓ [{idx}] 재시도 성공")
                    continue
                if fb:
                    fallback_results[idx] = fb[0]
            print(f"    ✗ [{idx}] 재시도 실패")

    # 재시도 후에도 실패한 항목은 fallback(영어 포함) 결과로 채움
    for idx, item in fallback_results.items():
        if idx not in all_results:
            all_results[idx] = item
            print(f"    ⚠ [{idx}] 발음에 영어 포함된 채로 저장")

    # 결과 병합
    merged_count = 0
    for s in subtitles:
        idx = s['index']
        if idx in all_results:
            r = all_results[idx]
            s['pronunciation'] = r['pronunciation']
            s['translation'] = r['translation']
            s['notes'] = r.get('notes', [])
            merged_count += 1

    if merged_count == 0:
        print(f"\n  ✗ 발음 데이터를 생성하지 못했습니다.")
        return False

    # 자막 시간 겹침 수정
    overlap_fixed = 0
    for i in range(len(subtitles) - 1):
        if subtitles[i]['end'] > subtitles[i + 1]['start']:
            subtitles[i]['end'] = subtitles[i + 1]['start']
            overlap_fixed += 1

    # 저장
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(subtitles, f, ensure_ascii=False, indent=2)

    # index.json 업데이트
    has_pronunciation = merged_count == total
    index = json.loads(INDEX_FILE.read_text(encoding='utf-8')) if INDEX_FILE.exists() else []
    for v in index:
        if v['id'] == video_id:
            v['hasPronunciation'] = has_pronunciation
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\n  ✅ 완료! {merged_count}/{total}개 발음 생성")
    if overlap_fixed:
        print(f"  🔧 자막 시간 겹침 {overlap_fixed}건 수정")
    if merged_count < total:
        missing = [s['index'] for s in subtitles if 'pronunciation' not in s]
        print(f"  ⚠ 누락된 인덱스: {missing}")

    return True


def main():
    parser = argparse.ArgumentParser(
        description='MovieTalk - Claude Code로 발음 데이터 생성 (API 키 불필요)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
예시:
  python gen_pronunciation.py mQ2e7Gzafuw          # 특정 영상
  python gen_pronunciation.py --all                 # 발음 없는 모든 영상
  python gen_pronunciation.py VIDEO_ID --batch-size 12  # 배치 크기 조절
  python gen_pronunciation.py VIDEO_ID --no-retry       # 재시도 없이 실행
        '''
    )

    parser.add_argument('video_id', nargs='?', help='영상 ID')
    parser.add_argument('--all', action='store_true', help='발음 데이터 없는 모든 영상 처리')
    parser.add_argument('--batch-size', type=int, default=24, help='배치 크기 (기본: 24)')
    parser.add_argument('--no-retry', action='store_true', help='실패 항목 재시도 안 함')

    args = parser.parse_args()

    # claude CLI 확인
    try:
        subprocess.run(['claude', '--version'], capture_output=True, timeout=5)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("✗ claude CLI를 찾을 수 없습니다.")
        print("  Claude Code 설치: https://docs.anthropic.com/en/docs/claude-code")
        sys.exit(1)

    if args.all:
        if not INDEX_FILE.exists():
            print("✗ index.json이 없습니다.")
            sys.exit(1)
        index = json.loads(INDEX_FILE.read_text(encoding='utf-8'))
        targets = [v for v in index if not v.get('hasPronunciation')]
        if not targets:
            print("✓ 모든 영상에 발음 데이터가 있습니다.")
            return
        print(f"🎬 발음 데이터 생성 대상: {len(targets)}개 영상\n")
        for v in targets:
            print(f"━━━ {v['title']} ({v['id']}) ━━━")
            generate_for_video(v['id'], args.batch_size, retry=not args.no_retry)
            print()
    elif args.video_id:
        print(f"🎬 발음 데이터 생성: {args.video_id}")
        generate_for_video(args.video_id, args.batch_size, retry=not args.no_retry)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
