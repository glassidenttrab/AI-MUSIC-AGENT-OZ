const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

// [설정] 하루에 생성할 영상 개수 및 시간 (24시간 형식)
const VIDEOS_PER_DAY = 3;
const PUBLISH_TIMES = ["12:00", "18:00", "21:00"]; // 분석 결과 가장 좋은 시간대
const LOCK_PATH = path.join(__dirname, 'scheduler.lock'); // 중복 실행 방지용
const LAST_RUN_PATH = path.join(__dirname, 'last_run.json'); // 마지막 실행 기록

console.log('====== [AI MUSIC AGENT OZ] 엔진 자동화 시스템 가동 ======');

/**
 * OZ 메인 에이전트 실행 함수 (Job 방식)
 * 모든 작업 완료 시 프로세스를 자동으로 종료하도록 수정되었습니다.
 */
async function runMainTask() {
    const today = new Date().toDateString();

    // 1. [중복 방지] 락 파일 체크
    if (fs.existsSync(LOCK_PATH)) {
        console.log(`\n[알림] 이미 다른 프로세스에서 작업이 진행 중이거나 락 파일이 존재합니다.`);
        console.log(`       작업을 중복 실행하지 않고 즉시 종료합니다.`);
        process.exit(0);
    }

    // 2. [로그 체크] 오늘 이미 완료했는지 체크
    if (fs.existsSync(LAST_RUN_PATH)) {
        try {
            const lastRun = await fs.readJson(LAST_RUN_PATH);
            if (lastRun.date === today) {
                console.log(`\n[알림] 오늘(${today})의 작업은 이미 성공적으로 완료되었습니다.`);
                console.log(`       추가 작업을 수행하지 않고 프로세스를 종료합니다.`);
                process.exit(0);
            }
        } catch (e) {
            // JSON 읽기 실패 시 무시하고 진행
        }
    }

    console.log(`\n[${new Date().toLocaleString()}] 🚀 오늘의 콘텐츠 생성 및 자동화 시퀀스 개시...`);
    
    try {
        // 락 파일 생성 (현재 프로세스 ID 기록)
        await fs.writeFile(LOCK_PATH, process.pid.toString());

        for (let i = 1; i <= VIDEOS_PER_DAY; i++) {
            // [시간 자동 분산] 설정된 정시에서 0~29분 사이의 랜덤 값을 더해 분산 처리
            const timeStr = PUBLISH_TIMES[i - 1] || "22:00";
            const [baseHour, baseMin] = timeStr.split(':').map(Number);
            
            // 0~29분 랜덤 추가
            const randomOffset = Math.floor(Math.random() * 30);
            const totalMinutes = baseMin + randomOffset;
            const finalHour = (baseHour + Math.floor(totalMinutes / 60)) % 24;
            const finalMin = totalMinutes % 60;
            
            const publishTime = `${String(finalHour).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`;
            
            console.log(`\n--- [영상 ${i}/${VIDEOS_PER_DAY}] 작업 시작 (예약 시간: 오늘 ${publishTime}) ---`);
            
            // run_agent.js 실행 (자식 프로세스 완료 대기)
            await new Promise((resolve) => {
                const child = exec(`node run_agent.js`, {
                    cwd: __dirname,
                    env: { ...process.env, OZ_PUBLISH_TIME: publishTime }
                }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`❌ [영상 ${i}] 실행 중 오류 발생:`, error.message);
                    } else {
                        console.log(stdout); // 실행 결과 로그 출력
                    }
                    resolve();
                });
            });
            console.log(`✅ [영상 ${i}] 생성 및 예약 업로드 패키징 프로세스 종료.`);
        }
        
        // 오늘 작업 완료 기록 저장
        await fs.writeJson(LAST_RUN_PATH, { date: today });
        console.log(`\n[${new Date().toLocaleString()}] ✨ 오늘의 모든 자동화 작업이 성공적으로 완료되었습니다.`);
        console.log(`[시스템] 자원을 반납하고 프로세스를 안전하게 전체 종료합니다.`);
        
    } catch (err) {
        console.error('❌ 시스템 실행 중 치명적 오류 발생:', err);
        process.exit(1);
    } finally {
        // 작업을 마치고 락 파일 제거
        if (fs.existsSync(LOCK_PATH)) {
            fs.removeSync(LOCK_PATH);
            console.log(`[시스템] 락 파일(${LOCK_PATH})이 제거되었습니다.`);
        }
    }
    
    // 정상 종료
    process.exit(0);
}

// 스크립트 실행 시 즉시 메인 태스크 가동
runMainTask();
