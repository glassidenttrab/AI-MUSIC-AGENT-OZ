const { authorize, uploadVideo, getOrCreatePlaylist, addVideoToPlaylist, checkQuota } = require('../youtube_upload');
const { generateHybridContent } = require('../generate_1hour_loop');
const fs = require('fs-extra');
const path = require('path');
const notificationService = require('../notification_service');

async function logToFile(message) {
    const logDir = path.join(__dirname, '..', 'memory', 'logs');
    await fs.ensureDir(logDir);
    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `manual_schedule_1_${dateStr}.log`);
    const timestamp = new Date().toLocaleString();
    const formattedMessage = `[${timestamp}] ${message}\n`;
    process.stdout.write(formattedMessage);
    await fs.appendFile(logFile, formattedMessage);
}

async function runScheduleOne() {
    try {
        await logToFile(`=== [AI MUSIC AGENT OZ] 수동 실행: 스케줄 1번 (OZ CAFE) 개시 ===`);

        const auth = await authorize();
        const isQuotaAvailable = await checkQuota(auth);
        if (!isQuotaAvailable) {
            await logToFile(`⚠️ [중단] 유튜브 API 할당량이 부족합니다.`);
            return;
        }

        const optimalTheme = "OZ CAFE"; // 스케줄 1번 강제 지정
        const targetMinutes = 60;
        await logToFile(`🎯 테마 강제 지정: ${optimalTheme}`);

        // 1. 콘텐츠 제작 (Vocal) - 스케줄 1번은 보컬 루프 영상으로 시작
        await logToFile(`[VOCAL CYCLE] 콘텐츠 제작 개시...`);
        const content = await generateHybridContent(optimalTheme, false, targetMinutes);

        // 즉시 공개를 위해 과거 시간 설정 (1분 전)
        const immediateTime = new Date(Date.now() - 60000).toISOString();

        // A. 1시간 루프 업로드
        await logToFile(`📡 [롱폼 업로드 시작] ${content.loop.title}`);
        const loopVideoId = await uploadVideo(
            auth, 
            content.loop.path, 
            content.thumbnail, 
            content.loop.title, 
            content.loop.description, 
            content.loop.tags, 
            immediateTime // 즉시 공개 유도
        );

        // B. 쇼츠 업로드
        await logToFile(`📡 [쇼츠 업로드 시작] ${content.shorts.title}`);
        const shortsVideoId = await uploadVideo(
            auth, 
            content.shorts.path, 
            content.thumbnail, 
            content.shorts.title, 
            content.shorts.description, 
            content.shorts.tags, 
            immediateTime // 즉시 공개 유도
        );

        if (loopVideoId || shortsVideoId) {
            await logToFile(`📂 [재생목록 연동] 카테고리: OZ CAFE...`);
            const playlistTitle = "[OZ] | Cafe & Study | - Cozy Lofi House & Jazz 🎧";
            const playlistId = await getOrCreatePlaylist(auth, playlistTitle);
            
            if (playlistId) {
                if (loopVideoId) await addVideoToPlaylist(auth, loopVideoId, playlistId);
                if (shortsVideoId) await addVideoToPlaylist(auth, shortsVideoId, playlistId);
                await logToFile(`✅ 재생목록 연동 완료: ${playlistTitle}`);
            }
        }

        await logToFile(`🏆 [SUCCESS] 스케줄 1번(OZ CAFE) 작업이 성공적으로 완료되었습니다.`);
        console.log(`\nLoop URL: https://youtu.be/${loopVideoId}`);
        console.log(`Shorts URL: https://youtu.be/${shortsVideoId}`);

    } catch (err) {
        await logToFile(`❌ 작업 중 오류 발생: ${err.toString()}`);
        console.error(err);
    }
}

runScheduleOne();
