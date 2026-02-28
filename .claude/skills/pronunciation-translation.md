---
name: pronunciation-translation
description: 영어 자막 JSON에 한글발음(pronunciation)과 한글번역(translation)을 생성합니다. MovieTalk 프로젝트용.
---

# 영어 자막 → 한글발음 + 한글번역 생성

영어 자막 JSON 파일을 읽어서 각 자막에 한글 발음과 한국어 번역을 추가합니다.

## 입력 형식

`fetch_english_subs.py`로 추출한 영어 자막 JSON 배열:

```json
[
  {"index": 0, "start": 0.08, "end": 5.04, "text": "English subtitle text here."},
  {"index": 1, "start": 5.04, "end": 8.32, "text": "Another subtitle line."}
]
```

## 작업 절차 (토큰 초과 방지를 위한 배치 처리 필수)

**중요: 절대 전체 자막을 한번에 처리하지 마세요. 반드시 아래 배치 방식을 따르세요.**

1. 사용자가 지정한 JSON 파일을 읽는다
2. 자막을 **20개씩 배치**로 나눈다
3. **배치 하나씩 순서대로** 처리한다:
   a. 해당 배치의 자막에 대해 pronunciation, translation을 생성한다
   b. 생성 결과를 원본 배열에 병합한다
   c. **즉시 파일에 저장한다** (중간 저장으로 진행 상황 보존)
   d. 다음 배치로 진행한다
4. 모든 배치 완료 후 최종 확인

**배치 처리 시 주의사항:**
- 각 배치에서는 해당 배치의 `index` 목록과 `text`만 참조하여 결과를 생성
- 결과는 `[{"index": N, "pronunciation": "...", "translation": "..."}]` 형태로 생성 후 원본에 병합
- **한 번의 응답에서 전체 JSON 파일을 다시 쓰지 마세요** — Edit 도구로 개별 항목을 업데이트하거나, 배치 결과만 병합하여 저장

## 생성 규칙

### pronunciation (한글 발음)
- **반드시 100% 한글로만 작성** (영어 단어, 알파벳 절대 금지)
- 교과서 발음이 아닌 **원어민의 실제 빠른 발음**을 반영
- 축약 반영: going to → 거나(gonna), want to → 워나(wanna), got to → 가라(gotta)
- 모음 사이 t → ㄹ 플랩: water → 워러, better → 베러
- d+y → 쥬 (did you → 디쥬), t+y → 추 (got you → 갓추)
- 약한 음절 축약 반영
- **각 INDEX의 TEXT에 대해서만 생성. 절대 인접한 줄과 합치지 마세요.**

#### **[핵심] 단어 간 연음 (Linking) — 반드시 반영할 것**
영어는 단어와 단어 사이에서 소리가 이어지는 연음이 매우 빈번합니다. 한글 발음 표기 시 **단어 경계를 무시하고 실제 들리는 대로** 이어서 써야 합니다.

- **자음 + 모음 연결**: 앞 단어 끝 자음이 뒤 단어 첫 모음과 연결
  - got it → 가릿 (t+i 연음)
  - hold on → 홀돈 (d+o 연음)
  - pick it up → 피키럽 (k+i, t+u 연음)
  - an apple → 어내플 (n+a 연음)
  - turn it off → 터니로프 (n+i, t+o 연음)
- **자음 + 같은/유사 자음 연결**: 하나로 합쳐짐
  - want to → 워나 (t+t 탈락 후 축약)
  - last time → 래스타임 (t+t 하나로)
  - big game → 비겜 (g+g 하나로)
- **모음 + 모음 연결**: 사이에 /w/ 또는 /j/ 삽입
  - do it → 두윗 (o+i 사이 w 삽입)
  - go away → 고워웨이 (o+a 사이 w 삽입)
  - she is → 쉬이즈 (i+i 연결)
- **r/l + 모음 연결**: r/l이 뒤 모음과 강하게 연결
  - far away → 파러웨이 (r+a 연음)
  - call it → 콜릿 (l+i 연음)

### translation (한국어 번역)
- 자연스러운 한국어로 번역
- 직역보다 의역 선호 (자연스러움 우선)

## 출력 형식

원본 자막에 2개 필드를 추가한 JSON 배열:

```json
[
  {
    "index": 0,
    "start": 0.08,
    "end": 5.04,
    "text": "Shadowing can be one of the most powerful ways to improve your speaking.",
    "pronunciation": "쉐도잉 캔 비 원 어브 더 모스트 파워풀 웨이즈 투 임프루브 유어 스피킹",
    "translation": "섀도잉은 말하기를 향상시키는 가장 강력한 방법 중 하나입니다"
  }
]
```

## 사용 예시

```bash
# 1. 영어 자막 추출
python fetch_english_subs.py "https://www.youtube.com/watch?v=VIDEO_ID"

# 2. 이 skill을 사용하여 발음/번역 생성
#    Claude Code에서: public/videos/VIDEO_ID_en.json 파일을 읽고
#    pronunciation-translation skill로 처리해줘
```
