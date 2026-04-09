const { execSync } = require('child_process');
const notificationService = require('./notification_service');
const { authorize, checkQuota } = require('./youtube_upload');
const fs = require('fs-extra');
const path = require('path');

/**
 * [AI MUSIC AGENT OZ] Health Check System
 * 시스템의 주요 구성 요소가 정상 작동 중인지 확인하고 보고합니다.
 */
async function runHealthCheck() {
    console.log(`\n[${new Date().toLocaleString()}] 🔍 시스템 상태 점검 개시...`);
    
    let statusReport = "";
    let isHealthy = true;

    // 1. PM2 프로세스 확인 (OZ_MASTER_SCHEDULER)
    try {
        const pm2List = execSync('npx pm2 jlist', { encoding: 'utf8' });
        const apps = JSON.parse(pm2List);
        const masterApp = apps.find(a => a.name === 'OZ_MASTER_SCHEDULER');
        
        if (masterApp && masterApp.pm2_env.status === 'online') {
            statusReport += "✅ [PM2] OZ_MASTER_SCHEDULER: 온라인 (정상)\n";
        } else {
            statusReport += "❌ [PM2] OZ_MASTER_SCHEDULER: 중단됨 또는 찾을 수 없음\n";
            isHealthy = false;
        }
    } catch (e) {
        statusReport += `⚠️ [PM2] 점검 중 오류 탐지: ${e.message}\n`;
        isHealthy = false;
    }

    // 2. 유튜브 API 및 인증 확인
    try {
        const auth = await authorize();
        const quotaOk = await checkQuota(auth);
        
        if (quotaOk) {
            statusReport += "✅ [YouTube] API 인증 및 할당량: 정상\n";
        } else {
            statusReport += "⚠️ [YouTube] API 할당량 소진됨 (내일 리셋 대기 중)\n";
        }
    } catch (e) {
        statusReport += `❌ [YouTube] 인증 오류 발생: ${e.message}\n`;
        isHealthy = false;
    }

    // 3. 디스크 공간 체크 (임시 파일 누수 확인)
    const tempDir = path.join(__dirname, 'temp_output');
    if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        if (files.length > 20) {
            statusReport += `⚠️ [Storage] 임시 파일(${files.length}개)이 많이 쌓여 있습니다. 정리가 필요할 수 있습니다.\n`;
        }
    }

    // 결과 전송
    if (isHealthy) {
        await notificationService.sendInfo("시스템 정기 점검 보고", statusReport);
    } else {
        await notificationService.sendAlert("시스템 이상 감지", statusReport);
    }

    console.log(`점검 완료: ${isHealthy ? '정상' : '이상 발견'}`);
}

if (require.main === module) {
    runHealthCheck().catch(console.error);
}
