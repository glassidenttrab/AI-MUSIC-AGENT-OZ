const { generateMusic } = require('./generate_music');
const promptEngineer = require('./prompt_engineer');
const { generateAIImage } = require('./make_thumb');
const { createVideo, concatAudioFiles } = require('./make_video');
const path = require('path');
const fs = require('fs-extra');

/**
 * 1시간 분량의 컴필레이션 영상을 자동 생성합니다.
 * @param {string} baseTheme - 메인 테마 (예: "Cyberpunk Night Drive")
 * @param {number} targetMinutes - 총 목표 길이 (분, 기본 60분)
 */
async function generateCompilation(baseTheme, targetMinutes = 60) {
    const runId = `compilation_${Date.now()}`;
    const outputDir = path.join(__dirname, 'compilations', runId);
    const musicDir = path.join(outputDir, 'tracks');
    
    await fs.ensureDir(musicDir);
    await fs.ensureDir(outputDir);

    console.log(`\n============== [OZ LONG-FORM ENGINE] ==============`);
    console.log(`🚀 테마: ${baseTheme}`);
    console.log(`⏱️ 목표 길이: ${targetMinutes}분`);
    console.log(`📁 작업 경로: ${outputDir}`);
    console.log(`==================================================\n`);

    // 1. 대표 프롬프트 및 비주얼 생성
    // 60분 내내 일관된 무드를 유지하기 위해 첫 번째 프롬프트를 기준으로 비주얼 제작
    const baseInfo = promptEngineer.generateStructuredPrompt(0);
    const mainPrompt = baseInfo.fullPrompt;
    const backgroundFile = path.join(outputDir, 'background.png');
    
    console.log(`🎨 [비주얼] 1시간 무드를 책임질 마스터 아트워크 생성 중...`);
    await generateAIImage(mainPrompt, backgroundFile);

    // 2. 개별 트랙 생성 (약 20곡 = 60분)
    const tracksNeeded = Math.ceil(targetMinutes / 3);
    const audioPaths = [];

    console.log(`\n🎵 [오디오] 총 ${tracksNeeded}개의 유니크 트랙 생성을 시작합니다...`);
    console.log(`⚠️ 예상 소요 시간: 약 ${tracksNeeded * 2}분 / 예상 비용: 약 $${(tracksNeeded * 0.08).toFixed(2)}`);

    for (let i = 0; i < tracksNeeded; i++) {
        const trackTitle = `track_${String(i + 1).padStart(2, '0')}.mp3`;
        const tempFilename = `${runId}_${trackTitle}`;
        const finalPath = path.join(musicDir, trackTitle);

        console.log(`\n[${i + 1}/${tracksNeeded}] '${trackTitle}' 작곡 중...`);
        
        // 매 트랙마다 미세한 변주를 주기 위해 index 전달 (prompt_engineer의 데이터 순환 활용)
        const trackInfo = promptEngineer.generateStructuredPrompt(i);
        
        // 보컬 유무는 대표님이 원하시는 대로 (여기서는 연주곡 위주로 구성하되 가끔 보컬 섞임)
        // 만약 1시간 내내 보컬 없는 BGM을 원하시면 아래 주석 해제하여 강제 조정 가능
        // trackInfo.fullPrompt += " [Instrumental BGM]";

        await generateMusic(trackInfo.fullPrompt, tempFilename, 181, null);
        
        // 생성된 파일을 작업 폴더로 이동
        const generatedPath = path.join(__dirname, 'music', tempFilename);
        if (fs.existsSync(generatedPath)) {
            await fs.move(generatedPath, finalPath);
            audioPaths.push(finalPath);
        } else {
            console.error(`❌ 트랙 ${i + 1} 생성 실패, 건너뜁니다.`);
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

    return finalVideoPath;
}

// 스크립트 단독 호출 시 (예시: 테마와 길이를 받아서 실행)
if (require.main === module) {
    const theme = process.argv[2] || "Cyberpunk Night Drive";
    const minutes = parseInt(process.argv[3]) || 5; // 테스트를 위해 기본 5분(2곡)으로 설정
    
    generateCompilation(theme, minutes).catch(err => {
        console.error("❌ 치명적 오류 발생:", err);
    });
}
