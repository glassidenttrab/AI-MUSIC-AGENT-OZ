const { generateMusic } = require('./src/core/generate_music');
const promptEngineer = require('./src/core/prompt_engineer');
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
            // [업그레이드] 강제 재생성 옵션 또는 파일 손상(중복) 감지 시 삭제 후 다시 생성
            const shouldForce = process.env.FORCE_REGENERATE === 'true';
            
            // 파일 크기가 0이거나, 비정상적으로 작거나, 이전 작업에서 중복된 것으로 판단되는 경우 체크 로직 추가 가능
            if (shouldForce) {
                console.log(`⚠️ [FORCE] 트랙 ${i} (을)를 삭제하고 새로 생성합니다...`);
                await fs.remove(finalTrackPath);
            } else {
                console.log(`✅ [SKIP] 트랙 ${i} (은)는 이미 존재합니다.`);
                continue;
            }
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
        } catch (err) {
            console.error(`❌ Track ${i} 생성 실패:`, err.message);
        } finally {
            // [최적화] 성공/실패 여부와 관계없이 사용자 요청에 따라 무조건 3분(180초) 대기
            // 단, 마지막 곡 생성 후에는 다음 배치를 위해 대기하거나 즉시 종료 (여기서는 일관성을 위해 항시 대기)
            console.log(`⏱️ [안정화] 할당량 관리를 위해 3분(180초) 동안 대기합니다...`);
            await new Promise(r => setTimeout(r, 180000));
        }
    }
    console.log(`\n✨ 모든 음악 생성 작업이 완료되었습니다!`);
}

if (require.main === module) {
    generateAllMusicOnly("OZ CAFE", false, 10).catch(console.error);
}
