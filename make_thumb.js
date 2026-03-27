const Jimp = require('jimp');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

// ============================================================
//  [이미지 생성 엔진 설정]
//  .env 파일에서 IMAGE_PROVIDER 값을 읽어옵니다.
//  - "imagen"       : Google Imagen 4.0 Fast (유료 $0.02/장, 최고 품질)
//  - "gemini-flash" : Gemini 2.5 Flash Image (무료 하루 500장!, 고품질)
//  설정이 없으면 기본값은 "gemini-flash" (무료) 입니다.
// ============================================================
function getImageProvider() {
    return (process.env.IMAGE_PROVIDER || 'gemini-flash').toLowerCase();
}

// ============================================================
//  [엔진 1] Google Imagen 4.0 Fast ($0.02/장, 최고 품질)
// ============================================================
async function generateWithImagen(prompt, outputPath) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY가 .env에 없습니다.');

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateImages({
        model: 'imagen-4.0-fast-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, aspectRatio: "16:9" }
    });

    if (result.generatedImages && result.generatedImages.length > 0) {
        const imageBytes = Buffer.from(result.generatedImages[0].image.imageBytes, 'base64');
        fs.writeFileSync(outputPath, imageBytes);
        return outputPath;
    }
    throw new Error('Imagen에서 이미지를 생성하지 못했습니다.');
}

// ============================================================
//  [엔진 2] Gemini 2.5 Flash Image (무료! 하루 500장)
// ============================================================
async function generateWithGeminiFlash(prompt, outputPath) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY가 .env에 없습니다.');

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: `Generate a 16:9 widescreen landscape aspect ratio image: ${prompt}`,
        config: { responseModalities: ['IMAGE', 'TEXT'] }
    });

    const parts = result.candidates[0].content.parts;
    for (const part of parts) {
        if (part.inlineData) {
            const imageBytes = Buffer.from(part.inlineData.data, 'base64');
            fs.writeFileSync(outputPath, imageBytes);
            return outputPath;
        }
    }
    throw new Error('Gemini Flash에서 이미지를 생성하지 못했습니다.');
}

// ============================================================
//  [통합 라우터] 설정에 따라 적절한 엔진으로 분배
// ============================================================
async function generateAIImage(prompt, outputPath) {
    const provider = getImageProvider();

    if (provider === 'imagen') {
        return await generateWithImagen(prompt, outputPath);
    } else {
        // 기본값: gemini-flash (무료)
        return await generateWithGeminiFlash(prompt, outputPath);
    }
}

