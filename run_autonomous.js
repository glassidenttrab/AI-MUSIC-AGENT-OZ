const { authorize, uploadVideo, getOrCreatePlaylist, addVideoToPlaylist, postComment, checkQuota } = require('./youtube_upload');
const { generateHybridContent } = require('./generate_1hour_loop');
const promptEngineer = require('./prompt_engineer');
const fs = require('fs-extra');
const path = require('path');
const notificationService = require('./notification_service');

/**
 * 🔒 PROJECT ISOLATION GATE:
 * Reference only __dirname based paths. NEVER use relative paths to enter
 * neighbor directories like 'f:\ProJectHome\Ozpix_Instar_Arin'.
 */

/**
 * 전역 로깅 함수 (파일 및 콘솔 동시 출력)
 */
async function logToFile(message) {
    const logDir = path.join(__dirname, 'memory', 'logs');
    await fs.ensureDir(logDir);
    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `autonomous_${dateStr}.log`);
    const timestamp = new Date().toLocaleString();
    const formattedMessage = `[${timestamp}] ${message}\n`;
    
    process.stdout.write(formattedMessage);
    await fs.appendFile(logFile, formattedMessage);
}

/**
 * 2026 YouTube 트렌드를 분석하여 '가사곡'과 '연주곡' 2가지를 각각 생성하고,
 * 각 곡에 대해 '1시간 루프'와 '쇼츠' 버전을 만들어 총 4개의 영상을 예약 업로드합니다.
 */
