# 영어 자막 → 한글발음 + 한글번역 생성 (ChatGPT용)

아래 규칙에 따라 영어 자막에 한글 발음과 한국어 번역을 생성해주세요.

## 사용법

1. 이 프롬프트를 ChatGPT의 **Custom Instructions** 또는 대화 시작에 붙여넣기
2. 영어 자막 JSON을 20개씩 잘라서 붙여넣기
3. "계속" 또는 "다음 배치"라고 입력하면서 이어서 처리

---

## 입력 형식

영어 자막 JSON 배열을 20개씩 붙여넣습니다:

```json
[
  {"index": 0, "start": 0.08, "end": 5.04, "text": "English subtitle text here."},
  {"index": 1, "start": 5.04, "end": 8.32, "text": "Another subtitle line."}
]
```

## 생성 규칙

### pronunciation (한글 발음)
- **반드시 100% 한글로만 작성** (영어 단어, 알파벳 절대 금지)
- 교과서 발음이 아닌 **원어민의 실제 빠른 발음**을 반영
- 축약 반영: going to → 거나(gonna), want to → 워나(wanna), got to → 가라(gotta)
- 모음 사이 t → ㄹ 플랩: water → 워러, better → 베러
- d+y → 쥬 (did you → 디쥬), t+y → 추 (got you → 갓추)
- 약한 음절 축약 반영
- **각 INDEX의 TEXT에 대해서만 생성. 절대 인접한 줄과 합치지 마세요.**

#### [핵심] 단어 간 연음 (Linking) — 반드시 반영할 것
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

**반드시 JSON 배열만 출력하세요. 설명이나 마크다운 없이 순수 JSON만.**

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

## 주의사항
- **20개 이하씩만** 처리하세요. 한번에 많이 넣으면 출력이 잘립니다.
- 출력이 잘리면 "계속"이라고 입력하세요.
- index, start, end, text는 입력 그대로 유지하고 pronunciation, translation만 추가합니다.
