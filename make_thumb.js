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
        config: { numberOfImages: 1 }
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
        contents: `Generate an image: ${prompt}`,
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

        const thumbPrompt = `A cinematic anime style DJ mixing ${genre} music in a neon-lit futuristic studio, ${mood} vibes, cyberpunk aesthetic, wide banner composition, ultra detailed, 4k`;

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
            `A cinematic anime DJ girl mixing ${genre} music in a neon-lit futuristic studio at night, ${mood} vibes, cyberpunk aesthetic, ultra detailed, 4k`,
            `An abstract digital art visualization of ${genre} music, flowing colorful energy waves and sound particles, ${mood} atmosphere, cosmic galaxy background, high quality`,
            `A cozy lofi bedroom studio at night with panoramic city skyline view, ${genre} music equipment glowing, ${mood} mood, anime art style`,
            `A futuristic holographic concert stage with floating musical instruments, ${genre} theme, ${mood} color palette, volumetric neon lighting, digital art`,
            `A dreamy fantasy landscape with floating vinyl records and musical notes, ${genre} inspired, ${mood} ethereal aurora borealis sky, painterly style`,
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

module.exports = { createDynamicThumbnail, createSlideVariants, generateAIImage };
