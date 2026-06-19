const { generateMusic } = require('../core/generate_music');
const promptEngineer = require('../core/prompt_engineer');
const { generateAIImage } = require('../core/make_thumb');
const { createSlideshowVideo, createShortsVideo, concatAudioFiles, getAudioDuration } = require('../core/make_video');
const path = require('path');
const fs = require('fs-extra');

/**
 * 1시간 이상의 컴필레이션 루프 영상과 쇼츠 영상을 동시에 생성합니다.
 * @param {string} baseTheme - 메인 테마 (예: "OZ CAFE")
 * @param {boolean} isInstrumental - 연주곡 여부
 * @param {number} targetMinutes - 목표 길이 (분)
 * @param {number} songCount - 루프 내 포함될 고유 곡 수
 */
async function generateHybridContent(baseTheme, isInstrumental = false, targetMinutes = 70, songCount = 5) {
    const themeId = baseTheme.replace(/\s+/g, '_');
    // [FIX] 같은 날짜라도 여러 번 실행될 경우를 대비해 타임스탬프를 추가하여 독립적인 루프 폴더 생성
    const dateTag = new Date().toISOString().split('T')[0]; // 예: 2026-04-20
    const runTimestamp = Date.now();
    const runId = `loop_${themeId}_${isInstrumental ? 'inst' : 'vocal'}_${dateTag}_${runTimestamp}`;
    const outputDir = path.join(__dirname, '../../loops', runId);
    await fs.ensureDir(outputDir);

    // [FIX] 오래된 루프 폴더 자동 정리 (7일 이전 폴더 삭제 → 디스크 절약)
    try {
        const loopsRoot = path.join(__dirname, '../../loops');
        const allDirs = await fs.readdir(loopsRoot);
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        for (const dir of allDirs) {
            const dirPath = path.join(loopsRoot, dir);
            const stat = await fs.stat(dirPath);
            if (stat.isDirectory() && stat.mtimeMs < sevenDaysAgo && dir.startsWith('loop_')) {
                console.log(`🧹 [Cleanup] 오래된 루프 폴더 정리: ${dir}`);
                await fs.remove(dirPath);
            }
        }
    } catch (cleanupErr) {
        console.warn(`⚠️ 루프 폴더 정리 중 오류(무시): ${cleanupErr.message}`);
    }

    console.log(`\n============== [OZ HYBRID COMPILATION RENDERER] ==============`);
    console.log(`🚀 Theme: ${baseTheme} (${isInstrumental ? 'INSTRUMENTAL' : 'VOCAL'})`);
    console.log(`🎵 Target: ${songCount} Songs / ~${targetMinutes} Minutes`);
    console.log(`📅 Date: ${dateTag} (NEW SESSION - NO CACHE)`);
    console.log(`📁 Path: ${outputDir}`);
    console.log(`==============================================================\n`);

    // [NEW] 작업 시작 전 임시 음악 디렉토리 정리 (이전 세션 잔재 제거)
    const musicDir = path.join(__dirname, '../../music', baseTheme);
    if (fs.existsSync(musicDir)) {
        console.log(`🧹 [Cleanup] 임시 음악 폴더 정리 중: ${musicDir}`);
        const files = await fs.readdir(musicDir);
        for (const file of files) {
            if (file.endsWith('.mp3')) await fs.remove(path.join(musicDir, file));
        }
    }

    const audioPaths = [];
    const tracklist = [];
    const detailedTracklist = []; // 고도화된 비디오 엔진을 위한 상세 데이터
    let accumulatedSeconds = 0;
    let storytellingTitle = "";
    let finalComponents = null;

    let initialShortsHook = "";
    let initialSEOTags = [];
    let lastTrackTime = 0;
    let consecutiveFailures = 0; // [서킷 브레이커] 연속 실패 트래커

    for (let i = 0; i < songCount; i++) {
        const currentTime = Date.now();
        const waitInterval = 180000; // 3분 (180,000ms)

        console.log(`\n[Song ${i + 1}/${songCount}] Checking track status...`);
        
        const audioFilename = `track_${i}.mp3`;
        const tempAudioPath = path.join(__dirname, '../../music', baseTheme, audioFilename);
        const finalTrackPath = path.join(outputDir, audioFilename);

        // [최적화] 파일이 이미 존재하면 API 호출 없이 정보를 복원하거나 최소 작업만 수행
        // 단, 첫 번째 트랙(i=0)은 변별력을 위해 가능한 한 메타데이터를 새로 확인합니다.
        if (fs.existsSync(finalTrackPath)) {
            console.log(`✅ [SKIP] 트랙 ${i + 1}이 이미 존재합니다. 캐시 데이터 로드 중...`);
            
            // [개선] 기존 metadata.json이 있으면 거기서 정보를 가져오고, 없으면 최소 메타데이터 생성
            let trackTitle = "";
            let components, shortsHook, seoTags;

            const existingMetaPath = path.join(outputDir, 'metadata.json');
            if (fs.existsSync(existingMetaPath)) {
                try {
                    const oldMeta = await fs.readJson(existingMetaPath);
                    if (oldMeta.tracks && oldMeta.tracks[i]) {
                        trackTitle = oldMeta.tracks[i].title;
                        components = oldMeta.components;
                        shortsHook = oldMeta.shortsHook;
                        seoTags = oldMeta.seoTags;
                    }
                } catch (e) {}
            }

            if (!trackTitle) {
                const minimal = await promptEngineer.generateMinimalMetadata(i, isInstrumental, baseTheme);
                trackTitle = minimal.storytellingTitle;
                components = minimal.components;
                shortsHook = minimal.shortsHook;
                seoTags = minimal.seoTags;
            }
            
            if (i === 0 || !finalComponents) {
                storytellingTitle = trackTitle;
                finalComponents = components;
                finalComponents.storytellingTitle = storytellingTitle; // 유튜브 제목 구별을 위해 추가
                initialShortsHook = shortsHook;
                initialSEOTags = seoTags;
            }

            audioPaths.push(finalTrackPath);
            const duration = await getAudioDuration(finalTrackPath);
            const mm = Math.floor(accumulatedSeconds / 60);
            const ss = Math.floor(accumulatedSeconds % 60);
            const timestamp = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
            
            tracklist.push(`${timestamp} ${trackTitle}`);
            detailedTracklist.push({ title: trackTitle, startTime: accumulatedSeconds, duration });
            
            accumulatedSeconds += duration;
            continue;
        }


        // [엄격한 대기] 실제 API 호출(프롬프트 분석 + 음악 생성)이 필요한 경우 3분 간격 강제
        if (lastTrackTime > 0) {
            const elapsedTime = Date.now() - lastTrackTime;
            if (elapsedTime < waitInterval) {
                const remainingWait = waitInterval - elapsedTime;
                console.log(`⏱️ [할당량 관리] 다음 작업을 위해 ${Math.ceil(remainingWait/1000)}초간 대기합니다 (3분 규칙)...`);
                await new Promise(r => setTimeout(r, remainingWait));
            }
        }

        const { fullPrompt, lyrics, storytellingTitle: trackTitle, shortsHook, seoTags, components } = await promptEngineer.generateStructuredPrompt(i, isInstrumental, baseTheme);
        
        if (i === 0 || !finalComponents) {
            storytellingTitle = trackTitle; 
            finalComponents = components;
            finalComponents.storytellingTitle = storytellingTitle; // 유튜브 제목 구별을 위해 추가
            initialShortsHook = shortsHook;
            initialSEOTags = seoTags;
        }


        let trackSuccess = false;
        let trackRetry = 0;
        const MAX_TRACK_RETRY = 3; // [안정화] 5 -> 3으로 감소하여 요금 폭탄 방지

        while (!trackSuccess && trackRetry < MAX_TRACK_RETRY) {
            try {
                trackRetry++;
                
                // [안정화] 생성 전 임시 파일이 있다면 확실히 제거 (중복 방지)
                if (fs.existsSync(tempAudioPath)) await fs.remove(tempAudioPath);

                await generateMusic(fullPrompt, audioFilename, 180, lyrics, baseTheme); 
                
                if (fs.existsSync(tempAudioPath)) {
                    await fs.move(tempAudioPath, finalTrackPath, { overwrite: true });
                    audioPaths.push(finalTrackPath);
                    
                    const duration = await getAudioDuration(finalTrackPath);
                    const mm = Math.floor(accumulatedSeconds / 60);
                    const ss = Math.floor(accumulatedSeconds % 60);
                    const timestamp = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
                    
                    tracklist.push(`${timestamp} ${trackTitle}`);
                    detailedTracklist.push({ title: trackTitle, startTime: accumulatedSeconds, duration });
                    accumulatedSeconds += duration;

                    console.log(`✅ Track ${i + 1} 생성 완료: ${timestamp} (${trackTitle})`);
                    trackSuccess = true;
                    lastTrackTime = Date.now(); // 성공 시점에 타임스탬프 갱신
                }
            } catch (err) {
                console.error(`⚠️ Track ${i + 1} 시도 ${trackRetry}/${MAX_TRACK_RETRY} 실패: ${err.message}`);
                
                if (err.message === "QUOTA_EXHAUSTED_ALL_KEYS") {
                    throw err;
                }

                if (err.message.includes("429") || err.message.includes("exhausted")) {
                    console.log("⏱️ [429 감지] 180초(3분) 즉시 대기 후 재시도...");
                    await new Promise(r => setTimeout(r, 180000));
                } else {
                    const backoffTime = Math.pow(2, trackRetry) * 5000; // 지수 백오프: 10s -> 20s -> 40s
                    console.log(`⏱️ 에러 감지. ${backoffTime/1000}초 지수 백오프 대기 후 재시도...`);
                    await new Promise(r => setTimeout(r, backoffTime));
                }
            }
        }

        // [서킷 브레이커 로직]
        if (!trackSuccess) {
            consecutiveFailures++;
            console.error(`🚨 [Circuit Breaker] 트랙 ${i + 1} 최종 실패. (연속 실패: ${consecutiveFailures}/2)`);
            if (consecutiveFailures >= 2) {
                const lockPath = path.join(__dirname, '../../reports/circuit_breaker.lock');
                await fs.ensureDir(path.dirname(lockPath));
                await fs.writeFile(lockPath, `Circuit breaker tripped at ${new Date().toISOString()} due to multiple critical failures.`);
                throw new Error("CRITICAL_CIRCUIT_BREAKER_TRIPPED: 연속적인 치명적 에러 발생으로 과금 보호를 위해 시스템을 강제 종료합니다.");
            }
        } else {
            consecutiveFailures = 0; // 성공 시 초기화
        }
    }

    if (audioPaths.length === 0) throw new Error("음원이 하나도 생성되지 않았습니다.");

    // 2. 오디오 최종 병합
    let totalSeconds = 0;
    for (const p of audioPaths) {
        totalSeconds += await getAudioDuration(p);
    }
    
    let finalAudioList = [...audioPaths];
    let finalDetailedTracklist = [...detailedTracklist];
    
    while (totalSeconds < (targetMinutes * 60) && totalSeconds > 0) {
        console.log(`⏱️ Current Total: ${Math.floor(totalSeconds/60)}m. Repeating set to reach ${targetMinutes}m...`);
        for (let idx = 0; idx < audioPaths.length; idx++) {
            const p = audioPaths[idx];
            const meta = detailedTracklist[idx];
            
            finalAudioList.push(p);
            const duration = await getAudioDuration(p);
            finalDetailedTracklist.push({ 
                title: meta.title, 
                startTime: totalSeconds, 
                duration 
            });
            totalSeconds += duration;
        }
    }

    const masterAudioPath = path.join(outputDir, `master_audio.mp3`);
    await concatAudioFiles(finalAudioList, masterAudioPath);

    // 3. 비주얼 생성 (캐시 적용)
    const backgroundImages = [];
    
    // 테마별 시각화 설정 로드
    let visualStyle = "Cinematic Masterpiece";
    let colorPalette = "vibrant colors";
    
    // [FIX] finalComponents가 없을 경우를 대비한 안전 코드 추가
    if (!finalComponents) {
        finalComponents = { theme: baseTheme, genre: "Background", mood: "Atmospheric", vibe: "aesthetic atmosphere" };
    }
    
    let themeVibe = finalComponents.vibe || "aesthetic atmosphere";
    
    try {
        if (promptEngineer && typeof promptEngineer.getVisualConfig === 'function') {
            const visualConfig = promptEngineer.getVisualConfig(finalComponents.theme);
            if (visualConfig) {
                visualStyle = visualConfig.style || visualStyle;
                colorPalette = visualConfig.colorPalette ? visualConfig.colorPalette.join(", ") : colorPalette;
                if (promptEngineer.themes && promptEngineer.themes[finalComponents.theme]) {
                    themeVibe = promptEngineer.themes[finalComponents.theme].vibe || themeVibe;
                }
            }
        }
    } catch(e) {
        console.warn("⚠️ Visual Config 로드 실패. 기본 테마를 사용합니다.");
    }

    const dynamicAngles = [
        "A wide establishing shot with panoramic view",
        "A cinematic medium shot with beautiful depth of field",
        "A hyper-realistic close-up focusing on intricate textures"
    ];

    for (let j = 0; j < 3; j++) {
        const bgPath = path.join(outputDir, `background_${j}.png`);
        if (fs.existsSync(bgPath)) {
            console.log(`✅ [SKIP] 이미지 ${j + 1}이 이미 존재합니다.`);
        } else {
            console.log(`🎨 [Visual] Artwork ${j+1}/3 [image-pro] 프롬프트 설계 및 생성 중...`);
            
            // 트랙 제목을 프롬프트에 추가하여 매번 다른 썸네일 이미지가 생성되도록 유도
            const basicVisualIdea = `Cinematic artwork for ${finalComponents.theme} inspired by the track "${storytellingTitle}", showing ${dynamicAngles[j].toLowerCase()}. ${themeVibe}. Color Palette: ${colorPalette}.`;
            const visualPrompt = await promptEngineer.generateImageProPrompt(basicVisualIdea, finalComponents.theme);
            
            await generateAIImage(visualPrompt, bgPath, false, finalComponents.theme);
        }
        backgroundImages.push(bgPath);
    }

    // 4. 컴필레이션 비디오 렌더링
    const sanitizedTitle = storytellingTitle.replace(/[^\wㄱ-ㅎㅏ-ㅣ가-힣.-]/g, '_');
    const loopVideoPath = path.join(outputDir, `${sanitizedTitle}_Compilation.mp4`);
    
    if (!fs.existsSync(loopVideoPath)) {
        console.log(`🎬 [Video] 1시간 컴필레이션 렌더링 시작 (메타데이터 포함)...`);
        await createSlideshowVideo(backgroundImages, masterAudioPath, loopVideoPath, 30, finalDetailedTracklist);
    }

    // 5. 쇼츠용 별도 비주얼 및 영상 생성 (캐시 적용)
    const shortsVisual = path.join(outputDir, 'shorts_background.png');
    if (!fs.existsSync(shortsVisual)) {
        console.log(`🎨 [Shorts] 세로형 아트워크 생성 중...`);
        const shortsPrompt = `${visualStyle}, Theme: ${finalComponents.theme}, Vibe: ${themeVibe}, Color Palette: ${colorPalette}, vertical mobile wallpaper format, 8k masterpiece.`;
        await generateAIImage(shortsPrompt, shortsVisual, true, finalComponents.theme);
    }
    
    const shortsVideoPath = path.join(outputDir, `${sanitizedTitle}_Shorts.mp4`);
    if (!fs.existsSync(shortsVideoPath)) {
        await createShortsVideo(audioPaths[0], shortsVisual, shortsVideoPath, 30, initialShortsHook);
    }

    const ugcEncouragement = "✨ Feel free to use this audio in your Shorts! Tag @OZ and share your creativity with the world.";
    let engagementQuestion = "오늘의 이 음악은 당신에게 어떤 풍경을 떠올리게 하나요? ✨";
    try {
        if (promptEngineer && typeof promptEngineer.generateEngagementQuestion === 'function') {
            engagementQuestion = await promptEngineer.generateEngagementQuestion();
        }
    } catch (err) {
        console.error(`❌ [Error] 참여 질문 생성 중 오류 발생:`, err.message);
    }

    const tracklistText = tracklist.join('\n');
    const finalDescription = `Full immersive audio experience curated by AI Music Agent [OZ].\n\n${ugcEncouragement}\n\nTheme: ${baseTheme}\n\n[Tracklist]\n${tracklistText}\n\n${engagementQuestion}\n\n#OZ #Music #AI #Soundscape #Healing`;

    const metadata = {
        runId,
        theme: baseTheme,
        genre: finalComponents ? finalComponents.genre : "Various",
        mood: finalComponents ? finalComponents.mood : "Balanced",
        vocalOrInst: isInstrumental ? 'instrumental' : 'vocal',

        tracklist,
        tracks: detailedTracklist, // 세부 트랙 객체 리스트 추가
        shortsHook: initialShortsHook,
        seoTags: initialSEOTags,
        pinnedCommentCandidate: engagementQuestion,
        timestamp: new Date().toISOString()
    };
    await fs.writeJson(path.join(outputDir, 'metadata.json'), metadata, { spaces: 4 });

    return {
        vocalOrInst: isInstrumental ? 'instrumental' : 'vocal',
        loop: {
            path: loopVideoPath,
            title: promptEngineer.generateViralTitle(finalComponents),
            description: finalDescription,
            tags: initialSEOTags
        },
        shorts: {
            path: shortsVideoPath,
            title: (storytellingTitle + " | #Shorts #OZ #AI").substring(0, 100),
            description: `Quick vibe by AI Music Agent [OZ].\n\n${initialShortsHook}\n\n#Shorts #OZ #Music #AI`,
            tags: ["Shorts", "OzAgent", ...initialSEOTags.slice(0, 3)]
        },
        thumbnail: backgroundImages[0],
        audioPaths: audioPaths, // 원본 오디오 경로 리스트 추가
        components: finalComponents,
        metadata: metadata
    };
}

if (require.main === module) {
    const theme = process.argv[2] || "OZ CAFE";
    generateHybridContent(theme, true, 60, 10).catch(console.error); 
}

module.exports = { generateHybridContent };
