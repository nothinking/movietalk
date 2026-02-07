# MovieTalk - 영어 발음 학습 앱 프로젝트 현황

> 작성일: 2026-02-07 | 버전: v0.2.0

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

영어를 20년 공부했지만 여전히 영화/드라마의 대사가 안 들리는 한국인 학습자


## 현재 상태 (v0.2.0)

### 구현 완료

- Vite + React 18 기반 로컬 개발 환경
- **다중 영상 지원** — 영상 목록 화면에서 선택하여 학습
- YouTube IFrame API 연동 (동적 영상 로드)
- **실시간 한글 발음 자막** — 재생 중 영상 하단에 항상 표시 (영어 원문 + 한글 발음 + 한국어 해석, 100ms 간격 시간 동기화)
- 일시정지 시 **상세 학습 패널** — 발음 포인트(축약/연음/탈락) 상세 설명
- **문장 반복 재생** — 반복 듣기 버튼 또는 R 키로 현재 문장 루프 (토글)
- **발음/해석 편집** — 웹앱에서 직접 수정 가능 (Vite dev server PUT API)
- **키보드 단축키** — ←→ 문장 이동, Space 재생/일시정지, R 반복, Cmd+S 저장, Cmd+E 편집, Enter 저장
- **퍼머링크** — URL 해시 (#v=videoId&s=subtitleIndex), 재생 중 자동 업데이트, 공유 가능
- **모바일 문장 컨트롤 바** — 이전/재생/반복(토글)/다음 버튼
- 표현 저장 기능
- 재생 속도 조절 (0.5x ~ 1.5x)
- 문장 목록 타임라인 (클릭 시 해당 구간 이동, 퍼머링크 복사 버튼)
- 자막 영역 고정 높이 (100px, 레이아웃 안정화)
- **`add_video.py` CLI 파이프라인** — YouTube URL로 자막 추출 + 발음 데이터 자동 생성
- **2개 영상, 555개 자막** 전체 발음 데이터 생성 완료

### 등록된 영상

| # | 영상 | 채널 | 자막 수 | 길이 |
|---|---|---|---|---|
| 1 | How to Shadow Efficiently & Practice English Speaking | Accent's Way English with Hadar | 156 | 15:55 |
| 2 | How I Practice English by Myself | Rodica - The Foreign Sun | 399 | 13:05 |

### 아직 미구현

- 섀도잉 모드 (구간 반복 + 녹음 + 비교)
- 간격 반복 학습 (Spaced Repetition)
- 발음 연습/녹음
- Whisper 기반 실제 음성 분석


## 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | React 18 + Vite 6 |
| 영상 재생 | YouTube IFrame API |
| 자막 추출 | youtube-transcript-api v1.x + yt-dlp fallback |
| 발음 생성 | Claude API (anthropic SDK) |
| 데이터 | JSON 정적 파일 (영상별 분리) |


## 프로젝트 구조

```
movietalk/
├── src/
│   ├── App.jsx                 # React 앱 (~1,600줄)
│   │   ├── MovieEnglishApp     # 메인 컴포넌트 (라우팅, 상태관리)
│   │   ├── VideoListScreen     # 영상 목록 화면
│   │   └── PlayerScreen        # 영상 재생 + 자막 학습 화면
│   └── main.jsx                # React 엔트리포인트
├── public/
│   └── videos/
│       ├── index.json          # 영상 목록 메타데이터
│       ├── Th40eifXjf8.json    # 영상 1: 156개 자막+발음 (115KB)
│       └── 1IaFHFSvqoQ.json    # 영상 2: 399개 자막+발음 (287KB)
├── index.html                  # HTML 엔트리포인트
├── package.json                # npm 의존성 (React 18, Vite 6)
├── vite.config.js              # Vite 설정 (port 3000, 발음편집 API)
├── add_video.py                # 새 영상 추가 CLI 스크립트
├── extract_subtitles.py        # YouTube 자막 추출 모듈 (517줄)
├── detail.md                   # 프로젝트 기획 문서
└── MovieTalk_프로젝트_현황.md    # 이 파일
```


## 앱 동작 흐름

```
앱 시작
  ├→ /videos/index.json 로드 (영상 목록)
  └→ 영상 목록 화면 표시 (VideoListScreen)
       ├→ 영상별 YouTube 썸네일, 제목, 채널명, 자막 수, 발음 유무 배지
       └→ 영상 클릭 시 → /videos/{id}.json 로드 → PlayerScreen 전환

재생 중 (PlayerScreen)
  ├→ YouTube IFrame API로 영상 재생
  ├→ 100ms 간격 시간 폴링
  ├→ 현재 시간에 해당하는 자막 매칭
  └→ 영상 아래 실시간 표시: 영어원문 + 한글발음 + 해석

일시정지 시
  ├→ 현재 자막의 상세 학습 패널 표시
  │   ├→ Original (영어 원문)
  │   ├→ 실제 발음 (한글)
  │   ├→ 해석 (한국어)
  │   └→ 발음 포인트 (축약/연음/탈락 설명)
  ├→ "반복 듣기" / "계속 재생" 버튼
  └→ 발음 포인트 클릭 → 표현 저장 가능

영상 목록으로 돌아가기
  └→ ← 버튼 클릭 → VideoListScreen 복귀
```


## 새 영상 추가 파이프라인

```bash
# 기본 사용 (자막 추출만)
python add_video.py "https://www.youtube.com/watch?v=VIDEO_ID"

# 발음 데이터도 자동 생성
ANTHROPIC_API_KEY=sk-... python add_video.py "https://www.youtube.com/watch?v=VIDEO_ID"

# 기존 자막에 발음 추가
ANTHROPIC_API_KEY=sk-... python add_video.py --generate-pronunciation VIDEO_ID
```

**처리 단계:**

```
python add_video.py "YouTube URL"
  ├→ Step 1: yt-dlp로 영상 메타데이터(제목, 채널명, 길이) 가져오기
  ├→ Step 2: youtube-transcript-api로 자막 추출 (yt-dlp fallback)
  ├→ Step 3: Claude API로 발음 데이터 생성 (ANTHROPIC_API_KEY 있을 때)
  ├→ Step 4: public/videos/{videoId}.json 저장
  └→ Step 5: public/videos/index.json 영상 목록 업데이트
```


## 다음 단계 (TODO)

1. **섀도잉 모드** — 구간 반복 + 녹음 + 비교
2. **간격 반복 학습** — 저장한 표현을 주기적으로 복습
3. **Whisper 통합** — 실제 음성 분석으로 발음 정밀도 향상
4. **발음 드릴** — R/L, F/P, V/B, TH/D 최소 대립쌍 훈련
