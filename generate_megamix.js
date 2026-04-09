const path = require('path');
const fs = require('fs-extra');
const { concatAudioFiles, createSlideshowVideo, getAudioDuration } = require('./make_video');
const { generateAIImage } = require('./make_thumb');

/**
 * OZ MEGA-MIX ENGINE
 * 축적된 1시간 프로젝트들을 병합하여 2~3시간 분량의 초대형 컴필레이션을 제작합니다.
 */
async function generateMegaMix(targetTheme, projectLimit = 3) {
    console.log(`\n============== [OZ MEGA-MIX ENGINE] ==============`);
    console.log(`🚀 Target Super-Theme: ${targetTheme}`);
    console.log(`==================================================\n`);

    const loopsDir = path.join(__dirname, 'loops');
    const folders = await fs.readdir(loopsDir);
    const validProjects = [];

    // 1. 메타데이터 기반 프로젝트 식별 및 필터링
    for (const folder of folders) {
        const projectPath = path.join(loopsDir, folder);
        const metaPath = path.join(projectPath, 'metadata.json');

        if (fs.existsSync(metaPath)) {
            const meta = await fs.readJson(metaPath);
            // 테마 또는 장르가 매칭되는지 확인 (대소문자 무시)
            if (meta.theme.toLowerCase().includes(targetTheme.toLowerCase()) || 
                meta.genre.toLowerCase().includes(targetTheme.toLowerCase())) {
                
                // 마스터 오디오 파일 확인
                const audioFile = folder.startsWith('loop_') ? `${meta.runId}_master.mp3` : 'merged_compilation.mp3';
                const audioPath = path.join(projectPath, audioFile);
                
                if (fs.existsSync(audioPath)) {
                    validProjects.push({ folder, audioPath, meta });
                }
            }
        }
    }

    if (validProjects.length < 2) {
        console.log(`⚠️ 매칭되는 프로젝트가 부족합니다 (현재: ${validProjects.length}개).`);
        console.log(`💡 팁: 더 많은 1시간 프로젝트를 먼저 생성하거나, 검색어를 넓혀보세요.`);
        return;
    }

    // 최신 순으로 정렬 후 개수 제한
    const selected = validProjects.sort((a, b) => new Date(b.meta.timestamp) - new Date(a.meta.timestamp)).slice(0, projectLimit);
    
    console.log(`\n📚 [Selection] 총 ${selected.length}개의 프로젝트를 병합합니다:`);
    selected.forEach((p, i) => console.log(`   ${i+1}. ${p.meta.theme} (${p.folder})`));

    const runId = `megamix_${Date.now()}`;
    const outputDir = path.join(__dirname, 'megamixes', runId);
    await fs.ensureDir(outputDir);

    // 2. 오디오 병합
    const audioPaths = selected.map(p => p.audioPath);
    const megaAudioPath = path.join(outputDir, `${runId}_mega_audio.mp3`);
    await concatAudioFiles(audioPaths, megaAudioPath);

    // 3. 메가 믹스를 위한 새로운 비주얼 생성
    console.log(`\n🎨 [Visual] 메가 믹스 전용 아트워크 제작 중...`);
    const megaThumbPath = path.join(outputDir, 'mega_background.png');
    const megaPrompt = `Cinematic Masterpiece, Mega-Compilation cover for ${targetTheme} music, futuristic neon digital art, grand scale architecture, immersive atmosphere, 8k resolution`;
    await generateAIImage(megaPrompt, megaThumbPath);

    // 4. 슬라이드쇼 비주얼 세트 구성 (각 프로젝트의 대표 이미지 활용)
    const slides = [megaThumbPath];
    for (const p of selected) {
        const projectPath = path.join(loopsDir, p.folder);
        const bg0 = path.join(projectPath, 'background_0.png');
        if (fs.existsSync(bg0)) slides.push(bg0);
    }

    // 5. 최종 비디오 렌더링 (2~3시간)
    const finalVideoPath = path.join(outputDir, `OZ_MEGAMIX_${targetTheme.replace(/\s+/g, '_')}.mp4`);
    console.log(`\n🎬 [Rendering] ${selected.length}시간 분량의 초대형 영상 제작 시작...`);
    
    // 슬라이드당 30초씩 순환
    await createSlideshowVideo(slides, megaAudioPath, finalVideoPath, 30);

    // 6. 메들리 타임라인 텍스트 생성
    let accumulated = 0;
    let tracklistInfo = `[OZ MEGA-MIX: ${targetTheme}]\n\n`;
    for (let i = 0; i < selected.length; i++) {
        const dur = await getAudioDuration(selected[i].audioPath);
        const mm = Math.floor(accumulated / 60);
        const ss = Math.floor(accumulated % 60);
        const hh = Math.floor(mm / 60);
        const timeStr = `${String(hh).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        
        tracklistInfo += `${timeStr} PART ${i + 1}: ${selected[i].meta.theme}\n`;
        accumulated += dur;
    }

    const infoPath = path.join(outputDir, 'description.txt');
    await fs.writeFile(infoPath, tracklistInfo);

    console.log(`\n🏆 [SUCCESS] ${Math.floor(accumulated/3600)}시간 메가 믹스 완성!`);
    console.log(`📍 경로: ${finalVideoPath}`);
    console.log(`📝 타임라인 정보가 ${infoPath}에 저장되었습니다.`);

    return finalVideoPath;
}

// 명령줄 실행 지원
if (require.main === module) {
    const theme = process.argv[2] || "Jazz";
    generateMegaMix(theme).catch(console.error);
}

module.exports = { generateMegaMix };
