import os
import sys
import json
from datetime import datetime
from googleapiclient.discovery import build
import google.oauth2.credentials

# 파일 경로 설정 (현재 스크립트 위치가 `.agent/tools/` 이므로 부모의 부모가 BASE 디렉토리)
script_path = os.path.abspath(__file__) if '__file__' in globals() else os.path.abspath(sys.argv[0])
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(script_path)))
MEM_FILE = os.path.join(BASE_DIR, "memory", "upload_history.json")
LESSONS_FILE = os.path.join(BASE_DIR, "memory", "lessons_learned.json")
REWARD_DIR = os.path.join(BASE_DIR, "memory", "reward")
PUNISH_DIR = os.path.join(BASE_DIR, "memory", "punishment")

TOKEN_FILE = os.path.join(BASE_DIR, "token.json")
CLIENT_SECRET_FILE = os.path.join(BASE_DIR, "client_secret_83268081542-9qq9mlgep0f3bgo0h85ud5ddsljvun6v.apps.googleusercontent.com.json")

def get_youtube_service():
    if not os.path.exists(TOKEN_FILE):
        print("token.json이 없습니다. 앱에서 인증을 먼저 진행해 주세요.")
        return None
    try:
        with open(TOKEN_FILE, 'r') as f:
            creds_data = json.load(f)
        
        with open(CLIENT_SECRET_FILE, 'r') as f:
            client_data = json.load(f)
            client_info = client_data.get('installed', client_data.get('web', {}))

        creds = google.oauth2.credentials.Credentials(
            token=creds_data.get('access_token'),
            refresh_token=creds_data.get('refresh_token'),
            token_uri=client_info.get('token_uri', "https://oauth2.googleapis.com/token"),
            client_id=client_info.get('client_id'),
            client_secret=client_info.get('client_secret')
        )
        return build("youtube", "v3", credentials=creds)
    except Exception as e:
        print(f"API 클라이언트 생성 오류: {e}")
        return None

