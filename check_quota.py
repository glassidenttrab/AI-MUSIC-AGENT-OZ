import os
import sys
from dotenv import load_dotenv
from google import genai

load_dotenv()

def check_keys():
    api_keys_str = os.getenv("GEMINI_API_KEY", "")
    api_keys = [k.strip() for k in api_keys_str.split(",") if k.strip()]
    
    print(f"--- [총 {len(api_keys)}개의 API 키 정밀 진단 시작] ---")
    
    for i, key in enumerate(api_keys):
        print(f"\n🔑 Key #{i+1} 검증 중...")
        try:
            client = genai.Client(api_key=key)
            # 아주 가벼운 텍스트 생성 테스트
            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents="hi"
            )
            print(f"✅ Key #{i+1} 성공! (상태: 정상)")
        except Exception as e:
            print(f"❌ Key #{i+1} 실패: {str(e)}")
            if "429" in str(e) or "quota" in str(e).lower():
                print("⚠️ 원인: 할당량 초과 (재시도 대기 시간 필요)")

if __name__ == "__main__":
    check_keys()
