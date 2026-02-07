# MovieTalk - 영어 발음 학습 앱

## 프로젝트 개요

MovieTalk은 **YouTube 영상을 활용한 영어 발음 학습 앱**입니다. 영상 재생 중 실시간으로 한글 발음 자막을 표시하여, 원어민이 실제로 말하는 방식(축약, 연음, 탈락 등)을 한국어 화자가 직관적으로 이해할 수 있도록 돕습니다.

### 핵심 컨셉

영어 교과서 발음이 아닌 **실제 발음**을 한글로 표기합니다.

| 영어 텍스트 | 교과서 발음 | 실제 발음 (MovieTalk) | 설명 |
|---|---|---|---|
| going to | 고잉 투 | 거나 | gonna 축약 |
| want to | 원트 투 | 워나 | wanna 축약 |
| What are you | 왓 아 유 | 와러유 | 빠른 연음 |
| don't know | 돈트 노 | 도노 | dunno 축약 |
| Get out of | 겟 아웃 오브 | 게라우러 | t 탈락 + 연음 체인 |

### 타겟 사용자

영어를 20년 공부했지만 여전히 영화/드라마의 대사가 안 들리는 한국인 학습자 (40대 이상 포함)


## 현재 상태 (v0.1.0)

### 구현 완료

- Vite + React 18 기반 로컬 개발 환경
- YouTube IFrame API 연동 (고정 영상: `Th40eifXjf8`)
- **실시간 한글 발음 자막** — 재생 중 영상 하단에 항상 표시
  - 영어 원문 + 한글 발음 + 한국어 해석 동시 표시
  - 100ms 간격 시간 동기화
- 일시정지 시 **상세 학습 패널** — 발음 포인트(축약/연음/탈락) 상세 설명
- 표현 저장 기능
- 재생 속도 조절 (0.5x ~ 1.5x)
- 문장 목록 타임라인 (클릭 시 해당 구간 이동)
- **156개 자막 전체** 발음 데이터 생성 완료 (약 16분 분량)

### 아직 미구현

- 다른 YouTube 영상 지원 (현재 1개 영상 고정)
- 자막 자동 추출 + Claude API 발음 생성 파이프라인 (스크립트는 존재)
- 섀도잉 모드
- 간격 반복 학습
- 발음 연습/녹음


## 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | React 18 + Vite 6 |
| 영상 재생 | YouTube IFrame API |
| 자막 추출 | youtube-transcript-api (Python) |
| 발음 생성 | Claude API (anthropic SDK) |
| 데이터 | JSON (정적 파일) |


## 프로젝트 구조

```
movietalk/
├── src/
│   ├── App.jsx            # 메인 앱 컴포넌트 (984줄)
│   └── main.jsx           # React 엔트리포인트
├── public/
│   └── data.json          # 156개 자막 발음 데이터 (160KB)
├── index.html             # HTML 엔트리포인트
├── package.json           # Vite + React 의존성
├── vite.config.js         # Vite 설정 (port 3000)
├── data.json              # 발음 데이터 원본
├── subtitles.json         # 원본 자막 156개 (추출 결과)
├── extract_subtitles.py   # YouTube 자막 추출 스크립트
├── generate_pronunciation.py  # Claude API 발음 생성 스크립트
├── pipeline.py            # 통합 파이프라인
├── requirements.txt       # Python 의존성
└── detail.md              # 프로젝트 기획 문서
```


## 로컬 실행 방법

```bash
cd movietalk
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 자동 오픈. YouTube 영상이 자동 로드되며, 재생하면 실시간 한글 발음 자막이 표시됩니다.


## 데이터 구조

`data.json`의 각 자막 항목:

```json
{
  "index": 1,
  "start": 0.08,
  "end": 5.04,
  "text": "Shadowing can be one of the most powerful ways to improve your speaking.",
  "pronunciation": "쉐도잉 캔 비 원 어브 더 모스트 파워풀 웨이즈 투 임프루브 유어 스피킹.",
  "translation": "섀도잉은 당신의 말하기를 향상시키는 가장 강력한 방법 중 하나입니다.",
  "notes": [
    {
      "word": "can be",
      "actual": "캔 비",
      "meaning": "약하게 발음되어 '큰비'처럼 들림"
    },
    {
      "word": "one of the",
      "actual": "원 어브 더",
      "meaning": "of the가 연음되어 '어브더'로 이어짐"
    }
  ]
}
```


## 자막 추출 파이프라인 (참고)

아직 앱에 통합되지 않았지만, 새 영상의 자막을 처리하는 Python 파이프라인이 준비되어 있습니다.

```bash
# Python 의존성 설치
pip install -r requirements.txt

# 자막 추출만
python extract_subtitles.py https://www.youtube.com/watch?v=VIDEO_ID

# 전체 파이프라인 (추출 + 발음 생성)
# ANTHROPIC_API_KEY 환경변수 필요
python pipeline.py https://www.youtube.com/watch?v=VIDEO_ID --output result.json
```

`extract_subtitles.py`는 `youtube-transcript-api` v1.x를 기본 사용하고, 실패 시 `yt-dlp` CLI를 fallback으로 활용합니다.


## 앱 동작 흐름

```
앱 시작
  ├→ data.json 자동 로드 (156개 자막)
  ├→ YouTube IFrame API 초기화
  └→ 영상 자동 로드 (Th40eifXjf8)

재생 중
  ├→ 100ms 간격 시간 폴링
  ├→ 현재 시간에 해당하는 자막 매칭
  └→ 영상 아래 실시간 표시: 영어원문 + 한글발음 + 해석

일시정지 시
  ├→ 현재 자막의 상세 학습 패널 표시
  │   ├→ Original (영어 원문)
  │   ├→ 실제 발음 (한글)
  │   ├→ 해석 (한국어)
  │   └→ 발음 포인트 (축약/연음/탈락 설명)
  ├→ "이 문장 다시 듣기" / "계속 재생" 버튼
  └→ 발음 포인트 클릭 → 표현 저장 가능
```


## 다음 단계 (TODO)

1. **다중 영상 지원** — URL 입력 or 영상 목록에서 선택
2. **파이프라인 통합** — 새 영상 URL 입력 시 자동으로 자막 추출 + 발음 생성
3. **섀도잉 모드** — 구간 반복 + 녹음 + 비교
4. **간격 반복** — 저장한 표현을 주기적으로 복습
5. **모바일 대응** — 반응형 UI 개선