def auto_evaluate_performance():
    print(f"====== [OZ Memory Engine] 유튜브 실제 성과(API) 연동 피드백 루프 가동 ======")
    
    if not os.path.exists(MEM_FILE):
        print(f"[알림] {MEM_FILE} 파일이 없습니다.")
        return

    youtube = get_youtube_service()
    if not youtube:
        print("YouTube API에 연결할 수 없습니다. (인증 플로우 재실행 요망)")
        return

    try:
        with open(MEM_FILE, "r", encoding="utf-8") as f:
            history = json.load(f)
    except Exception as e:
        print(f"[오류] 메모리 파일 로드 실패: {e}")
        return

    updated_count = 0
    lessons = {"successful_genres": [], "technical_issues": [], "recommendations": []}

    if os.path.exists(LESSONS_FILE):
        try:
            with open(LESSONS_FILE, "r", encoding="utf-8") as f:
                lessons = json.load(f)
        except: pass

    # 비디오 ID 모으기 (최대 50개 API limits 고려)
    video_ids = []
    video_map = {}
    for record in history:
        # 이미 평가되었더라도 최신 조회수 갱신을 위해 API에서는 다 부를 수 있음
        # 여기서는 평가 대기 상태 영상 위주로 확인 (예외적으로 published도)
        if record.get("status") in ["published", "evaluated"]:
            vid = record.get("video_id")
            if vid and vid != "N/A":
                video_ids.append(vid)
                video_map[vid] = record

    if not video_ids:
        print("🔎 조회할 유효한 영상 ID가 없습니다.")
        return

    try:
        request = youtube.videos().list(
            part="statistics",
            id=",".join(video_ids)
        )
        response = request.execute()

        for item in response.get("items", []):
            vid = item.get("id")
            stats = item.get("statistics", {})
            real_views = int(stats.get("viewCount", "0"))
            real_likes = int(stats.get("likeCount", "0"))
            
            record = video_map[vid]
            meta = record.get("metadata", {})
            genre = meta.get("genre", "Unknown")
            title = meta.get("youtube_title", "Unknown")

            is_buggy = False
            if "Phonk" in genre and ("Sanctuary" in title or "Realm" in title):
                is_buggy = True
                if f"Mismatched theme for {genre}" not in str(lessons["technical_issues"]):
                    lessons["technical_issues"].append(f"Mismatched theme for {genre} in video {vid}")

            summary = {
                "Title": title,
                "Genre": genre,
                "API_Views": real_views,
                "API_Likes": real_likes,
                "Date": datetime.now().strftime("%Y-%m-%d"),
                "IsBuggy": is_buggy
            }

            # 사용자의 요청에 따라 성공 기준 대폭 상향 (100 -> 1000회)
            MIN_SUCCESS_VIEWS = 1000 
            if real_views >= MIN_SUCCESS_VIEWS and not is_buggy:
                print(f"✅ [SUCCESS/API] {genre} ({real_views} views)")
                if genre not in lessons["successful_genres"]:
                    lessons["successful_genres"].append(genre)
                with open(os.path.join(REWARD_DIR, "success_log.txt"), "a", encoding="utf-8") as f:
                    f.write(json.dumps(summary, ensure_ascii=False) + "\n")
            elif record.get("status") == "published": # 평가된 적이 없다면 fail이나 underperform
                print(f"⚠️  [UNDERPERFORM/API] {genre} ({real_views} views)")
                with open(os.path.join(PUNISH_DIR, "fail_log.txt"), "a", encoding="utf-8") as f:
                    f.write(json.dumps(summary, ensure_ascii=False) + "\n")

            record["status"] = "evaluated"
            record["views_at_evaluation"] = real_views
            record["likes_at_evaluation"] = real_likes
            updated_count += 1

    except Exception as e:
        print(f"API 호출 중 에러 발생: {e}")
        return

    # 동적 추천 생성
    if lessons["successful_genres"]:
        lessons["recommendations"] = [
            f"Increase weight for successful genres: {', '.join(lessons['successful_genres'])}",
            "Maintain 70:30 exploitation/exploration ratio to scale proven hits.",
            "Analyze audience retention for the first 3 seconds to optimize Shorts hooks."
        ]
    else:
        lessons["recommendations"] = [
            "Focus on diverse experimentation (Exploration mode) to find the first 'winning' genre.",
            "Ensure PromptEngineer logic strictly maps genres to storytelling scenarios."
        ]

    if updated_count > 0:
        with open(MEM_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=4, ensure_ascii=False)
    
    # [Step 0] 글로벌 트렌드 검색 기능 호출
    external_trends = fetch_global_trends(youtube)
    lessons["external_trends"] = external_trends

    with open(LESSONS_FILE, "w", encoding="utf-8") as f:
        json.dump(lessons, f, indent=4, ensure_ascii=False)
    print(f"✨ 성과 평가 및 글로벌 트렌드({len(external_trends)}개 테마) 업데이트 완료.")

def fetch_global_trends(youtube):
    """
    유튜브 Search API를 사용하여 현재 시장에서 인기 있는 음악 테마와 키워드를 수집함
    """
    if not youtube: return []
    
    queries = ["Relaxing BGM", "Healing Music", "Study Jazz", "Lofi Beats", "Deep Sleep ASMR"]
    trends = []
    
    print(f"📡 [Market Intelligence] 글로벌 유튜브 트렌드 분석 시작...")
    
    try:
        for q in queries:
            request = youtube.search().list(
                q=q,
                part="snippet",
                type="video",
                order="viewCount",
                maxResults=5
            )
            response = request.execute()
            
            for item in response.get("items", []):
                snippet = item.get("snippet", {})
                title = snippet.get("title", "")
                trends.append({
                    "query": q,
                    "found_title": title,
                    "extracted_keywords": [w for w in title.split() if len(w) > 3]
                })
        
        # 키워드 빈도수 계산 등 추가 로직 가능
        return trends
    except Exception as e:
        print(f"⚠️ 트렌드 검색 중 오류: {e}")
        return []

if __name__ == "__main__":
    auto_evaluate_performance()
