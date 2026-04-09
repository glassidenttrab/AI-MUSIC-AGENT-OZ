const { generateMusic } = require('./generate_music');
const promptEngineer = require('./prompt_engineer');
const path = require('path');
const fs = require('fs-extra');

async function generateAllMusicOnly(baseTheme, isInstrumental = false, songCount = 10) {
    const themeId = baseTheme.replace(/\s+/g, '_');
    const runId = `loop_${themeId}_${isInstrumental ? 'inst' : 'vocal'}`;
    const outputDir = path.join(__dirname, 'loops', runId);
    await fs.ensureDir(outputDir);

    console.log(`\n============== [OZ MUSIC-ONLY GENERATOR] ==============`);
    console.log(`🚀 Theme: ${baseTheme}`);
    console.log(`🎵 Target: ${songCount} Songs`);
    console.log(`⏱️ Mode: Rotation with 3-minute cooldown`);
    console.log(`========================================================\n`);

    for (let i = 0; i < songCount; i++) {
        const audioFilename = `track_${i}.mp3`;
        const finalTrackPath = path.join(outputDir, audioFilename);

        if (fs.existsSync(finalTrackPath)) {
            console.log(`✅ [SKIP] 트랙 ${i} (은)는 이미 존재합니다.`);
            continue;
        }

        console.log(`\n[Song ${i + 1}/${songCount}] 생성 시작...`);
        const { fullPrompt, lyrics } = promptEngineer.generateStructuredPrompt(i, isInstrumental, baseTheme);

        try {
            await generateMusic(fullPrompt, audioFilename, 180, lyrics, baseTheme);
            
            const tempAudioPath = path.join(__dirname, 'music', baseTheme, audioFilename);
            if (fs.existsSync(tempAudioPath)) {
                await fs.move(tempAudioPath, finalTrackPath);
                console.log(`✅ Track ${i} 저장 완료: ${finalTrackPath}`);
            }

            if (i < songCount - 1) {
                console.log(`⏱️ [사용자 요청] 3분(180초) 대기 후 다음 곡을 생성합니다...`);
                await new Promise(r => setTimeout(r, 180000));
            }
        } catch (err) {
            console.error(`❌ Track ${i} 생성 실패:`, err.message);
            // 에러 발생 시에도 다음 곡 시도 (generateMusic 사내 로테이션 믿음)
            await new Promise(r => setTimeout(r, 60000));
        }
    }
    console.log(`\n✨ 모든 음악 생성 작업이 완료되었습니다!`);
}

if (require.main === module) {
    generateAllMusicOnly("OZ CAFE", false, 10).catch(console.error);
}
