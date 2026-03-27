const { authorize } = require('./youtube_upload');
const { uploadVideo } = require('./youtube_upload');
const { generateHybridContent } = require('./generate_1hour_loop');
const promptEngineer = require('./prompt_engineer');
const fs = require('fs-extra');
const path = require('path');

/**
 * 2026 YouTube 트렌드를 분석하여 '가사곡'과 '연주곡' 2가지를 각각 생성하고,
 * 각 곡에 대해 '1시간 루프'와 '쇼츠' 버전을 만들어 총 4개의 영상을 예약 업로드합니다.
 */
async function runAutonomousCycle() {
    try {
        console.log(`\n[AI MUSIC AGENT OZ] === 자율 전략 및 4중 통합 배포 모드 가동 ===`);

        // 1. 유튜브 인증
        const auth = await authorize();

        // 2. 전략 수립 (최적의 테마 선정)
        const optimalTheme = promptEngineer.selectOptimalTheme();
        const targetMinutes = process.env.OZ_LOOP_MINUTES ? parseInt(process.env.OZ_LOOP_MINUTES) : 60;

        // 3. 자율 생산 및 배포 사이클 (Vocal & Instrumental)
        const modes = [
            { isInst: false, type: "VOCAL", offset: 0 },
            { isInst: true, type: "INSTRUMENTAL", offset: 2 } // 2시간 간격
        ];

        for (const mode of modes) {
            console.log(`\n[${mode.type} CYCLE] 콘텐츠 제작 개시...`);
            const content = await generateHybridContent(optimalTheme, mode.isInst, targetMinutes);
            
            // 업로드 예약 시간 설정 (ISO8601 형식)
            const getScheduledTime = (hours) => {
                const d = new Date();
                d.setHours(d.getHours() + hours);
                return d.toISOString();
            };

            // A. 1시간 루프 업로드
            console.log(`\n📡 [롱폼 업로드] ${content.vocalOrInst} loop...`);
            const loopSched = getScheduledTime(mode.offset);
            const loopVideoId = await uploadVideo(
                auth, 
                content.loop.path, 
                content.thumbnail, 
                content.loop.title, 
                content.loop.description, 
                content.loop.tags, 
                loopSched
            );

            // B. 쇼츠 업로드
            console.log(`\n📡 [쇼츠 업로드] ${content.vocalOrInst} shorts...`);
            const shortsSched = getScheduledTime(mode.offset + 1); // 롱폼 1시간 뒤 쇼츠 업로드
            const shortsVideoId = await uploadVideo(
                auth, 
                content.shorts.path, 
                content.thumbnail, 
                content.shorts.title, 
                content.shorts.description, 
                content.shorts.tags, 
                shortsSched
            );

            if (loopVideoId || shortsVideoId) {
                await recordHistory(loopVideoId, shortsVideoId, content, loopSched);
            }
        }

        console.log(`\n🏆 [SUCCESS] OZ의 4중 자율 배포 사이클이 완수되었습니다.`);

    } catch (err) {
        console.error(`\n❌ 자율 사이클 중 치명적 오류 발생:`, err.message);
        process.exit(1);
    }
}

async function recordHistory(loopId, shortsId, content, scheduledTime) {
    const memoryDir = path.join(__dirname, '.agent', 'memory');
    const memoryFile = path.join(memoryDir, 'upload_history.json');
    await fs.ensureDir(memoryDir);

    let history = [];
    if (fs.existsSync(memoryFile)) {
        try { history = await fs.readJson(memoryFile); } catch (e) { history = []; }
    }

    const baseRecord = {
        timestamp: new Date().toISOString(),
        status: "published",
        metadata: {
            theme: content.components.theme,
            genre: content.components.genre,
            prompt: content.fullPrompt,
            publish_at: scheduledTime
        }
    };

    if (loopId) history.push({ ...baseRecord, video_id: loopId, type: "Longform", title: content.loop.title });
    if (shortsId) history.push({ ...baseRecord, video_id: shortsId, type: "Shorts", title: content.shorts.title });

    await fs.writeJson(memoryFile, history, { spaces: 4 });
    console.log(`[메모리] 업로드 이력이 저장되었습니다.`);

    // 피드백 루프 가동
    const { execSync } = require('child_process');
    try {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const feedbackScript = path.join(__dirname, '.agent', 'tools', 'evaluate_feedback.py');
        execSync(`${pythonCmd} "${feedbackScript}"`, { encoding: 'utf8' });
        console.log(`🔎 [피드백] 성과 분석 엔진 동기화 완료.`);
    } catch (e) {}
}

if (require.main === module) {
    runAutonomousCycle().catch(console.error);
}
