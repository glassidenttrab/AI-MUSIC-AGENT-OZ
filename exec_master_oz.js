const https = require('https');
require('dotenv').config();

const { authorize, uploadVideo, checkQuota } = require('./youtube_upload');
const { generateHybridContent } = require('./generate_1hour_loop');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * 텔레그램 알림 발송 유틸리티
 */
async function sendTelegram(message) {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(message)}`;
    return new Promise((resolve) => {
        https.get(url, (res) => resolve(true)).on('error', (e) => {
            console.error("⚠️ [Telegram] 발송 실패:", e.message);
            resolve(false);
        });
    });
}

/**
 * [MASTER OZ SERIAL ENGINE]
 * 모든 프로젝트를 병렬이 아닌 '직렬'로 하나씩 순차 실행합니다.
 */
async function startMasterProject() {
    console.log(`\n🚀 [MASTER OZ] 지능형 직렬 엔진 가동 시작... (Date: ${new Date().toLocaleString()})`);
    console.log(`==============================================================`);

    try {
        const auth = await authorize();
        const isQuotaAvailable = await checkQuota(auth);
        
        if (!isQuotaAvailable) {
            const msg = "⚠️ [중단] 유튜브 API 할당량이 부족합니다. 1시간 대기 후 재점화합니다.";
            console.log(msg);
            await sendTelegram(msg);
            setTimeout(startMasterProject, 3600000);
            return;
        }

        // Phase 1: Jazz instrumental (연주곡) 5곡 생성 및 업로드 (안정성 최적화)
        console.log(`\n🎻 [PHASE 1] Jazz 연주곡 프로젝트 대장정 시작...`);
        const instContent = await generateHybridContent("OZ CAFE", true, 60, 5);
        
        console.log(`📡 [업로드] 연주곡 컴필레이션 업로드 중...`);
        await uploadVideo(auth, instContent.loop.path, instContent.thumbnail, instContent.loop.title, instContent.loop.description, instContent.loop.tags);
        await sendTelegram(`✅ [성공] OZ CAFE 연주곡 프로젝트 완료 및 업로드됨! (5곡 루프)`);

        // Phase 2: Jazz Vocal (보컬곡) 5곡 생성 및 업로드 (안정성 최적화)
        console.log(`\n🎤 [PHASE 2] Jazz 보컬곡 프로젝트 대장정 시작...`);
        const vocalContent = await generateHybridContent("OZ CAFE", false, 60, 5);

        console.log(`📡 [업로드] 보컬곡 컴필레이션 업로드 중...`);
        await uploadVideo(auth, vocalContent.loop.path, vocalContent.thumbnail, vocalContent.loop.title, vocalContent.loop.description, vocalContent.loop.tags);
        await sendTelegram(`✅ [성공] OZ CAFE 보컬곡 프로젝트 완료 및 업로드됨! (5곡 루프)`);

        console.log(`\n🎊 [MASTER OZ] 모든 직렬 작업이 성공적으로 종료되었습니다.`);
        setTimeout(startMasterProject, 600000);

    } catch (error) {
        if (error.message === "QUOTA_EXHAUSTED_ALL_KEYS") {
            const apiKeysCount = (process.env.GEMINI_API_KEY || "").split(',').filter(k => k.trim()).length;
            const msg = `🚨 [비상] 가용 API 키(${apiKeysCount}개)가 모두 일일 할당량을 소진했습니다! 1시간 동안 휴식합니다. (키가 부족하여 정체가 심하면 .env에 키를 추가해 주세요!)`;
            console.error(`\n${msg}`);
            await sendTelegram(msg);
            setTimeout(startMasterProject, 3600000); // 1시간 대기
        } else {
            console.error(`\n❌ [MASTER OZ] 오류 발생:`, error.message);
            await sendTelegram(`⚠️ [OZ 장애] 시스템에 예외가 발생했습니다: ${error.message}`);
            console.log(`🔄 300초(5분) 명상 후 마스터 엔진 자동 재시작 시도...`);
            setTimeout(startMasterProject, 300000); // 일반 오류는 5분 대기
        }
    }
}

// [초안전 장인 모드] 마스터 엔진 점화 유예 로직
(async () => {
    console.log(`\n============== [MASTER OZ 엔진 시동] ==============`);
    console.log(`🎷 전략: 초안전 장인 모드 (3시간 휴식 후 15분 간격 작곡)`);
    console.log(`⏰ 가동 예정 시간: 3시간 뒤 (약 12:30 PM)`);
    console.log(`====================================================\n`);

    // [휴가 모드] 내일 오전 7시까지 휴식하도록 설정
    const now = new Date();
    const target = new Date();
    target.setHours(7, 0, 0, 0);
    // 만약 이미 오전 7시가 넘었다면 내일 오전 7시로 설정
    if (now.getHours() >= 7) {
        target.setDate(target.getDate() + 1);
    }
    const THREE_HOURS = target - now; 
    let remaining = THREE_HOURS;
    
    while (remaining > 0) {
        const minutesLeft = Math.ceil(remaining / (60 * 1000));
        process.stdout.write(`\r💤 [초안전 모드] 할당량 회복 중... 깨어나기까지 약 ${minutesLeft}분 남았습니다.        `);
        await new Promise(r => setTimeout(r, 60000));
        remaining -= 60000;
    }

    console.log(`\n\n🔔 [알람] 3시간의 딥 슬립이 끝났습니다! 엔진을 본격적으로 가동합니다! 🎷🚀`);
    await startMasterProject();
})();
