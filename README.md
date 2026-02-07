# MovieTalk - YouTube 영어 발음 학습 앱

YouTube 영상을 보면서 **실시간 한글 발음 자막**으로 영어 듣기를 학습하는 React 웹앱입니다.

원어민이 실제로 말하는 방식(축약, 연음, 탈락)을 한글로 보여주어, 교과서 발음과 실제 발음의 차이를 직관적으로 이해할 수 있습니다.

## 핵심 기능

- **실시간 한글 발음 자막** — 재생 중 영어 원문 + 한글 발음 + 한국어 해석을 동시 표시
- **상세 학습 패널** — 일시정지 시 발음 포인트(축약/연음/탈락) 상세 설명
- **문장 반복 재생** — 반복 듣기 버튼 또는 R 키로 현재 문장 루프 (토글)
- **발음/해석 편집** — 웹앱에서 직접 수정 가능 (Cmd+E 편집, Cmd+S 저장)
- **키보드 단축키** — ←→ 문장 이동, Space 재생/일시정지, R 반복, Cmd+E 편집, Cmd+S 저장
- **모바일 컨트롤** — 이전/재생/반복/다음 문장 버튼 (터치 조작)
- **퍼머링크** — URL 해시로 특정 영상의 특정 문장 공유 가능
- **다중 영상 지원** — 영상 목록에서 선택하여 학습 (현재 2개 영상, 555개 자막)
- **새 영상 추가 파이프라인** — YouTube URL로 자막 추출 + 발음 데이터 자동 생성
- 표현 저장, 재생 속도 조절 (0.5x~1.5x), 문장 타임라인 클릭 이동

## 빠른 시작

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:3000`이 자동으로 열립니다. 영상 목록에서 원하는 영상을 선택하면 실시간 한글 발음 자막과 함께 학습할 수 있습니다.

## 새 영상 추가

```bash
# 자막 추출만 (API key 없이)
python add_video.py "https://www.youtube.com/watch?v=VIDEO_ID"

# 자막 추출 + 발음 데이터 자동 생성
ANTHROPIC_API_KEY=sk-... python add_video.py "https://www.youtube.com/watch?v=VIDEO_ID"

# 이미 추출된 자막에 발음 데이터 추가
ANTHROPIC_API_KEY=sk-... python add_video.py --generate-pronunciation VIDEO_ID

# 발음 생성 건너뛰기
python add_video.py --skip-pronunciation "https://www.youtube.com/watch?v=VIDEO_ID"
```

`add_video.py`가 자동으로 처리하는 작업:

1. YouTube에서 영상 메타데이터(제목, 채널명, 길이) 가져오기
2. 자막 추출 (`youtube-transcript-api` 우선, `yt-dlp` fallback)
3. Claude API로 한글 발음 + 번역 + 발음 포인트 생성 (API key 있을 때)
4. `public/videos/{videoId}.json` 저장
5. `public/videos/index.json` 영상 목록 업데이트

## 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | React 18 + Vite 6 |
| 영상 재생 | YouTube IFrame API |
| 자막 추출 | youtube-transcript-api (Python) + yt-dlp fallback |
| 발음 생성 | Claude API (anthropic SDK) |
| 데이터 | JSON 정적 파일 (영상별 분리) |

## 프로젝트 구조

```
movietalk/
├── src/
│   ├── App.jsx                 # React 앱 (~1,600줄, VideoListScreen + PlayerScreen)
│   └── main.jsx                # React 엔트리포인트
├── public/
│   └── videos/
│       ├── index.json          # 영상 목록 메타데이터
│       ├── Th40eifXjf8.json    # 영상 1: 156개 자막+발음
│       └── 1IaFHFSvqoQ.json    # 영상 2: 399개 자막+발음
├── index.html                  # HTML 엔트리포인트
├── package.json                # npm 의존성
├── vite.config.js              # Vite 설정 (port 3000, 발음편집 API)
├── add_video.py                # 새 영상 추가 CLI
├── extract_subtitles.py        # YouTube 자막 추출 모듈
├── detail.md                   # 프로젝트 기획 문서
└── MovieTalk_프로젝트_현황.md    # 프로젝트 현황 보고서
```

## 데이터 형식

### `public/videos/index.json` — 영상 목록

```json
[
  {
    "id": "Th40eifXjf8",
    "title": "How to Shadow Efficiently & Practice English Speaking",
    "channel": "Accent's Way English with Hadar",
    "subtitleCount": 156,
    "duration": 955,
    "hasPronunciation": true,
    "addedAt": "2026-02-07"
  }
]
```

### `public/videos/{videoId}.json` — 자막 데이터 (발음 포함)

```json
{
  "index": 1,
  "start": 0.08,
  "end": 5.04,
  "text": "Shadowing can be one of the most powerful ways to improve your speaking.",
  "pronunciation": "쉐도잉 캔 비 원 어브 더 모스트 파워풀 웨이즈 투 임프루브 유어 스피킹.",
  "translation": "섀도잉은 당신의 말하기를 향상시키는 가장 강력한 방법 중 하나입니다.",
  "notes": [
    { "word": "can be", "actual": "캔 비", "meaning": "약하게 발음되어 '큰비'처럼 들림" },
    { "word": "one of the", "actual": "원 어브 더", "meaning": "of the가 연음되어 '어브더'로 이어짐" }
  ]
}
```

## 현재 등록된 영상

| # | 영상 | 채널 | 자막 수 | 길이 |
|---|---|---|---|---|
| 1 | How to Shadow Efficiently & Practice English Speaking | Accent's Way English with Hadar | 156 | 15:55 |
| 2 | How I Practice English by Myself | Rodica - The Foreign Sun | 399 | 13:05 |

## Python 의존성 (영상 추가 시 필요)

```bash
pip install youtube-transcript-api yt-dlp anthropic
```

## 라이선스

MIT License
