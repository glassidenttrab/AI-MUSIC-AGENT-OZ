const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const notificationService = require('../core/notification_service');

/**
 * ?�️ ABSOLUTE ISOLATION NOTICE:
 * This scheduler MUST NOT under any circumstances interact with ARIN_INSTA_MASTER
 * in the neighbor directory (f:\ProJectHome\Ozpix_Instar_Arin).
 * All activities must be confined within the AI-MUSIC-AGENT-OZ scope.
 */
const net = require('net');

// [?정] ?율 ?이??주기 (밀리초 ?위, ?? 24?간 = 24 * 60 * 60 * 1000)
const CYCLE_INTERVAL = 24 * 60 * 60 * 1000; 
const LOCK_FILE = path.join(__dirname, 'master.lock');

console.log(`\n==================================================`);
console.log(`🚀 [AI MUSIC AGENT OZ] Always-ON 상시 가동 모드 가동`);
console.log(`⏱️ 실행 주기: 매 24시간마다 자율 사이클 수행 (일일 1회)`);
console.log(`==================================================\n`);

// [보조] ?정 ?트가 ?려?는지 ?인
function checkPort(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect(port, '127.0.0.1');
    });
}

// [보조] ComfyUI ?�버 ?�작 (?�제 PM2가 관리하므�?직접 ?�행?��? ?�음)
function notifyComfyUIDown() {
    console.warn(`\n?�️ [Critical] ComfyUI ?�버(8188)가 ?�답?��? ?�습?�다.`);
    console.log(`?�� PM2가 ?�동?�로 ?�시??중일 ???�습?�다. ?�시 ???�시 가???�스?�이 ?�시 체크?�니??`);
}

const MAX_INFRA_WAIT = 10; // ComfyUI 최�? ?��??�수 (10??× 30�?= 5�?

async function runCycle(retryCount = 0) {
    // 0. 로컬 ?�프??체크 (IMAGE_PROVIDER가 "comfy"??경우?�만 ComfyUI ?�수 체크)
    // [FIX 2026-04-20] IMAGE_PROVIDER가 gemini-flash/imagen????ComfyUI 불필??    const imageProvider = (process.env.IMAGE_PROVIDER || 'gemini-flash').toLowerCase();
    
    if (imageProvider === 'comfy') {
        console.log(`\n?�� [Health Check] ComfyUI ?�프???��? �?.. (IMAGE_PROVIDER: comfy)`);
        let infraWait = 0;
        let isComfyUp = await checkPort(8188);

        while (!isComfyUp) {
            infraWait++;
            if (infraWait > MAX_INFRA_WAIT) {
                console.error(`??[Critical] ComfyUI가 ${MAX_INFRA_WAIT}???�시???�에???�답?��? ?�습?�다. ?�번 ?�이?�을 건너?�니??`);
                await notificationService.sendAlert(
                    'ComfyUI ?�버 ?�애',
                    `?�트 8188??${MAX_INFRA_WAIT * 30}�??�안 ?�답?��? ?�아 ?�이?�을 건너?�니??`
                );
                return;
            }
            notifyComfyUIDown();
            console.log(`???�버 복구 ?��?�?.. (${infraWait}/${MAX_INFRA_WAIT}) 30�????�시?�합?�다...`);
            await new Promise(r => setTimeout(r, 30000));
            isComfyUp = await checkPort(8188);
        }
        console.log(`??[Success] ComfyUI ?�버가 ?�상 ?�동 중입?�다.`);
    } else {
        console.log(`\n?�� [Health Check] IMAGE_PROVIDER: ${imageProvider} (ComfyUI 불필??- ?�라?�드 ?��?지 ?�진 ?�용)`);
        console.log(`??[Success] ?�라?�드 기반 ?��?지 ?�성 모드�??�이?�을 진행?�니??`);
    }

    if (fs.existsSync(LOCK_FILE)) {
        try {
            const oldPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'));
            process.kill(oldPid, 0); // ?�로?�스 존재 ?��? 체크 (0 ?�그?��? 죽이지 ?�음)
            console.log(`[경고] ?�전 ?�이??PID: ${oldPid})???�직 ?�동 중입?�다. ?�킵?�니??`);
            return;
        } catch (e) {
            // ?�로?�스가 ?�는?????�일�??��? 경우 (Stale Lock)
            console.log(`[?�보] 고착?????�일(${LOCK_FILE})??발견?�여 ?�거?�니?? (?�전 ?�로?�스 종료??`);
            fs.removeSync(LOCK_FILE);
        }
    }

    try {
        fs.writeFileSync(LOCK_FILE, process.pid.toString());
        console.log(`\n[${new Date().toLocaleString()}] ?�� ?�율 ?�이???�작 (?�시???�차: ${retryCount}/3)...`);

        const child = spawn('node', ['run_autonomous.js'], {
            cwd: __dirname,
            stdio: 'inherit',
            shell: false,
            windowsHide: true // [FIX] ?�도?�에???�행 �??�전 ?�??        });

        child.on('close', async (code) => {
            if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);

            if (code !== 0) {
                console.error(`\n[${new Date().toLocaleString()}] ???�이??종료 (?�류 발생! Exit Code: ${code})`);
                
                if (retryCount < 3) {
                    const RETRY_DELAY = 30 * 60 * 1000; // 30�????�시??                    console.log(`[?�림] 30�??�에 ?�시?��? 진행?�니??.. (?�음 ?�시?? ${retryCount + 1}/3)`);
                    setTimeout(() => runCycle(retryCount + 1), RETRY_DELAY);
                } else {
                    await notificationService.sendAlert(
                        '?��?줄러 ?�율 ?�이???�애 (3???�시???�패)', 
                        `run_autonomous.js ?�로?�스가 반복?�으�??�러 코드(${code})?� ?�께 종료?�었?�니?? 로그�??�인??주세??`
                    );

                    // [?�제] ?�티그래비티 ?�출 ?�??로그 처리
                    console.error(`??[Critical] ?�이??반복 ?�패 - ?�스???��????�요?�니??`);
                }
            } else {
                console.log(`\n[${new Date().toLocaleString()}] ???�이??종료 (Exit Code: ${code})`);
                console.log(`[?��? ?�음 ?�규 ?�이?�까지 ?�식?�니??.. (${CYCLE_INTERVAL / 36e5}?�간 ???�행)`);
            }
        });

    } catch (err) {
        console.error(`???�이???�행 �?치명???�류:`, err.message);
        await notificationService.sendAlert('마스???��?줄러 치명???�류', `?��?줄러 ?�행 �??�외가 발생?�습?�다: ${err.message}`);
        if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);
    }
}

// 1. 즉시 �??�행
runCycle();

// 2. 주기??반복 ?�정
setInterval(runCycle, CYCLE_INTERVAL);

// ?�로?�스 종료 ?????�일 ?�거
process.on('SIGINT', () => {
    if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);
    process.exit();
});
process.on('SIGTERM', () => {
    if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);
    process.exit();
});
