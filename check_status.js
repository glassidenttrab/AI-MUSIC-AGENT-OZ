const { authorize, checkQuota } = require('./src/core/youtube_upload');
const { execSync } = require('child_process');

async function check() {
    console.log("=== 시스템 상태 보고 ===");
    
    // PM2 상태
    try {
        const pm2List = execSync('npx pm2 jlist', { encoding: 'utf8' });
        const apps = JSON.parse(pm2List);
        console.log(`[PM2 프로세스 갯수]: ${apps.length}`);
        apps.forEach(app => {
            console.log(` - ${app.name}: ${app.pm2_env.status}`);
        });
        if (apps.length === 0) {
            console.log(" - 현재 실행 중인 PM2 프로세스가 없습니다.");
        }
    } catch (e) {
        console.log(`[PM2 에러]: ${e.message}`);
    }

    // 유튜브 쿼터
    try {
        const auth = await authorize();
        const quotaOk = await checkQuota(auth, 3500); // 3500 또는 적절한 수치로 체크
        console.log(`\n[YouTube API 할당량]: ${quotaOk ? "✅ 사용 가능 (충분)" : "⚠️ 소진됨 또는 부족"}`);
    } catch (e) {
        console.log(`\n[YouTube API 에러]: ${e.message}`);
    }
}

check().catch(console.error);
