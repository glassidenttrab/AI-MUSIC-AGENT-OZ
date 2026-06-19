const { generateMusic } = require('../core/generate_music');
const promptEngineer = require('../core/prompt_engineer');
const { generateAIImage } = require('../core/make_thumb');
const { createVideo, concatAudioFiles } = require('../core/make_video');
const path = require('path');
const fs = require('fs-extra');

/**
 * 1시간 분량의 컴필레이션 영상을 자동 생성합니다.
 * @param {string} baseTheme - 메인 테마 (예: "Cyberpunk Night Drive")
 * @param {number} targetMinutes - 총 목표 길이 (분, 기본 60분)
 */
async function generateCompilation(baseTheme, targetMinutes = 60) {
    // [FIX 2026-04-20] 날짜 태그 추가하여 고정 폴더 캐시 트랩 방지
    const today = new Date().toISOString().split('T')[0];
    const runId = `compilation_${baseTheme.replace(/\s+/g, '_')}_${today}`;
    const outputDir = path.join(__dirname, '..', '..', 'loops', runId); // loops 폴더로 통합 관리
    const musicDir = path.join(outputDir, 'tracks');
    
    await fs.ensureDir(musicDir);
    await fs.ensureDir(outputDir);

    console.log(`\n============== [OZ LONG-FORM ENGINE V4] ==============`);
    console.log(`🚀 테마: ${baseTheme}`);
    console.log(`📅 날짜: ${today}`);
    console.log(`📁 작업 경로: ${outputDir}`);
    console.log(`====================================================\n`);

    // 1. 대표 프롬프트 및 비주얼 생성
    const baseInfo = await promptEngineer.generateStructuredPrompt(0, true, baseTheme);
    const mainPrompt = baseInfo.fullPrompt;
    const backgroundFile = path.join(outputDir, 'background.png');
    
    console.log(`🎨 [비주얼] 1시간 무드를 책임질 마스터 아트워크 생성 중...`);
    await generateAIImage(mainPrompt, backgroundFile);

    // 2. 개별 트랙 생성
    const tracksNeeded = Math.ceil(targetMinutes / 3);
    const audioPaths = [];
    const trackList = []; // 트랙리스트 저장 (타임스탬프용)

    console.log(`\n🎵 [오디오] 총 ${tracksNeeded}개의 시그니처 트랙 생성을 시작합니다...`);

    let currentSeconds = 0;
    for (let i = 0; i < tracksNeeded; i++) {
        const trackFilename = `track_${String(i + 1).padStart(2, '0')}.mp3`;
        const finalPath = path.join(musicDir, trackFilename);

        // [FIX] 트랙마다 고유한 제목 생성 (Generic 'Track 1' 탈피)
        const trackInfo = await promptEngineer.generateStructuredPrompt(i, false, baseTheme);
        const uniqueTitle = trackInfo.title || `${baseTheme} Session #${i + 1}`;
        
        console.log(`\n[${i + 1}/${tracksNeeded}] " ${uniqueTitle} " 작곡 중...`);

        // 타임스탬프 계산 (MM:SS)
        const minutes = Math.floor(currentSeconds / 60);
        const seconds = currentSeconds % 60;
        const timestamp = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        trackList.push({ timestamp, title: uniqueTitle });
        currentSeconds += 180; // 트랙당 약 3분 가정

        const resultPath = await generateMusic(trackInfo.fullPrompt, `temp_${runId}_${i}.mp3`, 181, null, baseTheme);
        
        if (resultPath && fs.existsSync(resultPath)) {
            await fs.move(resultPath, finalPath, { overwrite: true });
            audioPaths.push(finalPath);
        } else {
            console.error(`❌ 트랙 생성 실패: ${uniqueTitle}`);
        }
    }

    if (audioPaths.length === 0) {
        throw new Error("트랙이 하나도 생성되지 않았습니다.");
    }

    // 3. 오디오 전체 병합
    const mergedAudioPath = path.join(outputDir, 'merged_compilation.mp3');
    await concatAudioFiles(audioPaths, mergedAudioPath);

    // 4. 최종 비디오 렌더링
    const finalVideoPath = path.join(outputDir, `${baseTheme.replace(/\s+/g, '_')}_1Hour.mp4`);
    console.log(`\n🎬 [최종 렌더링] 1시간 분량의 1080p 고화질 영상 제작 중...`);
    await createVideo(mergedAudioPath, backgroundFile, finalVideoPath);

    console.log(`\n` + "=".repeat(50));
    console.log(`🏆 [완료] 1시간 컴필레이션 제작이 성공적으로 끝났습니다!`);
    console.log(`📍 파일 위치: ${finalVideoPath}`);
    console.log(`📊 투입 비용: $${(audioPaths.length * 0.08).toFixed(2)} (${audioPaths.length}곡)`);
    console.log("=".repeat(50));

    const metadata = {
        runId,
        theme: baseTheme,
        targetMinutes,
        trackCount: audioPaths.length,
        trackList, // [FIX] 개별 트랙 제목 리스트 포함
        timestamp: new Date().toISOString()
    };
    await fs.writeJson(path.join(outputDir, 'metadata.json'), metadata, { spaces: 4 });

    return finalVideoPath;
}

module.exports = { generateCompilation };

// 스크립트 단독 호출 시 (예시: 테마와 길이를 받아서 실행)
if (require.main === module) {
    const theme = process.argv[2] || "Cyberpunk Night Drive";
    const minutes = parseInt(process.argv[3]) || 5; // 테스트를 위해 기본 5분(2곡)으로 설정
    
    generateCompilation(theme, minutes).catch(err => {
        console.error("❌ 치명적 오류 발생:", err);
    });
}
