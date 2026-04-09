const { generateMusic } = require('./generate_music');
const { createLyricThemedImages } = require('./make_thumb');
const { createSlideshowVideo } = require('./make_video');
const promptEngineer = require('./prompt_engineer');
const path = require('path');
const fs = require('fs-extra');

async function createSpecialSongForWife() {
    console.log('====== [AI MUSIC AGENT OZ] 아내를 위한 특별한 선물 제작 시작 ======');

    const title = "Thirteen_Years_of_Love";
    const theme = "10 years dating, 3 years marriage, love and respect for my wise wife";
    
    // 1. 가사 작성 (한국어 감성 반영)
    const lyrics = `
(Verse 1)
어린 날의 우리, 십 년 전 그 길에서
수줍게 건넸던 첫인사가 어제 같은데
강산이 변한다는 긴 시간 동안
내 곁을 지켜준 건 오직 당신뿐이었죠

(Verse 2)
십 년의 연애, 수많은 계절을 지나
우리 약속한 지 어느덧 삼 년이라는 시간
현명하고 고운 당신의 마음 결마다
내가 배운 건 사랑 그 이상의 존중이었죠

(Chorus)
나의 예쁘고 지혜로운 사람아
긴 시간을 돌고 돌아 내게 와줘서 고마워요
우리 함께할 앞날도 지금처럼만
서로를 믿으며 예쁘게 걸어가요
세상 무엇보다 소중한 나의 아내여

(Bridge)
때론 비바람 불고 힘든 날도 있겠지만
당신 손 놓지 않고 내가 먼저 안아줄게요
우리 쌓아온 시간이 증명하니까
우리의 사랑은 영원히 지지 않을 테니까
    `.trim();

    // 2. 음악 프롬프트 구성 (팝 발라드)
    const genre = "K-Pop Ballad";
    const mood = "Emotional, Heartfelt, Romantic";
    const instrument = "Grand Piano, Orchestral Strings, Acoustic Guitar";
    const vocal = "Pure and Emotional Male Vocals";
    
    const fullMusicPrompt = `${genre}, ${mood}, featuring ${instrument}, with ${vocal}, song about long-term love and gratitude`;

    try {
        // 3. 가사 기반 이미지 3장 생성 (커스텀 테마 적용)
        console.log(`\n🎨 [Step 1] 가사 테마 이미지 생성 중...`);
        const slideImages = await createLyricThemedImages(lyrics, "Emotional Pop Ballad about Wife");

        // 4. 음악 생성
        console.log(`\n🎵 [Step 2] 음악 작곡 및 보컬 생성 중 (Lyria 3 Engine)...`);
        const audioFileName = `${title}.mp3`;
        const audioPath = await generateMusic(fullMusicPrompt, audioFileName, 180, lyrics);

        // 5. 영상 합성
        console.log(`\n🎬 [Step 3] 영상 합성 및 렌더링 중...`);
        const videoDir = path.join(__dirname, 'videos');
        await fs.ensureDir(videoDir);
        const videoOutput = path.join(videoDir, `${title}_Special.mp4`);
        
        // 각 이미지를 넉넉하게 배치하기 위해 slideDuration 20초 설정
        const resultVideo = await createSlideshowVideo(slideImages, audioPath, videoOutput, 20);

        console.log(`\n==================================================`);
        console.log(`✅ 특별한 선물이 완성되었습니다!`);
        console.log(`📍 영상 위치: ${resultVideo}`);
        console.log(`📍 음악 위치: ${audioPath}`);
        console.log(`==================================================`);

    } catch (error) {
        console.error(`\n❌ 제작 중 오류 발생:`, error.message);
    }
}

createSpecialSongForWife();
