const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const notificationService = require('./notification_service');

/**
 * ⚠️ ABSOLUTE ISOLATION NOTICE:
 * This scheduler MUST NOT under any circumstances interact with ARIN_INSTA_MASTER
 * in the neighbor directory (f:\ProJectHome\Ozpix_Instar_Arin).
 * All activities must be confined within the AI-MUSIC-AGENT-OZ scope.
 */

// [설정] 자율 사이클 주기 (밀리초 단위, 예: 12시간 = 12 * 60 * 60 * 1000)
// [설정] 자율 사이클 주기 (밀리초 단위, 예: 8시간 = 8 * 60 * 60 * 1000)
const CYCLE_INTERVAL = 8 * 60 * 60 * 1000; 
const LOCK_FILE = path.join(__dirname, 'master.lock');

console.log(`\n==================================================`);
console.log(`🚀 [AI MUSIC AGENT OZ] Always-ON 상시 가동 모드 가동`);
console.log(`⏱️ 실행 주기: 매 8시간마다 자율 사이클 수행 (일일 3회)`);
console.log(`==================================================\n`);

async function runCycle(retryCount = 0) {
    if (fs.existsSync(LOCK_FILE)) {
        try {
            const oldPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'));
            process.kill(oldPid, 0); // 프로세스 존재 여부 체크 (0 시그널은 죽이지 않음)
            console.log(`[경고] 이전 사이클(PID: ${oldPid})이 아직 작동 중입니다. 스킵합니다.`);
            return;
        } catch (e) {
            // 프로세스가 없는데 락 파일만 남은 경우 (Stale Lock)
            console.log(`[정보] 고착된 락 파일(${LOCK_FILE})을 발견하여 제거합니다. (이전 프로세스 종료됨)`);
            fs.removeSync(LOCK_FILE);
        }
    }

    try {
        fs.writeFileSync(LOCK_FILE, process.pid.toString());
        console.log(`\n[${new Date().toLocaleString()}] 🔄 자율 사이클 시작 (재시도 회차: ${retryCount}/3)...`);

        const child = spawn('node', ['run_autonomous.js'], {
            cwd: __dirname,
            stdio: 'inherit',
            shell: true
        });

        child.on('close', async (code) => {
            if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);

            if (code !== 0) {
                console.error(`\n[${new Date().toLocaleString()}] ❌ 사이클 종료 (오류 발생! Exit Code: ${code})`);
                
                if (retryCount < 3) {
                    const RETRY_DELAY = 30 * 60 * 1000; // 30분 뒤 재시도
                    console.log(`[알림] 30분 뒤에 재시도를 진행합니다... (다음 재시도: ${retryCount + 1}/3)`);
                    setTimeout(() => runCycle(retryCount + 1), RETRY_DELAY);
                } else {
                    await notificationService.sendAlert(
                        '스케줄러 자율 사이클 장애 (3회 재시도 실패)', 
                        `run_autonomous.js 프로세스가 반복적으로 에러 코드(${code})와 함께 종료되었습니다. 로그를 확인해 주세요.`
                    );
                }
            } else {
                console.log(`\n[${new Date().toLocaleString()}] ✅ 사이클 종료 (Exit Code: ${code})`);
                console.log(`[대기] 다음 정규 사이클까지 휴식합니다... (${CYCLE_INTERVAL / 36e5}시간 뒤 실행)`);
            }
        });

    } catch (err) {
        console.error(`❌ 사이클 실행 중 치명적 오류:`, err.message);
        await notificationService.sendAlert('마스터 스케줄러 치명적 오류', `스케줄러 실행 중 예외가 발생했습니다: ${err.message}`);
        if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);
    }
}

// 1. 즉시 첫 실행
runCycle();

// 2. 주기적 반복 설정
setInterval(runCycle, CYCLE_INTERVAL);

// 프로세스 종료 시 락 파일 제거
process.on('SIGINT', () => {
    if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);
    process.exit();
});
process.on('SIGTERM', () => {
    if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);
    process.exit();
});
