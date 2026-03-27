const { generateMusic } = require('./generate_music');
const promptEngineer = require('./prompt_engineer');
const { generateAIImage } = require('./make_thumb');
const { createLoopVideo, createShortsVideo } = require('./make_video');
const path = require('path');
const fs = require('fs-extra');

/**
 * 1시간 루프 영상과 쇼츠 영상을 동시에 생성합니다.
 */
async function generateHybridContent(baseTheme, isInstrumental = false, targetMinutes = 60) {
    const runId = `loop_${Date.now()}_${isInstrumental ? 'inst' : 'vocal'}`;
    const outputDir = path.join(__dirname, 'loops', runId);
    await fs.ensureDir(outputDir);

    console.log(`\n============== [OZ HYBRID RENDERER] ==============`);
    console.log(`🚀 Theme: ${baseTheme} (${isInstrumental ? 'INSTRUMENTAL' : 'VOCAL'})`);
    console.log(`📁 Path: ${outputDir}`);
    console.log(`==================================================\n`);

    const { fullPrompt, lyrics, storytellingTitle, components } = promptEngineer.generateStructuredPrompt(Date.now(), isInstrumental);
    
    // 1. 음원 생성 (Vocal or Instrumental)
    const audioFilename = `${runId}_master.mp3`;
    const audioPath = path.join(outputDir, audioFilename);
    console.log(`🎵 [Audio] Generating master track...`);
    await generateMusic(fullPrompt, audioFilename, 181, lyrics);
    
    const generatedAudio = path.join(__dirname, 'music', audioFilename);
    if (fs.existsSync(generatedAudio)) {
        await fs.move(generatedAudio, audioPath);
    } else {
        throw new Error("Failed to generate audio.");
    }

    // 2. 비주얼 생성 (16:9)
    const backgroundFile = path.join(outputDir, 'background.png');
    console.log(`🎨 [Visual] Generating artwork...`);
    await generateAIImage(fullPrompt, backgroundFile);

    // 3. 1시간 루프 비디오 생성 (16:9)
    const loopVideoName = `${storytellingTitle.replace(/\s+/g, '_')}_1Hour.mp4`;
    const loopVideoPath = path.join(outputDir, loopVideoName);
    console.log(`🎬 [Video] Rendering 1-hour loop...`);
    await createLoopVideo(audioPath, backgroundFile, loopVideoPath, targetMinutes * 60);

    // 4. 쇼츠 비디오 생성 (9:16)
    const shortsVideoName = `${storytellingTitle.replace(/\s+/g, '_')}_Shorts.mp4`;
    const shortsVideoPath = path.join(outputDir, shortsVideoName);
    console.log(`📱 [Shorts] Rendering 9:16 vertical video...`);
    await createShortsVideo(audioPath, backgroundFile, shortsVideoPath);

    return {
        vocalOrInst: isInstrumental ? 'instrumental' : 'vocal',
        loop: {
            path: loopVideoPath,
            title: storytellingTitle + " (1 Hour Loop)",
            description: `Full 1-hour immersive loop. Theme: ${baseTheme}\n#Loop #Focus #1Hour`,
            tags: ["AI Music", "Focus", "1Hour"]
        },
        shorts: {
            path: shortsVideoPath,
            title: storytellingTitle + " #Shorts",
            description: `Quick vibe check. ${baseTheme}\n#Shorts #AIMusic #Vibe`,
            tags: ["Shorts", "AI Music", "Vibe"]
        },
        thumbnail: backgroundFile,
        components: components,
        fullPrompt: fullPrompt
    };
}

if (require.main === module) {
    const theme = process.argv[2] || "Deep Focus Lofi";
    generateHybridContent(theme, false, 1).catch(console.error);
}

module.exports = { generateHybridContent };
