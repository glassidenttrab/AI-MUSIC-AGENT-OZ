# 🎼 AI MUSIC AGENT OZ: 표준 음악 생성 워크플로우 (V4)

본 문서는 에이전트 [OZ]가 수행하는 자율 음악 생성 및 유튜브 채널 운영의 공식 프로세스를 정의합니다.

## 1. 단계별 생성 프로세스 (6-Steps)

### [Step 1] 트렌드 검색 및 테마 선정 (Market Discovery)
- **도구**: YouTube Search API, Google Trends, Ollama (Local LLM), **NotebookLM**
- **작업**:
    - 글로벌 인기 음악 키워드 및 시청 상황(Situation) 스캔.
    - **NotebookLM**을 활용하여 수집된 트렌드 데이터 및 관련 문서의 심층 분석 및 인사이트 도출.
    - 70:20:10 법칙(기존 히트:시장 트렌드:실험적 시도)에 따라 이번 사이클의 테마 결정.
    - 테마 선정 근거를 `memory/lessons_learned.json`에 기록.

### [Step 2] 정밀 프롬프트 설계 (Thematic Prompt Engineering)
- **도구**: `src/core/PromptEngineer.js`
- **작업**:
    - 선정된 테마를 바탕으로 기승전결이 포함된 다층(Multi-layered) 프롬프트 작성.
    - 째즈의 경우 'Slow Blue Note'와 'Fast Bebop'의 비율 조정.
    - 클래식의 경우 'Philharmonic Orchestra' 스타일의 엄격한 프롬프트 적용.

### [Step 3] 고품질 음원 생성 (Audio Generation)
- **도구**: Lyria 3 (Pro/Clip), `src/core/generate_lyria_music.py`
- **작업**:
    - 30초~1분 단위의 세그먼트 다수 생성.
    - FFmpeg `acrossfade` 필터를 사용하여 10초 이상의 긴 크로스페이드로 매끄럽게 병합.
    - 최종 3분(Masterpiece) 또는 1시간(Compilation) 음원 완성.

### [Step 4] 시네마틱 비주얼 생성 (Visual Asset Production)
- **도구**: Imagen 4.0, ComfyUI, `src/core/make_thumb.js`
- **작업**:
    - 음원의 무드와 100% 일치하는 8K 시네마틱 썸네일 및 배경 이미지 생성.
    - Imagen 4.0의 `high-quality` 분기를 우선적으로 사용하여 화질 극대화.
    - 모든 이미지는 `images/` 폴더에 테마명_타임스탬프로 저장.

### [Step 5] 프리미엄 영상 렌더링 (Video Rendering & Visualizer)
- **도구**: FFmpeg, `make_render_script.js`
- **작업**:
    - 생성된 이미지 위로 실시간 리듬 반응형 '오디오 이퀄라이저(Visualizer)' 오버레이.
    - 화이트 컬러의 세련된 라인 웨이브 및 고가시성 파형 적용.
    - 1920x1080 FHD 해상도, 고비트레이트(libx264, preset slow) 인코딩.

### [Step 6] SEO 최적화 유튜브 게시 (Automated Publishing)
- **도구**: YouTube Data API, `src/core/YouTubeUploader.js`
- **작업**:
    - 상황 중심의 스토리텔링 제목 및 타임스탬프가 포함된 설명란 자동 작성.
    - 타겟 시청층의 활동 골든 타임에 맞춰 예약 업로드 수행.
    - 업로드 완료 후 `upload_history.json` 갱신.

---

## 2. 운영 가이드라인

- **자율 사이클**: 12시간마다 (오전/오후) 자율적으로 구동됩니다.
- **오류 처리**: 실행 실패 시 3회까지 자동 재시도하며, 실패 원인을 분석하여 `memory/collaboration/requests.json`에 남기고 안티그래비티(Gemini)에 지원을 요청합니다.
- **품질 우선**: 단순히 양을 늘리기보다, 각 단계에서 최상의 퀄리티가 확보되었을 때만 최종 업로드를 진행합니다.
