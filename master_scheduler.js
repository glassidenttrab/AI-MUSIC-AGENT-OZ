const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

// [설정] 자율 사이클 주기 (밀리초 단위, 예: 12시간 = 12 * 60 * 60 * 1000)
const CYCLE_INTERVAL = 12 * 60 * 60 * 1000; 
const LOCK_FILE = path.join(__dirname, 'master.lock');

console.log(`\n==================================================`);
console.log(`🚀 [AI MUSIC AGENT OZ] Always-ON 상시 가동 모드 가동`);
console.log(`⏱️ 실행 주기: 매 12시간마다 자율 사이클 수행`);
console.log(`==================================================\n`);

async function runCycle() {
    if (fs.existsSync(LOCK_FILE)) {
        console.log(`[경고] 이전 사이클이 아직 작동 중입니다. 스킵합니다.`);
        return;
    }

    try {
        fs.writeFileSync(LOCK_FILE, process.pid.toString());
        console.log(`\n[${new Date().toLocaleString()}] 🔄 자율 사이클 시작...`);

        const child = spawn('node', ['run_autonomous.js'], {
            cwd: __dirname,
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            fs.removeSync(LOCK_FILE);
            console.log(`\n[${new Date().toLocaleString()}] ✅ 사이클 종료 (Exit Code: ${code})`);
            console.log(`[대기] 다음 사이클까지 휴식합니다... (${CYCLE_INTERVAL / 36e5}시간 뒤 실행)`);
        });

    } catch (err) {
        console.error(`❌ 사이클 실행 중 오류:`, err.message);
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
