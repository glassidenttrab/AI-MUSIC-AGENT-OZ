---
name: image-pro
description: [비주얼] 초보적인 생성을 넘어선 하이엔드 시네마틱 이미지 생성 전용 스킬
---

# Skill Title: 하이엔드 비주얼 마스터 [Image-Pro]

이 스킬은 평범하고 일률적인 AI 이미지를 거부하며, 극도의 디테일과 예술적 시네마토그래피를 담은 하이엔드 이미지를 생성하기 위한 '마스터 프롬프트 아키텍처'를 정의합니다.

## 1. 생성 원칙 (Generation Principles)
1. **극사실주의 (Hyper-realism):** 피부의 모공, 미세한 주근깨, 옷감의 주름 등 살아있는 디테일을 추구합니다.
2. **시네마틱 질감:** 디지털의 매끈함보다는 아날로그 필름의 입자감(grain)과 렌즈 플레어(lens flare)를 의도적으로 섞어 고급스러움을 더합니다.
3. **분위기 지상주의:** 단순히 '예쁜' 사진이 아닌, 이야기를 담고 있는 '공기감'을 형성합니다.

## 2. 이미지 생성 철학 (Philosophy)
- **Anti-Generic**: 흔한 AI 느낌(플라스틱 피부, 과한 광택)을 지양합니다.
- **Analog Texture**: 의도적인 노이즈(grain), 렌즈 플레어, 아날로그적인 불완전함을 추가하여 사실감을 극대화합니다.
- **Cinematic Depth**: 광학적 특성(보케, 심도)을 활용하여 시선의 흐름을 제어합니다.

## 2. 마스터 프롬프트 아키텍처 (JSON 구조)

이미지 생성을 명령받을 때, 반드시 아래 구조로 사고하여 최종 프롬프트를 추출하십시오.

```json
{
  "image_request": {
    "goal": "핵심 주제 및 시각적 목표 (예: 광활한 황야 속 레드 바이크와 신비로운 여성)",
    "meta": {
      "image_type": "Cinematic Portrait / Landscape / Action",
      "quality": "8k Masterpiece with analog imperfections",
      "style_mode": "Neo-Cinematic with Analog Film Texture",
      "aspect_ratio": "4:5 (Instagram Optimized)",
      "resolution": "4096x5120"
    },
    "creative_style": "예술적 스타일 혼합 (예: 드니 빌뇌브의 시네마토그래피 + 80년대 보그 매거진)",
    "overall_theme": "전체 테마 (예: 고립 속의 아름다움)",
    "mood_vibe": "분위기 (예: 정적이고 자신감 넘치며 약간의 우울함)",
    "style_keywords": ["analog grain", "cinematic depth", "bokeh haze", "hyperreal skin"],
    "subject": {
      "identity": "피사체의 정체성과 특징",
      "facial_features": "표정 및 미세한 특징",
      "clothing": "의상 재질 및 상태 (worn, dusty 등)",
      "props": "주요 소품 (Vintage Motorcycle 등)"
    },
    "environment": {
      "setting": "세밀한 배경 묘사",
      "time_of_day": "시간대 (Golden Hour, Blue Hour 등)",
      "atmosphere": "대기 질감 (Volumetric dust 등)"
    },
    "lighting": {
      "type": "조명 기법 (Rim lighting, Directional 등)",
      "shadows": "그림자의 세밀함"
    }
  }
}
```

## 3. 프롬프트 변환 가이드 (Conversion)

위 JSON 데이터를 바탕으로 `generate_image` 호출 시 사용할 최종 프롬프트는 다음과 같은 결합 규칙을 따릅니다:

1.  **Core Prompt**: `goal` + `overall_theme`
2.  **Style Layer**: `creative_style` + `meta.style_mode` + `style_keywords`의 조합 (쉼표로 구분)
3.  **Detail Layer**: `subject` 내의 모든 항목을 문장형으로 서술
4.  **Environmental Layer**: `environment`와 `lighting`의 조합을 통해 공간의 공기를 묘사
5.  **Technical Quality**: `meta.quality`와 카메라 설정(예: shot on 35mm lens, f/1.8)을 명시

## 4. 실행 체크리스트 (Self-Check)
- [ ] 피부 질감이 너무 매끄럽지 않은가? (Hyperreal skin, fine pores, subtle sweat 포함 여부)
- [ ] 조명이 평면적이지 않은가? (Depth of shadow, rim lighting, volumetric light 확인)
- [ ] 배경이 단순한 배경인가, '공간(Atmosphere)'인가? (Dust particles, haze, environmental mood 확인)

---
> [!TIP]
> 이 아키텍처를 사용하여 생성된 이미지는 인스타그램 및 유튜브 커뮤니티에서 시청자의 시선을 즉각적으로 사로잡는 강력한 '비주얼 훅'으로 작동합니다.
