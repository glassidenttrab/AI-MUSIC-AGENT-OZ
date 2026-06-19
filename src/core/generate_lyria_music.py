import os
import sys
import json
import base64
import requests
from dotenv import load_dotenv

def generate_lyria_music(prompt, output_filename="result_music.mp3"):
    """
    Lyria-3-Pro 모델을 Gemini API(generativelanguage) 방식으로 사용하여 음악을 생성합니다.
    이 방식은 단일 트랙으로 3분 내외의 고품질 음원 생성을 지원합니다.
    """
    load_dotenv()
    
    # 1. API 키 확보 (VERTEx_AI_KEY 또는 GOOGLE_CLOUD_API_KEY 사용)
    # 기존 .env 파일에 설정된 키를 활용합니다.
    api_key = os.getenv("VERTEx_AI_KEY") or os.getenv("GOOGLE_CLOUD_API_KEY")
    
    if not api_key:
        print("[ERROR] [Lyria 3 Pro] GEMINI_API_KEY (VERTEx_AI_KEY) is missing in .env")
        return False

    # 2. 모델 설정
    is_clip = os.getenv("GEN_CLIP_MODE") == "True"
    # 대표님 요청: 무조건 Pro 버전 사용 (Clip 모드라도 Pro로 고품질 지향)
    model_id = "lyria-3-pro-preview" 
    
    print(f"==================================================")
    print(f"AI Music Engine running... (Model: {model_id} via Gemini API)")
    print("==================================================")
    
    # 3. Gemini API (generativelanguage) 엔드포인트 URL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # 4. generateContent 전용 페이로드 구성
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["AUDIO"]
        }
    }

    try:
        print(f"[Gemini API] Sending request for Lyria 3 Pro (High Quality Long-form)...")
        # 음악 생성은 시간이 걸리므로 타임아웃을 600초(10분)로 넉넉히 잡습니다.
        response = requests.post(url, headers=headers, json=payload, timeout=600)
        
        if response.status_code == 200:
            res_json = response.json()
            if process_gemini_audio_response(res_json, output_filename):
                return True
        elif response.status_code == 429:
            print("[WARN] [Gemini API] 429 Quota Exceeded. 쿼터 한도에 도달했습니다.")
            sys.exit(1)
        else:
            print(f"[ERROR] [Gemini API] Generation Error ({response.status_code}): {response.text[:500]}")
            sys.exit(1)
            
    except requests.exceptions.Timeout:
        print("[ERROR] [Gemini API] Request Timeout (600s). 음성 생성 시간이 초과되었습니다.")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] [Gemini API] Request Error: {e}")
        sys.exit(1)

def process_gemini_audio_response(res_json, output_filename):
    """
    Gemini API 응답(candidates 형식)을 파싱하여 MP3로 저장합니다.
    """
    try:
        saved_success = False
        print(f"[DEBUG] Raw response: {json.dumps(res_json)[:1000]}")
        if "candidates" in res_json and len(res_json["candidates"]) > 0:
            candidate = res_json["candidates"][0]
            parts = candidate.get("content", {}).get("parts", [])
            
            for part in parts:
                if "inlineData" in part:
                    mime_type = part["inlineData"].get("mimeType")
                    print(f"[DEBUG] Found inlineData with mimeType: {mime_type}")
                    if mime_type in ["audio/mp3", "audio/mpeg"]:
                        audio_b64 = part["inlineData"].get("data", "")
                    if audio_b64:
                        audio_bytes = base64.b64decode(audio_b64)
                        
                        # 1. 파일로 저장
                        with open(output_filename, "wb") as f:
                            f.write(audio_bytes)
                        
                        size_kb = len(audio_bytes) // 1024
                        print(f"[SUCCESS] Lyria 3 Pro 음원 저장 완료: {output_filename} ({size_kb} KB)")
                        saved_success = True
                
                # 텍스트 정보(BPM, 가사 등)가 포함된 경우 출력
                if "text" in part:
                    print(f"[Metadata] {part['text']}")

            return saved_success
        else:
            print("[ERROR] [Gemini API] No candidates found in response.")
            print(f"[DEBUG] Full Response: {json.dumps(res_json)[:500]}")
            return False
    except Exception as e:
        print(f"[ERROR] [Gemini API] Response processing error: {e}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Lyria 3 Pro Music Generator (Gemini API)")
    parser.add_argument("--prompt", type=str, required=False, help="Music generation prompt")
    parser.add_argument("--prompt_file", type=str, required=False, help="Path to text file containing the prompt")
    parser.add_argument("--output", type=str, default="lyria_pro_final.mp3", help="Output file path")
    
    if len(sys.argv) >= 2 and not sys.argv[1].startswith("--"):
        prompt_text = sys.argv[1]
        out_file = sys.argv[2] if len(sys.argv) > 2 else "lyria_pro_final.mp3"
    else:
        args = parser.parse_args()
        if args.prompt_file:
            with open(args.prompt_file, "r", encoding="utf-8") as f:
                prompt_text = f.read()
        elif args.prompt:
            prompt_text = args.prompt
        else:
            print("[ERROR] Must provide either --prompt or --prompt_file")
            sys.exit(1)
        out_file = args.output
    
    print(f"[Lyria 3 Pro] Starting generation with prompt: {prompt_text[:100]}...")
    success = generate_lyria_music(prompt_text, out_file)
    if not success:
        sys.exit(1)
