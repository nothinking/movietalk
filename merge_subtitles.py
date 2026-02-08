#!/usr/bin/env python3
"""
자막 자동 합치기 스크립트
짧은 문장 단편을 앞 문장에 합쳐서 학습에 적합한 단위로 만듦.

합치기 기준:
1. 문장 단편: 앞 자막이 문장부호(. ! ?)로 끝나지 않으면 → 이어지는 문장이므로 합침
2. 짧은 독립 문장: 2단어 이하면서 앞 자막과 시간 간격이 1초 미만 → 합침
3. 아주 짧은 텍스트: 4글자 이하 → 무조건 앞 자막에 합침

합친 후:
- text: 앞 + " " + 뒤
- start: 앞의 start, end: 뒤의 end
- pronunciation/translation/notes: 삭제 (재생성 필요)
- index: 0부터 순차 재부여
"""

import json
import sys
import os
import re
import copy

VIDEOS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "videos")


def word_count(text):
    """단어 수 계산"""
    return len(text.split())


def ends_with_sentence_punct(text):
    """문장부호로 끝나는지 (. ! ? 계열)"""
    stripped = text.rstrip()
    if not stripped:
        return False
    # 한글 문장부호 포함
    return stripped[-1] in ".!?。！？"


def is_fragment(prev_text, curr_text):
    """현재 자막이 앞 자막의 이어짐인지 판단"""
    if not prev_text:
        return False

    # 앞 자막이 문장부호로 안 끝남 → 문장이 중간에 끊긴 것
    if not ends_with_sentence_punct(prev_text):
        return True

    # 현재 자막이 소문자로 시작 → 문장 중간
    curr_stripped = curr_text.lstrip()
    if curr_stripped and curr_stripped[0].islower():
        return True

    return False


def should_merge(prev_sub, curr_sub):
    """합쳐야 하는지 판단 — 짧은 자막만 대상"""
    if prev_sub is None:
        return False

    curr_text = curr_sub["text"].strip()
    prev_text = prev_sub["text"].strip()
    wc = word_count(curr_text)
    char_count = len(curr_text)

    # 긴 자막은 합치지 않음 (4단어 이상이면 독립적)
    if wc >= 4:
        return False

    # 규칙 1: 아주 짧은 텍스트 (4글자 이하, 예: "oh", "so", "big") → 합침
    if char_count <= 4:
        return True

    # 규칙 2: 3단어 이하 + 앞 자막이 문장부호 없이 끝남 → 문장 단편
    if wc <= 3 and not ends_with_sentence_punct(prev_text):
        return True

    # 규칙 3: 2단어 이하 + 시간 간격 0.5초 미만 → 빠르게 이어지는 발화
    if wc <= 2:
        gap = curr_sub["start"] - prev_sub["end"]
        if gap < 0.5:
            return True

    return False


def merge_subtitles(subtitles, video_id=""):
    """자막 합치기 실행"""
    if not subtitles:
        return subtitles, []

    merged = []
    merge_log = []

    i = 0
    while i < len(subtitles):
        current = copy.deepcopy(subtitles[i])

        # 다음 자막들을 하나씩 확인하면서 합칠 수 있으면 합침
        while i + 1 < len(subtitles):
            next_sub = subtitles[i + 1]

            if should_merge(current, next_sub):
                merge_log.append({
                    "merged_into": current["text"],
                    "merged_from": next_sub["text"],
                    "original_indices": [current.get("index", "?"), next_sub.get("index", "?")],
                })

                # 텍스트 합치기
                current["text"] = current["text"].rstrip() + " " + next_sub["text"].lstrip()
                # 타임프레임 확장
                current["end"] = next_sub["end"]
                # 발음/번역/노트 제거 (재생성 필요)
                for key in ["pronunciation", "translation", "notes"]:
                    if key in current:
                        del current[key]

                i += 1
            else:
                break

        merged.append(current)
        i += 1

    # index 재부여
    for idx, sub in enumerate(merged):
        sub["index"] = idx

    return merged, merge_log


def process_video(video_id, dry_run=True):
    """비디오 하나 처리"""
    filepath = os.path.join(VIDEOS_DIR, f"{video_id}.json")
    if not os.path.exists(filepath):
        print(f"  ❌ 파일 없음: {filepath}")
        return None

    with open(filepath, "r", encoding="utf-8") as f:
        subtitles = json.load(f)

    original_count = len(subtitles)
    merged, merge_log = merge_subtitles(subtitles, video_id)
    merged_count = len(merged)
    reduced = original_count - merged_count

    print(f"\n  📊 {video_id}")
    print(f"     원본: {original_count}개 → 합친 후: {merged_count}개 ({reduced}개 감소)")

    if merge_log:
        print(f"     합친 내역 ({len(merge_log)}건):")
        for log in merge_log:
            into = log["merged_into"][:40]
            frm = log["merged_from"][:30]
            idx = log["original_indices"]
            print(f"       [{idx[0]}]+[{idx[1]}] \"{into}...\" ← \"{frm}\"")

    if not dry_run and reduced > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
        print(f"     ✅ 저장 완료")

    return {
        "video_id": video_id,
        "original": original_count,
        "merged": merged_count,
        "reduced": reduced,
        "log": merge_log,
    }


def main():
    dry_run = "--apply" not in sys.argv
    target_id = None

    for arg in sys.argv[1:]:
        if arg != "--apply":
            target_id = arg

    if dry_run:
        print("🔍 DRY RUN 모드 (실제 저장하지 않음)")
        print("   실제 적용하려면: python merge_subtitles.py --apply")
    else:
        print("⚡ APPLY 모드 (실제 파일 수정)")

    # index.json 로드
    index_path = os.path.join(VIDEOS_DIR, "index.json")
    with open(index_path, "r", encoding="utf-8") as f:
        videos = json.load(f)

    results = []
    for video in videos:
        vid = video["id"]
        if target_id and vid != target_id:
            continue
        print(f"\n{'='*60}")
        print(f"영상: {video.get('title', vid)}")
        result = process_video(vid, dry_run=dry_run)
        if result:
            results.append(result)

    # 요약
    print(f"\n{'='*60}")
    print("📋 요약")
    total_reduced = sum(r["reduced"] for r in results)
    for r in results:
        status = f"-{r['reduced']}" if r["reduced"] > 0 else "변동없음"
        print(f"  {r['video_id']}: {r['original']} → {r['merged']} ({status})")
    print(f"  총 감소: {total_reduced}개")

    if dry_run and total_reduced > 0:
        print(f"\n💡 실제 적용하려면: python merge_subtitles.py --apply")


if __name__ == "__main__":
    main()
