const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const notificationService = require('../core/notification_service');
const net = require('net');

/**
 * [AI MUSIC AGENT OZ] Master Scheduler
 * CONFIDENTIAL: confide all activities within AI-MUSIC-AGENT-OZ scope.
 */

// 24 hours interval
const CYCLE_INTERVAL = 24 * 60 * 60 * 1000; 
const LOCK_FILE = path.join(__dirname, 'master.lock');

console.log(`\n==================================================`);
console.log(`🚀 [AI MUSIC AGENT OZ] Always-ON Active Mode`);
console.log(`⏱️ Schedule: Every 24 hours (1 Cycle/Day)`);
console.log(`==================================================\n`);

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

const MAX_INFRA_WAIT = 10; 

async function runCycle(retryCount = 0) {
    const imageProvider = (process.env.IMAGE_PROVIDER || 'gemini-flash').toLowerCase();
    
    if (imageProvider === 'comfy') {
        console.log(`\n🩺 [Health Check] Checking ComfyUI...`);
        let infraWait = 0;
        let isComfyUp = await checkPort(8188);

        while (!isComfyUp) {
            infraWait++;
            if (infraWait > MAX_INFRA_WAIT) {
                console.error(`❌ [Critical] ComfyUI failed to respond after ${MAX_INFRA_WAIT} retries. Skipping cycle.`);
                return;
            }
            console.log(`⚠️ ComfyUI Down. Waiting 30s for recovery... (${infraWait}/${MAX_INFRA_WAIT})`);
            await new Promise(r => setTimeout(r, 30000));
            isComfyUp = await checkPort(8188);
        }
        console.log(`✅ [Success] ComfyUI is UP.`);
    }

    if (fs.existsSync(LOCK_FILE)) {
        try {
            const oldPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'));
            process.kill(oldPid, 0); 
            console.log(`[Warning] Previous cycle (PID: ${oldPid}) is still running. Skipping.`);
            return;
        } catch (e) {
            console.log(`[Info] Stale lock file removed.`);
            fs.removeSync(LOCK_FILE);
        }
    }

    try {
        fs.writeFileSync(LOCK_FILE, process.pid.toString());
        console.log(`\n[${new Date().toLocaleString()}] Starting Autonomous Cycle (Retry: ${retryCount}/3)...`);

        const child = spawn('node', ['run_autonomous.js'], {
            cwd: __dirname,
            stdio: 'inherit',
            shell: false,
            windowsHide: true
        });

        child.on('close', async (code) => {
            if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);

            if (code !== 0) {
                console.error(`\n[${new Date().toLocaleString()}] ❌ Cycle Terminated (Exit Code: ${code})`);
                
                if (code === 99) {
                    console.error(`🚨 [Circuit Breaker] 서킷 브레이커 발동 감지. 과금 방지를 위해 반복 재시도를 전면 중단합니다.`);
                    return;
                }

                if (retryCount < 3) {
                    const RETRY_DELAY = 30 * 60 * 1000; 
                    console.log(`[Notification] Retrying in 30 minutes... (${retryCount + 1}/3)`);
                    setTimeout(() => runCycle(retryCount + 1), RETRY_DELAY);
                } else {
                    console.error(`❌ [Critical] Cycle failed repeatedly. System check required.`);
                }
            } else {
                console.log(`\n[${new Date().toLocaleString()}] ✅ Cycle Completed Successfully.`);
                console.log(`[Wait] Resting until next cycle... (${CYCLE_INTERVAL / 36e5} hours)`);
            }
        });

    } catch (err) {
        console.error(`❌ Fatal Error during cycle execution:`, err.message);
        if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);
    }
}

// 1. Initial Execution
runCycle();

// 2. Periodic Repetition
setInterval(runCycle, CYCLE_INTERVAL);

// Cleanup on exit
process.on('SIGINT', () => {
    if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);
    process.exit();
});
process.on('SIGTERM', () => {
    if (fs.existsSync(LOCK_FILE)) fs.removeSync(LOCK_FILE);
    process.exit();
});
