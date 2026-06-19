const Jimp = require('jimp');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const { VertexAI } = require('@google-cloud/vertexai');
const promptEngineer = require('./prompt_engineer');

// ============================================================
//  [이미지 생성 엔진 설정]
//  .env 파일에서 IMAGE_PROVIDER 값을 읽어옵니다.
//  - "comfy"       : 로컬 ComfyUI (무료, 무제한!)
//  - "imagen"       : Google Imagen 3.0/4.0 (Vertex AI)
//  - "gemini-flash" : Gemini 1.5 Flash Image (Vertex AI)
// ============================================================
function getImageProvider() {
    return (process.env.IMAGE_PROVIDER || 'gemini-flash').toLowerCase();
}

// ============================================================
//  [API 키 관리 및 Vertex AI 클라이언트 획득]
// ============================================================
async function getVertexAI() {
    const projectId = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_LOCATION || 'us-central1';
    const apiKey = process.env.VERTEX_AI_KEY;
    const keyFilePath = process.env.GCP_KEY_FILE;

    if (!projectId || (!apiKey && !keyFilePath)) {
        throw new Error('Vertex AI 설정(GCP_PROJECT_ID와 [API 키 또는 JSON 파일 경로])이 누락되었습니다.');
    }

    const authOptions = keyFilePath 
        ? { keyFilename: keyFilePath } 
        : { apiKey: apiKey };

    return new VertexAI({
        project: projectId,
        location: location,
        googleAuthOptions: authOptions
    });
}

// ============================================================
//  [엔진 1] Google Imagen 4.0 ($0.02/장, 최고 품질)
// ============================================================
async function generateWithImagen(prompt, outputPath, isVertical = false) {
    const vertex = await getVertexAI();
    // Vertex AI에서는 Imagen 모델을 별도로 정의하거나 getGenerativeModel을 통해 접근합니다.
    const model = vertex.preview.getGenerativeModel({
        model: 'imagen-3', // Vertex AI의 표준 Imagen 모델명으로 조정 필요 시 업데이트
    });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            numberOfImages: 1,
            aspectRatio: isVertical ? "9:16" : "16:9"
        }
    });

    const response = await result.response;
    if (response.candidates && response.candidates[0].content.parts[0].inlineData) {
        const imageBytes = Buffer.from(response.candidates[0].content.parts[0].inlineData.data, 'base64');
        fs.writeFileSync(outputPath, imageBytes);
        return outputPath;
    }
    throw new Error('Vertex Imagen에서 이미지를 생성하지 못했습니다.');
}

