import os
import json
import random
from datetime import datetime

# 파일 경로 설정 (절대 경로 및 상대 경로 혼용 방지)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEM_FILE = os.path.join(BASE_DIR, "memory", "upload_history.json")
REWARD_DIR = os.path.join(BASE_DIR, "memory", "reward")
PUNISH_DIR = os.path.join(BASE_DIR, "memory", "punishment")

def auto_evaluate_performance():
    """
    유튜브 업로드 이력을 확인하여 성과를 시뮬레이션하고 
    보상(Reward) 또는 징계(Punishment) 로그를 남깁니다.
    """
    print(f"====== [OZ Memory Engine] 성과 분석 및 피드백 루프 가동 ======")
    
    if not os.path.exists(MEM_FILE):
        print(f"[알림] {MEM_FILE} 파일이 없습니다. 아직 업로드된 영상이 없는 것 같습니다.")
        return

    try:
        with open(MEM_FILE, "r", encoding="utf-8") as f:
            history = json.load(f)
    except Exception as e:
        print(f"[오류] 메모리 파일을 읽는 중 에러 발생: {e}")
        return

    updated_count = 0
    for record in history:
        # 아직 평가되지 않은 'published' 상태의 영상만 처리
        if record.get("status") == "published":
            meta = record.get("metadata", {})
            title = meta.get("youtube_title", "제목 없음")
            genre = meta.get("genre", "Unknown")
            mood = meta.get("mood", "Unknown")
            video_id = record.get("video_id", "N/A")

            # [시뮬레이션] 실제로는 YouTube Analytics API 연동 구간
            # 여기서는 알고리즘 테스트를 위해 랜덤 조회수를 생성합니다.
            views = random.randint(500, 25000) 

            summary = {
                "Title": title,
                "VideoID": video_id,
                "Genre": genre,
                "Mood": mood,
                "Views": views,
                "EvaluateDate": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "PromptUsed": meta.get("prompt")
            }

            # 성과 판별 기준 (예: 조회수 10,000회 초과 시 보상)
            if views >= 10000:
                print(f"✅ [SUCCESS] {title} -> {views} views! (Genre: {genre})")
                log_file = os.path.join(REWARD_DIR, "success_log.txt")
                with open(log_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(summary, ensure_ascii=False) + "\n")
            else:
                print(f"⚠️  [UNDERPERFORM] {title} -> {views} views. (Genre: {genre})")
                summary["Analysis"] = "목표 수치 미달. 썸네일 클릭률(CTR) 혹은 타겟 장르 대중성 부족 판단."
                log_file = os.path.join(PUNISH_DIR, "fail_log.txt")
                with open(log_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(summary, ensure_ascii=False) + "\n")

            # 상태 업데이트
            record["status"] = "evaluated"
            record["views_at_evaluation"] = views
            updated_count += 1

    if updated_count > 0:
        with open(MEM_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=4, ensure_ascii=False)
        print(f"✨ 총 {updated_count}개의 영상에 대한 데이터 평가 및 메모리 업데이트 완료.")
    else:
        print("🔎 새로 평가할 영상이 없습니다.")

if __name__ == "__main__":
    auto_evaluate_performance()