async function runAutonomousCycle() {
    try {
        await logToFile(`=== [AI MUSIC AGENT OZ] 자율 전략 및 4중 통합 배포 모드 가동 ===`);

        // 1. 유튜브 인증
        const auth = await authorize();
        
        // 1.0 성과 분석 및 전략 최적화 (Feedback Loop - Start of Cycle)
        await logToFile(`🔎 [분석] 시작 전 성과 분석 엔진 가동 및 전략 최적화 중...`);
        try {
            const { execSync } = require('child_process');
            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
            const feedbackScript = path.join(__dirname, '.agent', 'tools', 'evaluate_feedback.py');
            execSync(`${pythonCmd} "${feedbackScript}"`, { encoding: 'utf8' });
            promptEngineer.reload(); // 신규 분석 결과 로드
            await logToFile(`✅ [최적화] 이전 성과를 바탕으로 오늘의 테마 생성 전략이 갱신되었습니다.`);
        } catch (e) {
            await logToFile(`⚠️ [경고] 성과 분석 중 경미한 오류 발생 (기존 데이터 사용): ${e.message}`);
        }

        // 1.1 유튜브 할당량 체크
        const isQuotaAvailable = await checkQuota(auth);
        if (!isQuotaAvailable) {
            await logToFile(`⚠️ [중단] 유튜브 API 할당량이 오늘 모두 소진되었습니다. 내일 다시 시도합니다.`);
            process.exit(0); // 중단이 아닌 예약 종료이므로 0 (또는 에러 없이 종료)
        }

        // 2. 전략 수립 (보컬과 연주곡용 두 테마를 서로 다르게 선정)
        const themeVocal = promptEngineer.selectOptimalTheme(0);
        const themeInst = promptEngineer.selectOptimalTheme(1);
        const targetMinutes = process.env.OZ_LOOP_MINUTES ? parseInt(process.env.OZ_LOOP_MINUTES) : 60;
        await logToFile(`🎯 테마 다변화 선정 완료: [VOCAL: ${themeVocal}] / [INST: ${themeInst}]`);

        // 3. 자율 생산 및 배포 사이클 (Vocal & Instrumental)
        const modes = [
            { isInst: false, type: "VOCAL", theme: themeVocal, offset: 0 },
            { isInst: true, type: "INSTRUMENTAL", theme: themeInst, offset: 3 }
        ];

        for (const mode of modes) {
            await logToFile(`[${mode.type} COMPILATION CYCLE] 제작 개시... 테마: ${mode.theme}`);
            
            // 10곡 합병 모드로 생성
            const content = await generateHybridContent(mode.theme, mode.isInst, targetMinutes, 10);
            
            // 업로드 예약 시간 설정 (ISO8601 형식)
            const getScheduledTime = (hours) => {
                const d = new Date();
                d.setHours(d.getHours() + hours);
                return d.toISOString();
            };

            // A. 컴필레이션 롱폼 업로드
            const loopSched = getScheduledTime(mode.offset);
            await logToFile(`📡 [롱폼 업로드 준비] ${content.vocalOrInst} Compilation | 예약 시각: ${loopSched}`);
            
            const loopVideoId = await uploadVideo(
                auth, 
                content.loop.path, 
                content.thumbnail, // 첫 번째 곡 기반 썸네일 사용
                content.loop.title, 
                content.loop.description, 
                content.loop.tags, 
                loopSched
            );

            // B. 쇼츠 업로드 (동일 테마의 첫 번째 곡 기준)
            const shortsSched = getScheduledTime(mode.offset + 1); 
            await logToFile(`📡 [쇼츠 업로드 준비] ${content.vocalOrInst} shorts | 예약 시각: ${shortsSched}`);
            
            const shortsVideoId = await uploadVideo(
                auth, 
                content.shorts.path, 
                content.shorts.thumbnail || content.thumbnail, 
                content.shorts.title, 
                content.shorts.description, 
                content.shorts.tags, 
                shortsSched
            );

            if (loopVideoId || shortsVideoId) {
                await logToFile(`📂 [재생목록 연동] 자동 분류 중...`);
                try {
                    const genre = content.components && content.components.genre ? content.components.genre : 'AI Music';
                    const playlistTitle = `[${genre}] AI Compilation (${mode.isInst ? 'Inst' : 'Vocal'})`;
                    
                    const playlistId = await getOrCreatePlaylist(auth, playlistTitle);
                    if (playlistId) {
                        if (loopVideoId) await addVideoToPlaylist(auth, loopVideoId, playlistId);
                        if (shortsVideoId) await addVideoToPlaylist(auth, shortsVideoId, playlistId);
                    }
                } catch (playlistErr) {
                    await logToFile(`⚠️ 재생목록 연동 중 오류 발생: ${playlistErr.message}`);
                }

                // [Viral Strategy] 자동 댓글 작성 (롱폼 우선)
                if (loopVideoId && content.metadata && content.metadata.pinnedCommentCandidate) {
                    await logToFile(`💬 [Engagement] 롱폼 영상에 자동 댓글 작성을 시도합니다.`);
                    await postComment(auth, loopVideoId, content.metadata.pinnedCommentCandidate);
                }

                await recordHistory(loopVideoId, shortsVideoId, content, loopSched);
            }
        }

        await logToFile(`🏆 [SUCCESS] OZ의 4중 자율 배포 사이클이 완수되었습니다.`);
        try {
            await (notificationService.sendInfo ? notificationService.sendInfo(
                '유튜브 업로드 및 사이클 완료',
                '🎉 오늘의 자율 음악 생성 및 유튜브 자동 업로드 작업(안전모드 컴필레이션 포함)이 모두 성공적으로 완료되었습니다.'
            ) : Promise.resolve());
        } catch (e) {}

    } catch (err) {
        await logToFile(`❌ 자율 사이클 중 치명적 오류 발생: ${err.toString()}`);
        if (err.stack) await logToFile(err.stack);
        
        try {
            await (notificationService.sendAlert ? notificationService.sendAlert(
                '자율 사이클(run_autonomous) 중단됨', 
                `실행 중 다음 에러가 발생하여 작업이 중단되었습니다: ${err.message}\n\n상세 정보: ${err.stack || '없음'}`
            ) : Promise.resolve());
        } catch (notifyErr) {
            console.error(`⚠️ 알림 발송 중 추가 오류 발생 (무시됨):`, notifyErr.message);
        }
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

    await fs.writeJson(memoryFile, history, { spaces: 4 });
    console.log(`[메모리] 업로드 이력이 저장되었습니다.`);
}

if (require.main === module) {
    runAutonomousCycle().catch(console.error);
}
