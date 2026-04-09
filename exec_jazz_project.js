const { authorize, uploadVideo, getOrCreatePlaylist, addVideoToPlaylist, checkQuota } = require('./youtube_upload');
const { generateHybridContent } = require('./generate_1hour_loop');
const fs = require('fs-extra');
const path = require('path');

async function log(msg) {
    console.log(`[OZ EXEC] ${msg}`);
}

async function startJazzProject() {
    while (true) {
        log(`\n🚀 [OZ] JAZZ PROJECT 엔진 가동 중... (${new Date().toLocaleString()})`);
        try {
            log("=== [AI MUSIC AGENT OZ] OZ CAFE 재즈 프로젝트 가동 ===");

            // 1. 유튜브 인증 및 할당량 체크
            const auth = await authorize();
            const isQuotaAvailable = await checkQuota(auth);
            if (!isQuotaAvailable) {
                log("⚠️ [중단] 유튜브 API 할당량이 오늘 모두 소진되었습니다.");
                // 할당량 소진 시 1시간 대기 후 재시도
                await new Promise(r => setTimeout(r, 3600000));
                continue;
            }

            // 2. 재즈 컨텐츠 생성 (1960년대 비밥/블루스 스타일)
            log("🎵 [생성] 1960년대 재즈 무드 음악 및 영상 제작 시작...");
            const content = await generateHybridContent("OZ CAFE", true, 60, 10);

            // 3. 유튜브 업로드
            const now = new Date();
            const loopTime = new Date(now.getTime() + 5 * 60000).toISOString();
            const shortsTime = new Date(now.getTime() + 15 * 60000).toISOString();

            log(`📡 [업로드] 롱폼 컴필레이션 업로드 중: ${content.loop.title}`);
            const loopVideoId = await uploadVideo(auth, content.loop.path, content.thumbnail, content.loop.title, content.loop.description, content.loop.tags, loopTime);

            log(`📡 [업로드] 쇼츠 업로드 중: ${content.shorts.title}`);
            const shortsVideoId = await uploadVideo(auth, content.shorts.path, content.shorts.thumbnail || content.thumbnail, content.shorts.title, content.shorts.description, content.shorts.tags, shortsTime);

            // 4. 재생목록 연동 및 마무리 (생략 가능)
            log("🏆 [완료] 한 곡의 프로젝트 사이클이 완료되었습니다!");
            // 한 사이클 성공 후 10분 휴식 후 다음 곡 작업
            await new Promise(r => setTimeout(r, 600000));

        } catch (err) {
            console.error("❌ 프로젝트 중단:", err);
            log("⏱️ 60초 대기 후 자동으로 엔진을 재점화합니다...");
            await new Promise(r => setTimeout(r, 60000));
        }
    }
}

startJazzProject();