// ============================================================
//  [엔진 2] Gemini 3.1 Flash Image (무료! 하루 500장)
// ============================================================
async function generateWithGeminiFlash(prompt, outputPath, isVertical = false) {
    const defaultModelId = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
    const aspectPrompt = isVertical ? "9:16 vertical portrait mobile wallpaper aspect ratio" : "16:9 widescreen landscape aspect ratio";
    const fullPrompt = `Generate a ${aspectPrompt} image based on this description: ${prompt}`;

    async function tryGenerate(location) {
        console.log(`📡 [Thumbnail] Gemini Flash 시도 중... (Region: ${location}, Model: ${defaultModelId})`);
        const projectId = process.env.GCP_PROJECT_ID;
        const apiKey = process.env.VERTEX_AI_KEY || process.env.GOOGLE_CLOUD_API_KEY;
        const keyFilePath = process.env.GCP_KEY_FILE;

        const authOptions = keyFilePath ? { keyFilename: keyFilePath } : { apiKey: apiKey };
        const vertex = new VertexAI({ project: projectId, location: location, googleAuthOptions: authOptions });
        
        const model = vertex.getGenerativeModel({ model: defaultModelId });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: { responseModalities: ['IMAGE'] }
        });

        const response = await result.response;
        const parts = response.candidates[0].content.parts;
        for (const part of parts) {
            if (part.inlineData) {
                const imageBytes = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync(outputPath, imageBytes);
                return true;
            }
        }
        return false;
    }

    try {
        // 1. 기본 지역 (us-central1 등) 시도
        if (await tryGenerate(process.env.GCP_LOCATION || 'us-central1')) return outputPath;
    } catch (e) {
        console.warn(`⚠️ [Thumbnail] 기본 지역 생성 실패: ${e.message}. 글로벌 지역으로 우회합니다.`);
    }

    // 2. 글로벌 지역 (global) 시도
    try {
        if (await tryGenerate('global')) return outputPath;
    } catch (e) {
        console.warn(`⚠️ [Thumbnail] 글로벌 지역 생성 실패: ${e.message}. Direct Bridge로 최종 시도합니다.`);
    }

    // 3. Direct AI Bridge (API Key 직접 통신) - 최후의 수단이자 가장 강력한 수단
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.VERTEX_AI_KEY;
        if (apiKey && apiKey.startsWith('AIza')) {
            const directModelId = "gemini-3.1-flash-image-preview"; // 최신 플래시 이미지 모델 사용
            console.log(`🚀 [Thumbnail] Direct Bridge 호출 중... (Model: ${directModelId})`);
            
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: directModelId });
            
            // 타임아웃 60초 설정 (이미지 생성은 시간이 걸림)
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                generationConfig: { 
                    responseModalities: ['IMAGE'],
                    maxOutputTokens: 2048 
                }
            });

            const response = await result.response;
            const parts = response.candidates[0].content.parts;
            for (const part of parts) {
                if (part.inlineData) {
                    const imageBytes = Buffer.from(part.inlineData.data, 'base64');
                    fs.writeFileSync(outputPath, imageBytes);
                    console.log(`✅ [Thumbnail] Direct Bridge(${directModelId})를 통해 고유 아트워크 생성 성공!`);
                    return outputPath;
                }
            }
        }
    } catch (e) {
        console.warn(`⚠️ [Thumbnail] Direct Bridge 시도 실패: ${e.message}`);
        // [Safety Fallback] 만약 2.5가 안되면 3.1-preview로 한 번 더 시도
        try {
             const { GoogleGenerativeAI } = require('@google/generative-ai');
             const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY || process.env.VERTEX_AI_KEY);
             const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-image-preview" });
             const result = await model.generateContent({
                 contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                 generationConfig: { responseModalities: ['IMAGE'] }
             });
             const parts = (await result.response).candidates[0].content.parts;
             for (const part of parts) {
                if (part.inlineData) {
                    fs.writeFileSync(outputPath, Buffer.from(part.inlineData.data, 'base64'));
                    console.log(`✅ [Thumbnail] Direct Bridge(3.1-preview)로 이미지 복구 성공!`);
                    return outputPath;
                }
             }
        } catch(innerE) {
            console.error(`❌ [Thumbnail] 모든 Direct Bridge 경로 실패`);
            throw innerE;
        }
    }

    throw new Error('모든 엔진에서 이미지를 생성하지 못했습니다.');
}

// ============================================================
//  [엔진 3] 로컬 ComfyUI (무료! 무제한)
// ============================================================
async function generateWithComfy(prompt, outputPath, isVertical = false, visualConfig = {}) {
    const comfy = require('./comfy_client');
    
    // 서버 가동 여부 확인
    const alive = await comfy.isAlive();
    if (!alive) {
        throw new Error('ComfyUI 서버가 응답하지 않습니다. 프로그램을 실행 중인지 확인하세요.');
    }

    const params = {
        prompt: prompt,
        negativePrompt: visualConfig.negativePrompt,
        workflow: visualConfig.workflow,
        isVertical: isVertical
    };

    return await comfy.generate(params, outputPath);
}

// ============================================================
//  [통합 라우터] 설정에 따라 적절한 엔진으로 분배 (실패 시 상호 백업)
// ============================================================
async function generateAIImage(prompt, outputPath, isVertical = false, themeName = null) {
    const provider = getImageProvider();
    
    // [FIX 2026-04-20] 무작위성(Randomness) 강제 주입: 시드가 없으면 AI는 비슷한 결과물만 냅니다.
    const seed = Math.floor(Math.random() * 1000000);
    const randomizedPrompt = `${prompt} -- Seed: ${seed}, Unique Variation: ${Date.now()}`;

    // 테마별 비주얼 설정 로드
    const visualConfig = themeName ? promptEngineer.getVisualConfig(themeName) : {};

    try {
        console.log(`🎨 [AI Artist] 고유한 아트워크 생성 중... (Seed: ${seed})`);
        if (provider === 'comfy') {
            return await generateWithComfy(randomizedPrompt, outputPath, isVertical, visualConfig);
        } else if (provider === 'imagen') {
            return await generateWithImagen(randomizedPrompt, outputPath, isVertical);
        } else {
            return await generateWithGeminiFlash(randomizedPrompt, outputPath, isVertical);
        }
    } catch (error) {
        console.error(`❌ [${provider.toUpperCase()}] 생성 치명적 실패: ${error.message}`);
        // [FIX 2026-04-20] 대표님 지시에 따라 우회 로직(로컬 폴백)을 완전히 제거합니다.
        throw new Error(`AI 이미지 생성 엔진 접근 불가: ${error.message}`);
    }
}

