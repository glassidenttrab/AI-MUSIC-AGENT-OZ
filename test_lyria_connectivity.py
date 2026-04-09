import os
import sys
from dotenv import load_dotenv
import time

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("❌ 패키지 에러: 'pip install google-genai' 필요")
    sys.exit(1)

def test_lyria():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ .env에 API 키가 없습니다.")
        return

    print(f"🔍 API 키 검증 중... (키 길이: {len(api_key)})")
    client = genai.Client(api_key=api_key)
    
    # 30초 클립 모델(Clip)로 가벼운 테스트 시도
    model_id = "lyria-3-clip-preview"
    prompt = "A cheerful upbeat lo-fi track with soft acoustic guitar and light drums, chill vibes."
    output_file = "test_connectivity_check.mp3"

    print(f"🎵 {model_id} 모델로 테스트 음악 생성 시작...")
    try:
        start_time = time.time()
        response = client.models.generate_content(
            model=model_id,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"]
            )
        )
        
        if not response:
            print("❌ 응답이 없습니다.")
            return

        # 결과 저장
        found_audio = False
        candidates = getattr(response, 'candidates', [])
        if candidates:
            parts = getattr(candidates[0].content, 'parts', [])
            for part in parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    with open(output_file, 'wb') as f:
                        f.write(part.inline_data.data)
                    found_audio = True
                    break
        
        if found_audio:
            duration = time.time() - start_time
            print(f"✅ 성공! 테스트 파일 생성 완료: {output_file} ({duration:.1f}초 소요)")
        else:
            print("❌ 오디오 데이터가 응답에 없습니다.")
            if hasattr(response, 'prompt_feedback'):
                print(f"⚠️ 피드백: {response.prompt_feedback}")

    except Exception as e:
        print(f"❌ API 오류 발생: {str(e)}")

if __name__ == "__main__":
    test_lyria()
