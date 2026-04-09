---
name: oz_strategy_v4
description: AI Music Agent OZ의 4세대 음악 및 ASMR 콘텐츠 제작 전략 지침서
---

# 🎼 AI MUSIC AGENT OZ - 전략 V4 지침서

이 지침서는 OZ 에이전트가 유튜브 채널 성장을 극대화하기 위해 따라야 할 핵심 콘텐츠 제작 및 운영 전략을 정의합니다.

## 1. 핵심 카테고리 및 테마 (3대 주력 방향)
| 카테고리 | 서브 테마 | 음악적 특성 | 주요 키워드 |
| :--- | :--- | :--- | :--- |
| **Category 1: OZ CAFE (Jazz)** | 1960's Prime Jazz (Slow/Fast) | Prime Acoustic Jazz | Blue Note era, Smoky, Miles Davis, Bebop |
| **Category 2: Classical Grand** | Classical Performance (Orchestra) | Grand Symphony Orchestra | Majestic, Grand, Piano & Strings, 8k |
| **Category 3: Nature Sanctuary** | 절의 빗소리, 파도, 장작불 | ASMR + Ambient | Deep Sleep, Meditation, Zen, Healing |
| **Category 4: Euro Synth Night** | 밤의 드라이브, 사이버펑크 | Modern Euro Synthwave | Energetic, Driving, Retro-future |

## 2. 영상 구조 및 시각화 전략 (Equalizer & Visuals)

### [A] 동적 리듬 이퀄라이저 (Visualizer)
- **전략:** 정적인 풍경 위로 음악의 리듬과 볼륨에 실시간으로 반응하는 **'오디오 이퀄라이저/파형'**을 오버레이함.
- **구축:** FFmpeg의 `avectorscope` 또는 `showwaves` 필터를 사용하여 세련된 화이트 라인으로 구현.
- **이유:** 시청자의 청각적 자극을 시각화하여 몰입감을 증대시키고, 비디오의 단조로움을 완벽히 해결.


### [B] 1시간 컴필레이션 (OZ CAFE, Classical, Euro Synth)
- **구조:** **컴필레이션(Compilation/Mix) 방식** 적용.
- **규칙:** 10~15개의 서로 다른 트랙을 배치하되, 째즈는 **슬로우(Slow Blue Note)**와 **패스트(Fast Bebop)**를 번갈아 배치하여 완급 조절.
- **비주얼:** 테마별 고해상도 AI 배경(Imagen 4.0 사용) 3장 이상 로테이션 + 실시간 이퀄라이저 오버레이.

## 3. 유튜브 운영 및 SEO 가이드라인 (Imagen 4.0 적용)
- **Imagen 4.0 필수:** `IMAGE_PROVIDER=imagen` 설정 시 최신 `Imagen 4.0` 모델(fast 또는 high-quality 분기)을 사용하여 최상급 아트를 생성함.
- **다변화 전략:** 동일한 자율 배포 사이클 내에서 **보컬(Vocal)과 연주(Inst)의 테마를 다르게 설정**하여 채널의 다양성을 확보함. (예: 보컬은 째즈 카페, 연주는 클래식 오케스트라)
- **설명란 구성:** 자동으로 생성된 **트랙리스트(타임스탬프)** 및 1960년대 째즈 역사적 맥락/클래식 곡에 대한 스토리텔링 포함.

## 5. 🚀 2026 Viral Growth Tactics (조회수 폭발 전략)

유튜브 알고리즘의 선택을 받기 위한 실전형 성장 전략입니다. 에이전트는 콘텐츠 생성 시 다음 수칙을 자동 적용합니다.

### [A] Shorts: 3초 후킹(Hook) 법칙
- **후킹 문구 삽입:** 쇼츠 영상 상단에 시청자의 호기심을 자극하는 텍스트 오버레이를 반드시 포함합니다.
  - 예: "이 음악을 들으면 5분 안에 집중력이 200% 상승합니다", "새벽 2시, 당신을 위한 완벽한 동반자"
- **고에너지 시작:** 첫 1~3초 내에 가장 시각적으로 역동적인 이퀄라이저 파형과 청각적으로 매력적인 하이라이트 구간을 배치합니다.

### [B] GEO (Generative Engine Optimization)
- **검색 의도 매칭:** 단순 장르명이 아닌 시청자의 '상황'과 '의도'가 담긴 키워드를 제목과 설명란 최상단에 배치합니다.
  - 핵심 키워드 조합: `[장르] + [상황] + [효과]` (예: "Lofi Jazz for Deep Study and Stress Relief")
- **UGC 유도:** 설명란에 "Feel free to use this audio in your Shorts! Tag @OZ" 문구를 넣어 음원 사용을 장려합니다. 타 제작자가 우리 음원을 쓸수록 알고리즘 점수가 상승합니다.

### [C] 커뮤니티 강화 (Engagement Loop)
- **질문형 고정 댓글:** 업로드 직후 시청자의 답변을 유도하는 질문을 고정 댓글로 작성합니다.
  - 질문 예시: "지금 계신 곳의 날씨는 어떤가요?", "이 곡을 들으며 무엇을 하고 계신가요?"
- **세션 시간 극대화:** 영상 종료 시점에 연관된 재생목록(예: 'OZ CAFE Series')으로 시청자를 유도하여 채널 체류 시간을 높합니다.

## 6. 📊 Feedback-Driven Optimization (데이터 기반 최적화)
- **일일 성과 분석:** 매 사이클 시작 전 `evaluate_feedback.py`를 호출하여 어제의 영상 성적(조회수, 좋아요)을 분석합니다.
- **장르 가중치 적용 (70:30 법칙):**
  - **70% (Exploitation):** 최근 조회수 1,000회 이상을 기록한 '검증된 히트 장르'를 집중적으로 심화하여 알고리즘 점수를 극대화합니다.
  - **30% (Exploration):** 새로운 트렌드 발굴을 위해 데이터가 없거나 낮은 장르를 강제로 탐색하여 채널의 확장성을 확보합니다.

- **주기적인 상태 보고:** 실행 시간이 길어지는 작업(예: 인코딩, 대량의 코드 분석 등)의 경우, 중간에 반드시 현재 진행 상황을 요약하여 사용자에게 보고해야 합니다.

- **침묵 방지:** 작업을 진행 중일 때 응답 없이 장시간(예: 5분 이상) 경과되지 않도록 해야 하며, 백그라운드에서 어떤 프로세스가 구동 중인지 명확히 안내합니다.

- **단계별 체크포인트 공유:** 대규모 작업은 세부 단계로 나누어 각 단계가 완료될 때마다 '현재 무엇을 마쳤고, 다음 무엇을 할 것인지'를 투명하게 공유합니다.