// ============================================================
//  [썸네일 생성] AI 이미지 + 텍스트 오버레이
// ============================================================
async function createDynamicThumbnail(sourcePath, outputPath, genre, mood, themeName = null) {
    try {
        const provider = getImageProvider();
        console.log(`\n[그래픽 디자인 봇] AI 썸네일 생성 중... (엔진: ${provider.toUpperCase()}${themeName ? `, 테마: ${themeName}` : ""})`);

        const moodVibe = themeName ? promptEngineer.themes[themeName].vibe : mood;
        const basicIdea = `Main thumbnail for ${themeName || genre} music channel. ${moodVibe}. Luxurious and professional setting.`;
        
        // [image-pro] 하이엔드 프롬프트로 변환
        const thumbPrompt = await promptEngineer.generateImageProPrompt(basicIdea, themeName);

        const tempPath = outputPath + '.tmp.png';
        try {
            await generateAIImage(thumbPrompt, tempPath, false, themeName);
        } catch (e) {
            console.warn(`⚠️ 썸네일 AI 생성 실패, 로컬 원본을 사용합니다: ${e.message}`);
            if (fs.existsSync(sourcePath)) {
                await fs.copy(sourcePath, tempPath);
            } else {
                throw new Error('AI 생성 실패 및 로컬 원본 부재로 작업을 중단합니다.');
            }
        }

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
async function createSlideVariants(sourcePath, slidesDir, genre, mood, themeName = null) {
    try {
        const provider = getImageProvider();
        console.log(`\n[AI 아트 디렉터] 슬라이드 5장을 AI로 제작합니다... (엔진: ${provider.toUpperCase()})`);

        fs.ensureDirSync(slidesDir);
        const existingFiles = fs.readdirSync(slidesDir).filter(f => f.startsWith('slide_'));
        existingFiles.forEach(f => fs.removeSync(path.join(slidesDir, f)));

        const basicSlideIdeas = [
            `Close-up shot of hands playing a ${genre} instrument, soft lighting, focus on texture.`,
            `Panoramic view of a futuristic lounge or cafe optimized for ${genre} vibe.`,
            `Abstract visual representation of ${mood} sound waves and light particles.`,
            `Wide shot of a cinematic cityscape or landscape during golden hour.`,
            `Detailed still life with ${genre} equipment and warm ambient light.`
        ];

        const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontSubtitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

        const slidePaths = [];

        for (let i = 0; i < basicSlideIdeas.length; i++) {
            const rawPath = path.join(slidesDir, `slide_raw_${i + 1}.png`);
            const finalPath = path.join(slidesDir, `slide_${i + 1}.png`);

            console.log(`  🤖 슬라이드 ${i + 1}/5 [image-pro] 프롬프트 설계 및 생성 중...`);
            
            // [image-pro] 각 슬라이드마다 고유한 하이엔드 프롬프트 생성
            const proPrompt = await promptEngineer.generateImageProPrompt(basicSlideIdeas[i], themeName);

            try {
                await generateAIImage(proPrompt, rawPath);
            } catch (e) {
                console.warn(`  ⚠️ 슬라이드 AI 생성 실패, 로컬 원본으로 대체합니다.`);
                await fs.copy(sourcePath, rawPath);
            }

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
async function createLyricThemedImages(lyrics, theme, genre, mood, category = "General") {
    try {
        const provider = getImageProvider();
        console.log(`\n[AI 비주얼 디렉터] 가사 및 테마를 반영한 이미지 3장을 제작합니다... (엔진: ${provider.toUpperCase()})`);

        const promptEngineer = require('./prompt_engineer');
        const scenes = await promptEngineer.generateVisualScenes(lyrics, theme);

        const lyricsDir = path.join(__dirname, '../../images', 'lyrics', category);
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
            try {
                await generateAIImage(masterPrompt, outputPath);
            } catch (e) {
                console.warn(`  ⚠️ 가사 이미지 AI 생성 실패, 기본 썸네일을 활용합니다.`);
                // images/sample_thumb.png를 기본으로 사용
                const defaultSample = path.join(__dirname, '../../images', 'sample_thumb.png');
                await fs.copy(defaultSample, outputPath);
            }

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
