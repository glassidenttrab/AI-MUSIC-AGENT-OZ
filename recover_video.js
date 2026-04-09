const path = require('path');
const fs = require('fs-extra');
const { createSlideshowVideo, createShortsVideo, getAudioDuration } = require('./make_video');

async function recover() {
    const outputDir = path.join(__dirname, 'loops', 'loop_Rainy_Day_Open-air_Cafe_inst');
    const masterAudioPath = path.join(outputDir, 'master_audio.mp3');
    const backgroundImages = [
        path.join(outputDir, 'background_0.png'),
        path.join(outputDir, 'background_1.png'),
        path.join(outputDir, 'background_2.png')
    ];
    const shortsVisual = path.join(outputDir, 'shorts_background.png');
    
    console.log(`🚀 [Recovery] Starting video recovery in ${outputDir}`);
    
    // 1. Reconstruct tracklist data
    const finalDetailedTracklist = [];
    let currentTime = 0;
    const trackCount = 10;
    const baseTheme = "Rainy Day Open-air Cafe";
    
    for (let i = 0; i < trackCount; i++) {
        const trackPath = path.join(outputDir, `track_${i}.mp3`);
        if (fs.existsSync(trackPath)) {
            const duration = await getAudioDuration(trackPath);
            const title = `[OZ] Rainy Day Cafe Jazz - Part ${i + 1}`;
            finalDetailedTracklist.push({ title: title, startTime: currentTime, duration: duration });
            currentTime += duration;
        }
    }
    
    // 2. Render compilation video
    const loopVideoPath = path.join(outputDir, `Rainy_Day_Open-air_Cafe_Compilation.mp4`);
    console.log(`🎬 Rendering main compilation...`);
    await createSlideshowVideo(backgroundImages, masterAudioPath, loopVideoPath, 30, finalDetailedTracklist);
    
    // 3. Render shorts video
    const shortsVideoPath = path.join(outputDir, `Rainy_Day_Open-air_Cafe_Shorts.mp4`);
    if (fs.existsSync(path.join(outputDir, 'track_0.mp3'))) {
        console.log(`🎬 Rendering shorts...`);
        await createShortsVideo(path.join(outputDir, 'track_0.mp3'), shortsVisual, shortsVideoPath, 30);
    }
    
    // 4. Create metadata.json
    const metadata = {
        runId: Date.now().toString(),
        theme: baseTheme,
        genre: "1960s Jazz Ballad / Swing",
        mood: "Rainy, Smoky, Nostalgic, Cozy",
        vocalOrInst: 'instrumental',
        tracklist: finalDetailedTracklist.map(t => `${t.title} (${Math.floor(t.startTime / 60)}:${(Math.floor(t.startTime % 60)).toString().padStart(2, '0')})`),
        timestamp: new Date().toISOString()
    };
    await fs.writeJson(path.join(outputDir, 'metadata.json'), metadata, { spaces: 4 });
    
    console.log(`✅ [Recovery] Recovery completed successfully!`);
}

recover().catch(err => {
    console.error(`❌ [Recovery] Failed:`, err);
    process.exit(1);
});