// ============================================================
//  [썸네일 생성] AI 이미지 + 텍스트 오버레이
// ============================================================
async function createDynamicThumbnail(sourcePath, outputPath, genre, mood) {
    try {
        const provider = getImageProvider();
        console.log(`\n[그래픽 디자인 봇] AI 썸네일 생성 중... (엔진: ${provider.toUpperCase()})`);

        const thumbPrompt = `Cinematic Masterpiece, 16:9 Widescreen Panorama, Neo-Cinematic, 8k Resolution. A hyper-realistic DJ mixing ${genre} music in a neon-lit futuristic studio. ${mood} vibes, cyberpunk aesthetic. Ultra detailed skin with fine pores, volumetric dust particles, analog film grain, rim lighting, dramatic shadows, bokeh haze, shot on 35mm lens.`;

        const tempPath = outputPath + '.tmp.png';
        await generateAIImage(thumbPrompt, tempPath);

        const image = await Jimp.read(tempPath);
        image.brightness(-0.15);

        const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontSubtitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

        const width = image.bitmap.width;
        const height = image.bitmap.height;

        image.print(fontSubtitle, 0, 30, { text: "AI MUSIC AGENT [OZ]", alignmentX: Jimp.HORIZONTAL_ALIGN_RIGHT }, width - 30, height);
        image.print(fontTitle, 0, height / 2 - 80, { text: genre.toUpperCase(), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width, height);
        image.print(fontSubtitle, 0, height / 2 + 10, { text: `${mood} VIBES`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width, height);

        await image.writeAsync(outputPath);
        fs.removeSync(tempPath);

        console.log(`✅ AI 썸네일 아트워크 완성: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('❌ 썸네일 합성 중 오류:', error.message);
        throw error;
    }
}

// ============================================================
//  [슬라이드쇼 이미지 세트 생성] AI 5장 + 텍스트 오버레이
// ============================================================
async function createSlideVariants(sourcePath, slidesDir, genre, mood) {
    try {
        const provider = getImageProvider();
        console.log(`\n[AI 아트 디렉터] 슬라이드 5장을 AI로 제작합니다... (엔진: ${provider.toUpperCase()})`);

        fs.ensureDirSync(slidesDir);
        const existingFiles = fs.readdirSync(slidesDir).filter(f => f.startsWith('slide_'));
        existingFiles.forEach(f => fs.removeSync(path.join(slidesDir, f)));

        const slideThemes = [
            `16:9 Widescreen Landscape, Cinematic 8k, Hyper-realistic DJ girl mixing ${genre} music in futuristic neon studio, 35mm grain, fine skin texture, ${mood} mood`,
            `16:9 Widescreen Landscape, Abstract digital visualization of ${genre} audio waves, volumetric light, sound particles with lens flare, ${mood} cosmic atmosphere`,
            `16:9 Widescreen Landscape, High-definition cozy studio with panoramic city view, neon glowing ${genre} equipment, analog film imperfections, ${mood} vibes`,
            `16:9 Widescreen Landscape, Futuristic holographic stage, ${genre} instruments, rim lighting, 8k masterpiece, digital art with cinematic depth of field`,
            `16:9 Widescreen Landscape, Dreamy landscape, floating vinyls, ${genre} theme, ethereal aurora sky, painterly but detailed texture, ${mood} atmospheric haze`
        ];

        const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontSubtitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

        const slidePaths = [];

        for (let i = 0; i < slideThemes.length; i++) {
            const rawPath = path.join(slidesDir, `slide_raw_${i + 1}.png`);
            const finalPath = path.join(slidesDir, `slide_${i + 1}.png`);

            console.log(`  🤖 슬라이드 ${i + 1}/5 AI 이미지 생성 중... (${provider})`);
            await generateAIImage(slideThemes[i], rawPath);

            const image = await Jimp.read(rawPath);
            image.brightness(-0.12);

            const width = image.bitmap.width;
            const height = image.bitmap.height;

            image.print(fontSubtitle, 0, 30, { text: "AI MUSIC AGENT [OZ]", alignmentX: Jimp.HORIZONTAL_ALIGN_RIGHT }, width - 30, height);
            image.print(fontTitle, 0, height / 2 - 80, { text: genre.toUpperCase(), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width, height);
            image.print(fontSubtitle, 0, height / 2 + 10, { text: `${mood} VIBES`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width, height);

            await image.writeAsync(finalPath);
            fs.removeSync(rawPath);

            slidePaths.push(finalPath);
            console.log(`  ✅ 슬라이드 ${i + 1}/5 아트워크 완성!`);
        }

        console.log(`🎉 AI 아트워크 슬라이드 세트 ${slidePaths.length}장 생성 완료!`);
        return slidePaths;

    } catch (error) {
        console.error('❌ AI 슬라이드 이미지 생성 중 오류:', error.message);
        throw error;
    }
}

// ============================================================
//  [가사 반영 이미지 세트 생성] 3장 생성 (가사/테마 반영)
// ============================================================
async function createLyricThemedImages(lyrics, theme, genre, mood) {
    try {
        const provider = getImageProvider();
        console.log(`\n[AI 비주얼 디렉터] 가사 및 테마를 반영한 이미지 3장을 제작합니다... (엔진: ${provider.toUpperCase()})`);

        const promptEngineer = require('./prompt_engineer');
        const scenes = await promptEngineer.generateVisualScenes(lyrics, theme);

        const lyricsDir = path.join(__dirname, 'images', 'lyrics');
        fs.ensureDirSync(lyricsDir);

        const imagePaths = [];

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const outputPath = path.join(lyricsDir, `lyric_scene_${i + 1}.png`);

            // image-pro 스킬 기반 마스터 프롬프트 구성
            const masterPrompt = `
                Cinematic Masterpiece, 16:9 Widescreen Panorama Landscape, 8k Resolution, Neo-Cinematic with Analog Film Texture.
                Goal: ${scene.goal} reflecting the theme '${theme}'.
                Mood: ${scene.mood}, ${mood} vibes.
                Style: Analog grain, cinematic depth, bokeh haze, hyperreal textures, volumetric lighting.
                Technical: Shot on 35mm lens, f/1.8, professional color grading, immersive atmosphere.
            `.replace(/\s+/g, ' ').trim();

            console.log(`  🤖 장면 ${i + 1}/3 AI 이미지 생성 중...`);
            await generateAIImage(masterPrompt, outputPath);

            // 이미지 처리 (필요시 밝기 조절 등)
            const image = await Jimp.read(outputPath);
            image.brightness(-0.1); // 약간 어둡게 하여 가사 가독성 확보 가능성 열어둠
            await image.writeAsync(outputPath);

            imagePaths.push(outputPath);
            console.log(`  ✅ 장면 ${i + 1}/3 완성: ${path.basename(outputPath)}`);
        }

        return imagePaths;
    } catch (error) {
        console.error('❌ 가사 반영 이미지 생성 중 오류:', error.message);
        throw error;
    }
}

module.exports = { createDynamicThumbnail, createSlideVariants, generateAIImage, createLyricThemedImages };
