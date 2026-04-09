const { generateMusic } = require('./generate_music');
const promptEngineer = require('./prompt_engineer');
const { generateAIImage } = require('./make_thumb');
const { createSlideshowVideo, createShortsVideo, concatAudioFiles, getAudioDuration } = require('./make_video');
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
    const runId = `loop_${themeId}_${isInstrumental ? 'inst' : 'vocal'}`;
    const outputDir = path.join(__dirname, 'loops', runId);
    await fs.ensureDir(outputDir);

    console.log(`\n============== [OZ HYBRID COMPILATION RENDERER] ==============`);
    console.log(`🚀 Theme: ${baseTheme} (${isInstrumental ? 'INSTRUMENTAL' : 'VOCAL'})`);
    console.log(`🎵 Target: ${songCount} Songs / ~${targetMinutes} Minutes`);
    console.log(`📁 Path: ${outputDir} (RESUME ENABLED)`);
    console.log(`==============================================================\n`);

    const audioPaths = [];
    const tracklist = [];
    const detailedTracklist = []; // 고도화된 비디오 엔진을 위한 상세 데이터
    let accumulatedSeconds = 0;
    let storytellingTitle = "";
    let finalComponents = null;

    // 1. 다중 음원 생성 루프
    let initialShortsHook = "";
    let initialSEOTags = [];

    for (let i = 0; i < songCount; i++) {
        console.log(`\n[Song ${i + 1}/${songCount}] Checking track status...`);
        const { fullPrompt, lyrics, storytellingTitle: trackTitle, shortsHook, seoTags, components } = promptEngineer.generateStructuredPrompt(i, isInstrumental, baseTheme);
        
        if (i === 0) {
            storytellingTitle = trackTitle; 
            finalComponents = components;
            initialShortsHook = shortsHook;
            initialSEOTags = seoTags;
        }

        const audioFilename = `track_${i}.mp3`;
        const tempAudioPath = path.join(__dirname, 'music', baseTheme, audioFilename);
        const finalTrackPath = path.join(outputDir, audioFilename);

        if (fs.existsSync(finalTrackPath)) {
            console.log(`✅ [SKIP] 트랙 ${i + 1}이 이미 존재합니다. API 호출을 생략합니다.`);
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

        let trackSuccess = false;
        let trackRetry = 0;
        const MAX_TRACK_RETRY = 5;

        while (!trackSuccess && trackRetry < MAX_TRACK_RETRY) {
            try {
                trackRetry++;
                await generateMusic(fullPrompt, audioFilename, 180, lyrics, baseTheme); 
                
                if (fs.existsSync(tempAudioPath)) {
                    await fs.move(tempAudioPath, finalTrackPath);
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

                    if (i < songCount - 1) {
                        console.log(`⏱️ [장인 모드] 3분간의 쿨다운을 가집니다. (다음 곡 준비 중...)`);
                        await new Promise(r => setTimeout(r, 180000)); // 3분 대기
                    }
                }
            } catch (err) {
                console.error(`⚠️ Track ${i + 1} 시도 ${trackRetry}/${MAX_TRACK_RETRY} 실패: ${err.message}`);
                
                if (err.message === "QUOTA_EXHAUSTED_ALL_KEYS") {
                    throw err;
                }

                if (err.message.includes("429") || err.message.includes("exhausted")) {
                    console.log("⏱️ [429 감지] 120초(2분) 대기 후 재시도...");
                    await new Promise(r => setTimeout(r, 120000));
                } else {
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
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
    for (let j = 0; j < 3; j++) {
        const bgPath = path.join(outputDir, `background_${j}.png`);
        if (fs.existsSync(bgPath)) {
            console.log(`✅ [SKIP] 이미지 ${j + 1}이 이미 존재합니다.`);
        } else {
            console.log(`🎨 [Visual] Artwork ${j+1}/3 생성 중... (고화질 프롬프트)`);
            const visualPrompt = `${finalComponents.theme}, ${finalComponents.genre} style, high quality interior design, cinematic lighting, aesthetic warm atmosphere, highly detailed, 4k resolution, variant ${j}`;
            await generateAIImage(visualPrompt, bgPath);
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
        await generateAIImage(finalComponents.theme + " vertical mobile wallpaper style", shortsVisual, true);
    }
    
    const shortsVideoPath = path.join(outputDir, `${sanitizedTitle}_Shorts.mp4`);
    if (!fs.existsSync(shortsVideoPath)) {
        await createShortsVideo(audioPaths[0], shortsVisual, shortsVideoPath, 30, initialShortsHook);
    }

    const ugcEncouragement = "✨ Feel free to use this audio in your Shorts! Tag @OZ and share your creativity with the world.";
    const engagementQuestion = promptEngineer.generateEngagementQuestion();
    const tracklistText = tracklist.join('\n');
    const finalDescription = `Full immersive audio experience curated by AI Music Agent [OZ].\n\n${ugcEncouragement}\n\nTheme: ${baseTheme}\n\n[Tracklist]\n${tracklistText}\n\n${engagementQuestion}\n\n#OZ #Music #AI #Soundscape #Healing`;

    const metadata = {
        runId,
        theme: baseTheme,
        genre: finalComponents.genre,
        mood: finalComponents.mood,
        vocalOrInst: isInstrumental ? 'instrumental' : 'vocal',
        tracklist,
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
            title: (storytellingTitle + " | 1 Hour Immersive Compilation").substring(0, 100),
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
        components: finalComponents,
        metadata: metadata
    };
}

if (require.main === module) {
    const theme = process.argv[2] || "OZ CAFE";
    generateHybridContent(theme, true, 60, 10).catch(console.error); 
}

module.exports = { generateHybridContent };
