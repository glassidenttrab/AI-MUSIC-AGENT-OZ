import os
import sys
from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("❌ 패키지 에러: 터미널에서 'pip install google-genai'를 실행해주세요.")
    sys.exit(1)

def generate_music_with_lyria(prompt, output_filename="result_music.mp3", is_pro=True):
    """
    구글 최신 음악 모델 Lyria 3를 사용하여 음악을 생성하는 1인 기업가용 범용 도구
    
    Args:
        prompt (str): 어떤 음악을 만들지 묘사하는 프롬프트 (제이멘토 5단계 공식 활용)
        output_filename (str): 저장할 파일 형식 이름 (기본값: result_music.mp3)
        is_pro (bool): True이면 최대 3분 완곡 Pro 모델, False이면 30초 Clip 모델 사용
    """
    # 1. 환경 변수에서 API 키 자동 불러오기 (보안)
    load_dotenv()
    
    # 일반적인 GEMINI_API_KEY 또는 여러 개의 GEMINI_API_KEYS(콤마 구분) 모두 호환 가능하게 설정
    api_key_env = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEYS")
    
    if not api_key_env:
        print("❌ 인증 에러: 동일 폴더의 .env 파일에 GEMINI_API_KEY를 설정해주세요!")
        return
        
    api_key = api_key_env.split(",")[0].strip()
    
    # 2. 제미나이 클라이언트 초기화 및 목적에 맞는 모델 자동 세팅
    client = genai.Client(api_key=api_key)
    model_id = "lyria-3-pro-preview" if is_pro else "lyria-3-clip-preview"
    
    print("==================================================")
    print(f"🎵 AI 음악 공장 가동 중... (선택 모델: {model_id})")
    print("==================================================")
    print(f"작곡 프롬프트: \n{prompt}\n")
    print(f"⏳ 대기 시간 안내: 생성 중입니다. 곡의 길이에 따라 1~3분 이상 소요될 수 있습니다...")

    try:
        # 3. 오디오 전용 응답 모달리티 및 가사 설정
        response = client.models.generate_content(
            model=model_id,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
            )
        )
        
        if not response:
            print("❌ 에러: API 응답이 비어있습니다. (Response is None)")
            return

        # 4. 응답 데이터에서 음원 파일 추출
        candidates = getattr(response, 'candidates', [])
        if candidates and len(candidates) > 0:
            candidate = candidates[0]
            content = getattr(candidate, 'content', None)
            if not content:
                print("❌ 에러: 응답에 콘텐츠가 포함되어 있지 않습니다. (Content is None)")
                return

            for part in getattr(content, 'parts', []):
                inline_data = getattr(part, 'inline_data', None)
                if inline_data and inline_data.data:
                    mime = getattr(inline_data, 'mime_type', '')
                    # MIME 타입에 맞춰서 안전하게 저장
                    ext = ".mp3" if "mpeg" in mime else ".wav"
                    base_path, _ = os.path.splitext(output_filename)
                    safe_output_filename = base_path + ext
                        
                    with open(safe_output_filename, 'wb') as f:
                        f.write(inline_data.data)
                        
                    print(f"✅ 성공! 오디오 파일({safe_output_filename})이 생성되었습니다! 🎧")
                    return
                        
            print("❌ 오디오 데이터가 서버 응답에 포함되지 않았습니다.")
        else:
            # 피드백 제공 (차단 이유 등)
            prompt_feedback = getattr(response, 'prompt_feedback', None)
            if prompt_feedback:
                print(f"⚠️ 생성 차단됨: {prompt_feedback}")
            print("❌ 곡 생성에 실패했습니다. (No candidates)")
            
    except Exception as e:
        print(f"❌ API 요청 중 서버 오류 발생: {e}")
        # 상세 에러 추적은 유지
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="제이 멘토의 AI 1인 기업가 범용 음악 생성 프로그램")
    parser.add_argument("--prompt", type=str, help="어떤 음악을 만들지 묘사하는 프롬프트")
    parser.add_argument("--lyrics", type=str, help="생성할 음악의 가사 내용")
    parser.add_argument("--output", type=str, default="my_ai_music.mp3", help="저장할 파일명")
    parser.add_argument("--clip", action="store_true", help="30초 클립 모델 사용 여부 (기본값: Pro 모델)")

    args = parser.parse_args()

    if args.prompt:
        # CLI 인자가 있으면 비대화형으로 실행
        # 가사가 있으면 프롬프트에 결합하거나 별도 파라미터로 처리 (여기서는 프롬프트 가공 및 전달)
        final_prompt = args.prompt
        if args.lyrics:
            final_prompt += f"\n\n[Lyrics]\n{args.lyrics}"
        generate_music_with_lyria(final_prompt, output_filename=args.output, is_pro=not args.clip)
    else:
        # CLI 인자가 없으면 기존처럼 사용자 입력을 받음
        print("\n🚀 제이 멘토의 AI 1인 기업가 범용 음악 생성 프로그램")
        print("💡 힌트: '장르 + 무드 + 악기 + 보컬 + 가사' 순서로 입력하세요.")
        user_prompt = input("어떤 음악을 만들고 싶으신가요? (프롬프트 입력): ")
        
        if user_prompt.strip():
            generate_music_with_lyria(user_prompt, output_filename=args.output, is_pro=not args.clip)
        else:
            print("❌ 프롬프트가 입력되지 않았습니다. 프로그램을 종료합니다.")
