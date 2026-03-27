const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const notificationService = require('./notification_service');

// [설정] 하루에 생성할 영상 개수 및 시간 (24시간 형식)
const VIDEOS_PER_DAY = 1;
const PUBLISH_TIMES = ["20:00"]; // 분석 결과 가장 조회수가 활발한 골든 타임
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

    console.log(`\n[${new Date().toLocaleString()}] 🚀 오늘의 콘텐츠 생성 및 자동화 시퀀스 개시 (총 ${VIDEOS_PER_DAY}개)...`);
    
    try {
        // 락 파일 생성 (현재 프로세스 ID 기록)
        await fs.writeFile(LOCK_PATH, process.pid.toString());

        for (let i = 0; i < VIDEOS_PER_DAY; i++) {
            const publishTime = PUBLISH_TIMES[i] || "22:00";
            
            console.log(`\n--- [배치 작업 ${i + 1}/${VIDEOS_PER_DAY}] 시작 (예약 시간: ${publishTime}) ---`);
            
            // run_agent.js 실행 (자식 프로세스 완료 대기)
            // 인덱스(i)를 인자로 전달하여 개별 파일명 및 장르 중복 방지 처리
            await new Promise((resolve) => {
                const child = exec(`node run_agent.js ${i} >> latest_agent.log 2>&1`, {
                    cwd: __dirname,
                    env: { ...process.env, OZ_PUBLISH_TIME: publishTime }
                }, async (error, stdout, stderr) => {
                    if (error) {
                        const errorMsg = `❌ [작업 ${i + 1}] 실행 중 치명적 오류 발생: ${error.message}`;
                        console.error(errorMsg);
                        // [긴급 알림] 장애 발생 시 즉각 이메일 발송
                        await notificationService.sendAlert(`[긴급] #${i + 1} 작업 실패`, errorMsg);
                    } else {
                        console.log(`✅ [작업 ${i + 1}] 엔진 작업이 정상 종료되었습니다.`);
                    }
                    resolve();
                });
            });
            console.log(`[완료] #${i + 1} 영상 생성 및 예약 업로드 시퀀스 종료.`);
        }
        
        // 오늘 작업 완료 기록 저장
        await fs.writeJson(LAST_RUN_PATH, { date: today });
        console.log(`\n[${new Date().toLocaleString()}] ✨ 오늘의 모든 자동화 작업(${VIDEOS_PER_DAY}개)이 성공적으로 완료되었습니다.`);
        
        // 3. [추가] 모니터링 모듈 호출 (사후 점검)
        console.log(`\n[모니터링] 시스템 최종 상태 점검을 시작합니다...`);
        await new Promise((resolve) => {
            exec(`node monitor.js`, { cwd: __dirname }, (error, stdout, stderr) => {
                if (stdout) console.log(stdout);
                resolve();
            });
        });

        console.log(`[시스템] 자원을 반납하고 프로세스를 안전하게 종료합니다.`);
        
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
