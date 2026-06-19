'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const { fetchYouTubeTrends } = require('./youtube_analyzer');
const systemKnowledge = require('./system_knowledge');
const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * PromptEngineer Class (v4.0 - Advanced Agentic Strategy)
 * 담당: 실시간 테마 분석, 최적화 테마 선정, Lyria 3용 정밀 프롬프트 및 메타데이터 생성
 */
class PromptEngineer {
    constructor() {
        require('dotenv').config();
        
        // [긴급 수정] Google Cloud 인증 강제 주입
        if (process.env.GCP_KEY_FILE) {
            process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GCP_KEY_FILE;
            console.log(`🔑 [Prompt Engineer] Auth Key 로드 중: ${process.env.GCP_KEY_FILE}`);
        }

        this.memoryPath = path.join(__dirname, '../../memory/lessons_learned.json');
        this.memory = this.loadMemory();
        
        const projectId = process.env.GCP_PROJECT_ID;
        const location = process.env.GCP_LOCATION || 'us-central1'; // [RESTORE] 미국 리전으로 복귀
        // [대표님 지시] 지정된 경로의 JSON 인증 파일을 모든 서비스의 마스터키로 사용
        const keyFilePath = process.env.GCP_KEY_FILE || path.join("F:\\ProJectHome\\Google VerTax Key\\Google VerTax Key_glassidentt.tube@gmail.com", "glassidentt-tube-a8e1a681bea2.json");

        if (projectId && keyFilePath) {
            console.log(`🔑 [PromptEngineer] 대표님 지정 인증서 로드 중: ${keyFilePath}`);
            
            const authOptions = { keyFilename: keyFilePath };

            // 1. Vertex AI Regional (us-central1)
            this.vertexAI = new VertexAI({
                project: projectId,
                location: location,
                googleAuthOptions: authOptions
            });

            // 2. Vertex AI Global (최신 모델 가용성 확보)
            this.vertexAIGlobal = new VertexAI({
                project: projectId,
                location: 'global',
                googleAuthOptions: authOptions
            });

            console.log(`✅ [Prompt Engineer] 대표님 마스터키 기반 Hybrid AI Bridge 준비 완료`);
        } else {
            console.error('❌ [Prompt Engineer] 대표님 인증 설정(JSON 파일)이 누락되었습니다.');
        }
        
        // [안정화] 초절전 모드를 위해 고비용(Pro) 모델 제거 및 Flash 단독 운영
        this.availableModelIds = [
            "models/gemini-3.1-flash-lite-preview",
            "models/gemini-2.5-flash",
            "models/gemini-flash-latest"
        ];

        // 3. Google AI SDK (Direct Bridge - API Key 방식)
        const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.VERTEX_AI_KEY;
        if (apiKey && apiKey.startsWith('AIza')) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            console.log(`🚀 [Prompt Engineer] Direct AI Bridge (API Key) 활성화됨`);
        }
        
        // ─────────────────────────────────────────────
        // 1. 테마 정의 (Genre-Mood-Instrumental 조합)
        // ─────────────────────────────────────────────
        const standardNegative = "cartoon, anime, sketches, worst quality, low quality, (deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation";

        this.themes = {
            "OZ CAFE": {
                genre: "Jazz / Lounge",
                mood: "Sophisticated, Warm, Relaxing",
                vibe: "A quiet high-end virtual cafe with the sound of distant rain and clinking cups.",
                persona: "A world-class jazz bar owner who values the soul of acoustic instruments and a quiet evening atmosphere.",
                constraints: "No aggressive synth leads, No heavy dance beats, No high-pitched electronic noises.",
                isInstrumental: true,
                baseWeight: 1.0,
                visualNegativePrompt: standardNegative,
                visualWorkflow: "basic_v1"
            },
            "Classical Grand": {
                genre: "Classical / Orchestral",
                mood: "Grand, Inspiring, Heroic",
                vibe: "A majestic concert hall with a full symphony orchestra, golden hour lighting through high windows.",
                persona: "A visionary conductor who creates epic orchestral masterpieces for film scores.",
                constraints: "No electronic synths, No drum machines, No modern pop vocals.",
                isInstrumental: true,
                baseWeight: 0.9,
                visualNegativePrompt: "modern technology, cars, skyscrapers, (distorted instruments:1.2), worst quality, low quality, blurry",
                visualWorkflow: "basic_v1"
            },
            "Nature Sanctuary": {
                genre: "Ambient / Natural ASMR",
                mood: "Healing, Ethereal, Pure",
                vibe: "Deep ancient forest with wind chimes, flowing water, and evolving synth pads.",
                persona: "An eco-acoustic sound designer who captures the heartbeat of nature using organic textures.",
                constraints: "No artificial percussion, No repetitive synth arpeggios, No sudden tempo changes.",
                isInstrumental: true,
                baseWeight: 0.8,
                visualNegativePrompt: "city, buildings, technology, cars, people, worst quality, low quality, blurry, text, (distorted nature:1.2)",
                visualWorkflow: "basic_v1"
            },
            "Euro Synth Night": {
                genre: "Synthwave / Electronic",
                mood: "Energetic, Driving, Retro-future",
                vibe: "A high-speed drive through a neon-lit futuristic city at midnight.",
                persona: "A synth-obsessed driver who lives for the pulse of 80s retro-futurism.",
                constraints: "No acoustic piano, No soft folk elements, No orchestral strings.",
                isInstrumental: true,
                baseWeight: 1.1,
                visualNegativePrompt: "nature, rural, sunlight, bright colors, worst quality, low quality, blurry, text",
                visualWorkflow: "basic_v1"
            },
            "Lofi Study Room": {
                genre: "Lofi Hip Hop / Chillhop",
                mood: "Focus, Millennial, Calm",
                vibe: "A cozy bedroom late at night, a desk lamp glowing, soft vinyl crackle.",
                persona: "A legendary midnight lo-fi beatmaker known for warm analog saturation and emotional nostalgia.",
                constraints: "No loud vocals, No aggressive drums, No orchestral elements, No high-energy build-ups.",
                isInstrumental: true,
                baseWeight: 1.2,
                visualNegativePrompt: "realistic, photo, 3d, worst quality, low quality, blurry, watermark, text, signature, hands, fingers",
                visualWorkflow: "basic_v1"
            },
            "Biophilic Cyberpunk Sanctuary": {
                genre: "Cyber-Lofi / Botanical Ambient",
                mood: "Futuristic, Serene, Immersive",
                vibe: "A high-tech cyberpunk cityscape seen through the lush leaves of a hidden indoor botanical garden.",
                persona: "A futuristic environmental architect who balances cold technology with organic biological life sounds.",
                constraints: "No traditional jazz instruments, No retro 80s synthwave tropes, No aggressive dubstep wobbles.",
                isInstrumental: true,
                baseWeight: 2.0,
                visualNegativePrompt: "rural, historical, steampunk, worst quality, low quality, blurry, text",
                visualWorkflow: "basic_v1"
            },
            "Power Metal": {
                genre: "Heavy Metal / Power Metal",
                mood: "Aggressive, Powerful, Fast",
                vibe: "A chaotic battlefield at night, lightning striking a dark fortress, epic energy.",
                persona: "A legendary metal guitarist known for blistering speed, heavy distortion, and epic anthemic energy.",
                constraints: "No soft piano, No acoustic instruments, No jazz harmonies, No silence.",
                isInstrumental: true,
                baseWeight: 1.5,
                visualNegativePrompt: "peaceful, soft colors, nature, flowers, worst quality, low quality, blurry",
                visualWorkflow: "basic_v1"
            },
            "Pop Ballad": {
                genre: "K-Pop Ballad / Emotional Pop",
                mood: "Sentimental, Sad, Heartfelt",
                vibe: "A lonely street under a single streetlight after rain, memories fading.",
                persona: "A hit ballad producer who specializes in tear-jerking melodies and grand emotional build-ups.",
                constraints: "No heavy distorted guitars, No fast dance beats, No aggressive rapping.",
                isInstrumental: true,
                baseWeight: 1.0,
                visualNegativePrompt: "happy, bright colors, party, worst quality, low quality, blurry",
                visualWorkflow: "basic_v1"
            },
            "Traditional Trot": {
                genre: "Traditional Korean Trot",
                mood: "Cheerful, Nostalgic, Rhythmic",
                vibe: "A vibrant traditional market festival, neon signs of old Korea, high energy and soul.",
                persona: "A master of Korean Trot who understands the unique 'Heung' and 'Han' with rhythmic 4/4 beats.",
                constraints: "No dark ambient textures, No heavy metal elements, No slow classical orchestral form.",
                isInstrumental: true,
                baseWeight: 1.2,
                visualNegativePrompt: "futuristic, cyberpunk, dark, worst quality, low quality, blurry",
                visualWorkflow: "basic_v1"
            }
        };

        // ─────────────────────────────────────────────
        // 2. 음악 이론 가중치 (Lyria 3를 위한 상세 설정)
        // ─────────────────────────────────────────────
        this.musicTheory = {
            "OZ CAFE": { bpm: "70-90", key: "Major 7th chords, Dorian mode", instruments: "Electric Piano, Upright Bass, Soft Brushed Drums, Muted Trumpet" },
            "Classical Grand": { bpm: "60-100", key: "Orchestral, Modal", instruments: "Grand Piano, Violin Section, Cello, French Horn, Timpani" },
            "Nature Sanctuary": { bpm: "Ambient (No clear beat)", key: "Lydian, Ethereal fixed drones", instruments: "Crystal Pads, Bamboo Flute, Water drops, Wind chimes" },
            "Euro Synth Night": { bpm: "100-115", key: "Aeolian, Dark Minor", instruments: "Analog Saw Synths, Retro Electronic Drums with Reverb, Arpeggiated Bass" },
            "Lofi Study Room": { bpm: "80-90", key: "Minor 9th, Jazzy progressions", instruments: "Vintage Sampler Drums, Detuned Piano, Sub Bass, Ambient vinyl noise" },
            "Biophilic Cyberpunk Sanctuary": { bpm: "72 (Heart-beat sync)", key: "C# Minor (Mysterious Sanctuary)", instruments: "Warm Analog Pads, Rain on glass ASMR, Bio-rhythmic pulses, Soft piano, Digital glitches" },
            "Power Metal": { bpm: "160-180", key: "E Minor, Power chords", instruments: "Distorted Electric Guitar, Double-bass Blast Beats, Heavy Electric Bass" },
            "Pop Ballad": { bpm: "65-75", key: "Eb Major, Emotional strings", instruments: "Grand Piano, Orchestral Strings, Soft Acoustic Drums, Clean Guitar" },
            "Traditional Trot": { bpm: "120-130", key: "A Major (Pentatonic scale)", instruments: "Accordion, Saxophone, Electric Organ, 4/4 Trot Rhythm Section" }
        };

        // ─────────────────────────────────────────────
        // 3. 썸네일 컨셉
        // ─────────────────────────────────────────────
        this.thumbnailConcepts = {
            "OZ CAFE": { style: "Oil painting of a rainy cafe window", colorPalette: ["Warm Gold", "Rainy Blue", "Amber"], text: "Café Jazz" },
            "Classical Grand": { style: "Epic cinematic shot of a majestic concert hall", colorPalette: ["Gold", "Velvet Red", "Dark Oak"], text: "Grand Classics" },
            "Nature Sanctuary": { style: "Atmospheric macro shot of ancient forest moss and dew", colorPalette: ["Emerald Green", "Mist Gray", "Soft White"], text: "Nature Bliss" },
            "Euro Synth Night": { style: "Neon-lit retro-futuristic city with light trails", colorPalette: ["Neon Pink", "Deep Blue", "Purple"], text: "Synth Drive" },
            "Lofi Study Room": { style: "Anime aesthetic, purple night bedroom", colorPalette: ["Purple", "Indigo", "Soft Pink"], text: "Study Lofi" },
            "Biophilic Cyberpunk Sanctuary": { style: "Hyper-realistic 3D render, interior garden with neon city view", colorPalette: ["Leaf Green", "Neon Cyan", "Rainy Gray"], text: "Garden Haven" },
            "Power Metal": { style: "Epic fantasy battle illustration", colorPalette: ["Fiery Red", "Chrome Silver", "Black"], text: "Metal Storm" },
            "Pop Ballad": { style: "Soft focus portrait under a streetlight", colorPalette: ["Pale Blue", "Lavender", "Soft Gray"], text: "Soul Melodies" },
            "Traditional Trot": { style: "Vibrant retro neon market signs", colorPalette: ["Shocking Pink", "Golden Yellow", "Teal"], text: "Trot Fever" }
        };
    }

    /**
     * [롤백] 클라우드 전용 지능 호출 (실시간 모델 로테이션 탑재)
     */
    async askAI(prompt, systemPrompt = "You are the core intelligence of AI Music Agent OZ.") {
        if (!this.vertexAI) {
            console.error('❌ Vertex AI가 초기화되지 않았습니다.');
            return null;
        }

        const fullPrompt = `${systemPrompt}\n\nTask: ${prompt}`;
        let lastError = null;

        for (const mId of this.availableModelIds) {
            console.log(`📡 [Hybrid Bridge] '${mId}' 모델 분석 시도 중...`);
            
            // 1차 시도: Vertex AI Regional
            try {
                const regionalModel = this.vertexAI.getGenerativeModel({ model: mId });
                const result = await regionalModel.generateContent(fullPrompt);
                return result.response.text().trim();
            } catch (e) {
                if (e.message.includes('429') || e.message.includes('Quota') || e.message.includes('exhausted')) {
                    console.warn(`\n⚠️ [PromptEngineer] API 할당량 초과(429) 감지. 3분(180초) 대기 후 로테이션 계속...`);
                    await new Promise(r => setTimeout(r, 180 * 1000));
                }
                
                if (e.message.includes('not found') || e.status === 404) {
                    // [최적화] Regional 실패는 로깅만 하고, lessons_learned에는 기록하지 않음 (폴백이 있으므로)
                    console.warn(`📡 [Regional Fail] '${mId}' 리전에서 사용 불가. 다음 단계 시도...`);
                }
                lastError = e;
            }

            try {
                const globalModel = this.vertexAIGlobal.getGenerativeModel({ model: mId });
                const result = await globalModel.generateContent(fullPrompt);
                return result.response.text().trim();
            } catch (e) {
                lastError = e;
                if (e.message.includes('<!DOCTYPE')) {
                    console.error(`🚨 [HTML Error DETECTED] 구글 서버의 응답 원문 분석 중...`);
                    // 에러 페이지 내의 핵심 텍스트 추출 시도
                    const errorHints = e.message.substring(0, 1000); 
                    console.error(`Hint: ${errorHints}`);
                }
            }

            // 3차 시도: Direct AI Bridge (API Key 방식) - 가장 안정적
            if (this.genAI) {
                try {
                    console.log(`🚀 [Direct Bridge] '${mId}' 모델 직접 호출 중...`);
                    const model = this.genAI.getGenerativeModel({ model: mId });
                    const result = await model.generateContent(fullPrompt);
                    return result.response.text().trim();
                } catch (e) {
                    lastError = e;
                    console.warn(`⚠️ [Direct Bridge] '${mId}' 실패: ${e.message}`);
                }
            }
        }

        console.error('❌ [Hybrid Bridge] 대표님의 마스터키로 모든 시도가 실패했습니다. 마지막 에러:', lastError?.message);
        throw new Error(`AI 엔진 접근 불가: ${lastError?.message}`);
    }

    /**
     * [신규] 영상 제목 및 설명글을 5개국어(영어, 스페인어, 일본어, 독일어, 프랑스어)로 번역 및 최적화합니다.
     */
    async generateMultiLanguageMetadata(koTitle, koDescription) {
        console.log(`🌐 [Prompt Engineer] 다국어(영어, 스페인어, 일본어, 독일어, 프랑스어) 번역 생성 중...`);
        
        const promptTemplate = `
            Translate the following YouTube video Title and Description into English, Spanish, Japanese, German, and French.
            The translations should be natural, emotional, and optimized for YouTube SEO in each language (retaining any core keywords like [OZ], BGM, etc.).
            
            [Source Korean Title]
            ${koTitle}
            
            [Source Korean Description]
            ${koDescription}
            
            [Output Requirements]
            Respond ONLY with a valid JSON object matching the following structure. Do NOT add any extra text or markdown formatting outside the JSON:
            {
              "en": {
                "title": "translated english title",
                "description": "translated english description"
              },
              "es": {
                "title": "translated spanish title",
                "description": "translated spanish description"
              },
              "ja": {
                "title": "translated japanese title",
                "description": "translated japanese description"
              },
              "de": {
                "title": "translated german title",
                "description": "translated german description"
              },
              "fr": {
                "title": "translated french title",
                "description": "translated french description"
              }
            }
        `;
        
        try {
            const response = await this.askAI(promptTemplate, "You are a professional multi-lingual translator and YouTube localization expert.");
            if (!response) throw new Error("AI 번역 응답이 비어있음");
            
            const cleanJson = response.replace(/```json|```/g, '').trim();
            const translations = JSON.parse(cleanJson);
            return translations;
        } catch (err) {
            console.error("⚠️ 다국어 번역 생성 실패:", err.message);
            return {};
        }
    }

    /**
     * [Memory] 기술적 이슈 자동 기록 및 학습
     */
    logTechnicalIssue(issue, cause, solution) {
        const timestamp = new Date().toISOString();
        const newIssue = { timestamp, issue, cause, solution };
        
        // [안정화] technical_issues 필드 부재 시 초기화
        if (!Array.isArray(this.memory.technical_issues)) {
            this.memory.technical_issues = [];
        }
        
        // 중복 체크 (최근 5건 이내 동일 이슈 방지)
        const isDuplicate = this.memory.technical_issues.slice(-5).some(item => item.issue === issue);
        
        if (!isDuplicate) {
            console.log(`💾 [Memory] 새 기술 이슈를 기억 저장소에 기록합니다: ${issue}`);
            this.memory.technical_issues.push(newIssue);
            // 최신 50건만 유지 (데이터 비대화 방지)
            if (this.memory.technical_issues.length > 50) {
                this.memory.technical_issues.shift();
            }
            this.saveMemory(this.memory);
        }
    }

    /**
     * [Emergency] 로컬 Ollama 엔진 호출
     */
    async askOllama(prompt, systemPrompt = "") {
        const fetch = (await import('node-fetch')).default;
        const url = process.env.OLLAMA_URL || 'http://localhost:11434';
        const model = process.env.OLLAMA_MODEL || 'gemma4:e4b';

        console.log(`🤖 [Ollama] 로컬 모델 (${model})을 통해 지능 복구 중...`);
        
        try {
            const response = await fetch(`${url}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: `${systemPrompt}\n\nTask: ${prompt}\n\nResponse (JSON format if requested):`,
                    stream: false
                }),
                timeout: 30000 // 30초 타임아웃
            });

            if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
            
            const data = await response.json();
            return data.response ? data.response.trim() : null;
        } catch (err) {
            console.error('⚠️ Ollama 통신 실패:', err.message);
            throw err;
        }
    }

    // ── 데이터 관리 (학습 데이터) ───────────────
    reload() {
        console.log('🔄 [Prompt Engineer] 데이터 리로드 수행 중...');
        // 현재는 메모리 파일만 다시 읽음 (동적 확장을 위해)
        return this.loadMemory();
    }

    loadMemory() {
        const defaults = { 
            successful_genres: [], 
            technical_issues: [], 
            external_trends: [], 
            performance_history: [] 
        };
        try {
            if (fs.existsSync(this.memoryPath)) {
                const loaded = JSON.parse(fs.readFileSync(this.memoryPath, 'utf8'));
                // 기존 데이터와 기본값 병합 (데이터 구조 변경 대응)
                return { ...defaults, ...loaded };
            }
        } catch (e) {
            console.warn('Memory load failed:', e.message);
        }
        return defaults;
    }

    saveMemory(memory) {
        try {
            fs.writeFileSync(this.memoryPath, JSON.stringify(memory, null, 2));
        } catch (e) {
            console.error('Memory save failed:', e.message);
        }
    }

    // ── 핵심: 최적의 테마 자동 선정 (70:20:10 전략 + 테마 다양성 강제) ────

    /**
     * [FIX 2026-04-20] 최근 사용된 테마 이력을 디스크에서 로드합니다.
     * @returns {Array<{date: string, theme: string}>}
     */
    _loadThemeHistory() {
        const historyPath = path.join(__dirname, '../../memory/theme_history.json');
        try {
            if (fs.existsSync(historyPath)) {
                return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            }
        } catch (e) {
            console.warn('⚠️ 테마 이력 로드 실패:', e.message);
        }
        return [];
    }

    /**
     * [FIX 2026-04-20] 오늘 사용된 테마를 디스크에 기록합니다.
     * @param {string} themeName 사용된 테마 이름
     */
    _recordThemeUsage(themeName) {
        const historyPath = path.join(__dirname, '../../memory/theme_history.json');
        try {
            let history = this._loadThemeHistory();
            const today = new Date().toISOString().split('T')[0];
            history.push({ date: today, theme: themeName });
            // 최근 30일치만 유지
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            history = history.filter(h => h.date >= thirtyDaysAgo);
            fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
        } catch (e) {
            console.warn('⚠️ 테마 이력 저장 실패:', e.message);
        }
    }

    /**
     * [FIX 2026-04-20] 최근 N일 내 사용된 테마 목록을 반환합니다.
     * @param {number} days 확인할 일수
     * @returns {string[]} 최근 사용된 테마 이름 배열
     */
    _getRecentThemes(days = 3) {
        const history = this._loadThemeHistory();
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return [...new Set(history.filter(h => h.date >= cutoff).map(h => h.theme))];
    }

    async selectOptimalTheme() {
        console.log('\n🧠 [Prompt Engineer] 최적의 음악 테마 분석 중...');
        const memory = this.loadMemory();
        let trendScores = {};
        try {
            trendScores = await fetchYouTubeTrends();
        } catch (e) {
            console.warn('⚠️ 트렌드 분석 실패 (기본값 사용):', e.message);
        }

        // [FIX 2026-04-20] 최근 3일간 사용된 테마 확인 (다양성 강제)
        const recentThemes = this._getRecentThemes(3);
        console.log(`📊 [Anti-Repeat] 최근 3일 내 사용된 테마: [${recentThemes.join(', ') || '없음'}]`);

        // [Tier 1 전략] 핵심 테마 분석은 고성능 클라우드 지능(또는 상호검증) 우선 사용
        const trendSummary = Object.entries(trendScores).map(([k, v]) => `${k}:${v}`).join(', ');
        const strategicPrompt = `
            Current YouTube Trend Data: ${trendSummary}
            Previous Success Keywords: ${JSON.stringify(memory.successful_genres || [])}
            Available Theme List: ${Object.keys(this.themes).join(', ')}

            ⚠️ CRITICAL CONSTRAINT: The following themes were used recently and MUST NOT be selected today:
            Recently Used (BANNED): [${recentThemes.join(', ') || 'None'}]

            Based on the data above, select ONE theme (that is NOT in the BANNED list) that is expected to have the highest performance (views) today and briefly explain why.
            Response format: "Selected Theme: [Theme Name] | Reason: [Reason]"
        `;

        // 💡 중요 결정 (클라우드 전용 엔진 호출)
        const aiResponse = await this.askAI(strategicPrompt, "You are a professional music business strategist.");
        if (aiResponse && aiResponse.includes('Selected Theme:')) {
            const match = aiResponse.match(/Selected Theme:\s*([^|]+)/);
            if (match) {
                const selected = match[1].trim();
                // [FIX] AI가 최근 테마를 선택한 경우에도 차단
                if (this.themes[selected] && !recentThemes.includes(selected)) {
                    console.log(`🎯 [Tier 1 Intelligence] Strategy-focused theme selected: ${selected}`);
                    console.log(`📝 Analysis Report: ${aiResponse.split('|')[1] || 'Optimization complete'}`);
                    this._recordThemeUsage(selected);
                    return selected;
                } else if (recentThemes.includes(selected)) {
                    console.log(`⚠️ [Anti-Repeat] AI가 최근 사용 테마 '${selected}'를 선택했으나 차단합니다.`);
                }
            }
        }
        console.log('⚠️ [AI Strategy] 분석 결과 부적합, 가중치 기반 알고리즘으로 전환합니다.');
        
        // [70:20:10 전략] 탐험(Exploration) 모드 결정 (10%)
        const isExplorationMode = Math.random() < 0.1;
        if (isExplorationMode) {
            // 탐험 모드에서도 최근 테마 제외
            const availableThemes = Object.keys(this.themes).filter(t => !recentThemes.includes(t));
            if (availableThemes.length > 0) {
                const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
                console.log(`🎲 [70:20:10 전략] Exploration Mode 발동! 새로운 시도: ${randomTheme}`);
                this._recordThemeUsage(randomTheme);
                return randomTheme;
            }
        }

        const candidates = [];
        const now = new Date();
        const currentHour = now.getHours();
        const currentMonth = now.getMonth() + 1;

        for (const [name, theme] of Object.entries(this.themes)) {
            let score = theme.baseWeight;

            // 1) YouTube 트렌드 가중치
            const trendBonus = (trendScores[name] || 0) * 0.05;
            score += trendBonus;

            // 2) 성능 데이터 보너스
            const history = (memory.performance_history || []).find(h => h.theme === name);
            if (history) {
                if (history.ctr > 5.0) score += 0.3;
                if (history.avgWatchTime > 600) score += 0.2;
            }

            // 3) 계절성 가중치
            if ([3, 4, 5].includes(currentMonth) && name === "Spring Blossom Walk") score += 0.5;
            if ([6, 7, 8].includes(currentMonth) && name === "Seoul Rainy Day") score += 0.4;

            // 4) 시간대별 가중치
            if ((currentHour >= 22 || currentHour <= 4) && ["Midnight Chill", "Deep Sleep Therapy", "Midnight Solstice Afro"].includes(name)) score += 0.6;
            if ((currentHour >= 8 && currentHour <= 17) && ["Lofi Study Room", "OZ CAFE"].includes(name)) score += 0.4;

            // 5) 기술적 이슈 페널티
            const issue = (memory.technical_issues || []).find(i => i.theme === name);
            if (issue) score -= 0.5;

            // 6) [FIX 2026-04-20] 최근 사용 테마 강력 페널티 (-1.5)
            if (recentThemes.includes(name)) {
                score -= 1.5;
                console.log(`  📉 [Anti-Repeat] '${name}' 최근 사용 페널티 적용 (-1.5)`);
            }

            candidates.push({ name, score });
        }

        candidates.sort((a, b) => b.score - a.score);
        const selected = candidates[0].name;

        console.log(`🎯 최종 선정된 테마: ${selected} (최종 점수: ${candidates[0].score.toFixed(2)})`);
        // [FIX] 선정된 테마를 디스크에 기록
        this._recordThemeUsage(selected);
        return selected;
    }

    /**
     * [비용 최적화] 안티그래비티의 2중 검토가 필요한지 판단합니다.
     * @param {string} themeName 테마 이름
     * @param {object} memory 학습 데이터
     * @returns {boolean} 검토 필요 여부
     */
    checkReviewNecessity(themeName, memory) {
        // 1. 새로운 테마이거나 학습 데이터가 부족한 경우 (필수 검토)
        const history = (memory.performance_history || []).find(h => h.theme === themeName);
        if (!history) return true;

        // 2. 최근 기술적 이슈가 있었던 장르 (필수 검토)
        const issue = (memory.technical_issues || []).find(i => i.theme === themeName);
        if (issue) return true;

        // 3. 성과 기반 자신감 점수 계산
        let confidence = 85; // 기본값
        if (history.ctr > 5.0) confidence += 10; // 높은 클릭률 시 자신감 상승
        if (history.avgWatchTime > 600) confidence += 5; // 높은 유지율 시 자신감 상승

        console.log(`🧠 [Self-Audit] ${themeName} 테마 자신감 점수: ${confidence} / 100`);
        
        // 90점 미만일 때만 안티그래비티 호출 (비용 절감)
        return confidence < 90;
    }

    // ── Lyria 3용 고기능성 프롬프트 생성 (Tier 2: Hybrid) ──────────
    async generateStructuredPrompt(index, isInst, themeName) {
        // [안정화] 테마 및 이론 데이터 부재 시 기본값 활용
        const theme = this.themes[themeName] || this.themes["OZ CAFE"];
        const theory = this.musicTheory[themeName] || this.musicTheory["OZ CAFE"];
        
        // [하이브리드 지능] 테마 타입 판별 (스테디셀러 vs 트렌드)
        const marketTrendsPath = path.join(__dirname, '../../memory/market_trends.json');
        const marketTrends = fs.existsSync(marketTrendsPath) 
            ? JSON.parse(fs.readFileSync(marketTrendsPath, 'utf8'))
            : null;
        
        const isSteady = marketTrends?.steady_sellers?.some(s => s.theme.includes(themeName) || themeName.includes(s.theme));
        const strategyType = isSteady ? "STEADY_SELLER (Classic & Comfort)" : "TOP_TREND (Innovative & Unique)";
        
        // [강력한 중복 방지] 고유 난수 및 시각적 변동성 추가
        const uniqueId = Math.random().toString(36).substring(7).toUpperCase();
        const timestamp = Date.now();

        console.log(`🎨 [Cloud Intelligence] Generating Track #${index + 1} for '${themeName}' (${strategyType})...`);

        // [V4 전략: Rule 28 & 101] 완급 조절 및 악기 다변화 로직
        const isSlow = (index % 2 === 0);
        const pacing = isSlow ? "Slow, Deep, Emotional, Steady Blue Note style" : "Fast, Energetic, Rhythmic, Vibrant Bebop style";
        
        // 테마별 악기 로테이션 풀
        const instrumentPools = {
            "OZ CAFE": ["Muted Trumpet", "Vintage Saxophone", "Vibraphone", "Trombone Solo", "Rhodes Piano"],
            "Classical Grand": ["Cello Solo", "Violin Section", "Grand Piano", "French Horn", "Harp"],
            "Euro Synth Night": ["Arpeggiated Saw Synth", "Analog Lead", "FM Bells", "Glitchy Percussion"],
            "Nature Sanctuary": ["Bamboo Flute", "Crystal Pads", "Water Percussion", "Deep Forest Drones"],
            "Lofi Study Room": ["Detuned Piano", "Old Guitar", " Rhodes with Tremolo", "Filtered Synth"]
        };
        const themePool = instrumentPools[themeName] || ["Acoustic Instruments"];
        const selectedFocus = themePool[index % themePool.length];

        console.log(`🎨 [V4 Strategy] Track #${index + 1}: ${pacing} | Focus: ${selectedFocus}`);

        const promptTemplate = `
            [Role & Mission]
            Your Persona: ${theme.persona}
            Strategic Mode: [${strategyType}]
            
            [V4 GROWTH STRATEGY: CRITICAL]
            - Pacing Context: This track MUST be [${pacing}].
            - Instrument Focus: This track MUST emphasize [${selectedFocus}] as the lead voice.
            - Diversity: DO NOT use generic tropes. Create a unique sonic identity for this specific track.
            - Random Seed: ${uniqueId} | Ref: ${timestamp}

            [Global YouTube Marketing & CTR Rule: CRITICAL]
            - DO NOT use generic titles like "Session #1", "Track #1", or abstract English like "Midnight Echoes".
            - Title MUST be a highly emotional, click-inducing Global YouTube playlist title. (e.g., "🎧 POV: You're studying in a rainy Tokyo cafe [Lofi/Chill]", "1 Hour of Dark Emotional Ambient to overthink to")
            - Each track MUST have a distinct musical character even within the same theme.

            [Instructional Framework: Chain-of-Thought]
            1. (Observe) Imagine a specific cinematic scene (e.g., 'A rainy Tuesday at 3 AM' or 'Neon reflections on a wet street').
            2. (Musical Detail) How does ${selectedFocus} express the mood of Step 1 with a ${isSlow ? 'slow' : 'fast'} tempo?
            3. (Translate) Express this into a technical prompt for Lyria 3 Pro.

            [Input Context]
            - Theme Name: ${themeName}
            - Mood/Vibe: ${theme.mood} | ${theme.vibe}
            - Technical Specs: BPM ${isSlow ? (theory.bpm.split('-')[0] || '70') : (theory.bpm.split('-')[1] || '110')}, Key ${theory.key}
            - Track Position: #${index + 1} / 10
            - Vocal Status: ${isInst ? "Instrumental" : "Vocal"}

            [Output JSON Requirements] - Respond ONLY with pure JSON:
            1. "reasoning_steps": Brief summary of your unique cinematic scene and how you used ${selectedFocus}.
            2. "fullPrompt": Advanced technical prompt for music generation (Max 400 chars).
            3. "lyrics": Lyrics (empty if instrumental).
            4. "storytellingTitle": Viral Global YouTube Playlist Title (e.g., "🎧 POV: You are studying in a cozy cabin during a blizzard [Lofi/Chill]").
            5. "shortsHook": Hooking text for global YouTube Shorts (e.g., "POV: you found the perfect song for late night drives", "Wait for the beat drop...").
            6. "seoTags": Array of 10 Global high-volume YouTube search tags (e.g., ["lofi hip hop", "study beats", "pov playlist", "chillhop", "dark academia"]).

            Note: The "fullPrompt" is the most important field for Lyria. Make it descriptive and unique to this specific track index.
        `;

        try {
            const response = await this.askAI(promptTemplate, theme.persona);
            
            if (!response) {
                throw new Error("AI 응답이 비어있음");
            }

            // JSON 응답 추출 (백틱 제거 등 처리)
            const cleanJson = response.replace(/```json|```/g, '').trim();
            const aiData = JSON.parse(cleanJson);

            if (aiData.reasoning_steps) {
                console.log(`🧠 [CoT Analysis] ${aiData.reasoning_steps}`);
            }

            const result = {
                fullPrompt: aiData.fullPrompt || `${theme.genre}, ${theme.mood}, ${theory.instruments}`,
                lyrics: isInst ? "" : (aiData.lyrics || ""),
                storytellingTitle: aiData.storytellingTitle || `${themeName} - Track ${index + 1}`,
                shortsHook: aiData.shortsHook || `${themeName} vibe for your busy day.`,
                seoTags: aiData.seoTags || this.generateViralMetadata(themeName).tags,
                components: {
                    theme: themeName,
                    genre: theme.genre,
                    mood: theme.mood,
                    vibe: theme.vibe
                }
            };

            return result;
        } catch (err) {
            console.error(`❌ [Prompt Generation Fail] 대표님 테마(${themeName}) 분석 치명적 실패:`, err.message);
            // [FIX 2026-04-20] 우회 금지: 대표님 요청 테마가 아닐 경우 제작 중단
            throw new Error(`테마 분석 및 프롬프트 생성 엔진 접근 불가: ${err.message}`);
        }
    }

    // ── 바이럴 요소 생성 (타이틀, 태그 등) ───────────
    generateViralMetadata(themeName) {
        const theme = this.themes[themeName] || { genre: "Lo-Fi", mood: "Chill", vibe: "Relaxing" };
        const tags = [
            "lofi hip hop", "study beats", "pov playlist", "chillhop", "ambient music",
            "relaxing music", "dark academia", "synthwave mix", "instrumental"
        ];

        return {
            tags: tags,
            descriptionHeader: `\nWelcome to OZ Music. Today's theme is ${themeName}.\n${theme.vibe}`
        };
    }

    /**
     * [image-pro] 하이엔드 시네마틱 프롬프트 엔진
     * 기본 아이디어를 마스터 프롬프트 아키텍처로 변환합니다.
     */
    async generateImageProPrompt(basicIdea, themeName = "OZ CAFE") {
        const theme = this.themes[themeName] || this.themes["OZ CAFE"];
        
        const systemPrompt = `
            You are a world-class Cinematic Art Director. 
            Your task is to transform a basic visual idea into a "Master Prompt Architecture" for high-end AI image generation.
            
            [Image-Pro Principles]
            1. Anti-Generic: Avoid plastic skin and excessive gloss.
            2. Analog Texture: Force analog grain, lens flare, and film imperfections.
            3. Cinematic Depth: Use optical characteristics (bokeh, shallow DOF).
            4. Atmosphere: Create 'air' and 'mood', not just a background.

            [Output Structure: String of 5 Layers]
            - Layer 1 (Core): The main subject and action.
            - Layer 2 (Style): Neo-cinematic, analog film texture, specific artistic mix.
            - Layer 3 (Detail): Hyper-real textures (pores, fabric weave, dust).
            - Layer 4 (Environment): Volumetric lighting, atmospheric haze, specific time of day.
            - Layer 5 (Technical): Camera gear (35mm, f/1.8), specific film stock (Kodak Portra 400 style).

            Respond ONLY with the final consolidated prompt string. Max 500 characters.
        `;

        const userPrompt = `
            Basic Idea: ${basicIdea}
            Theme Context: ${theme.vibe}
            Requirement: High-end Cinematic Masterpiece, 16:9 aspect ratio.
        `;

        try {
            const highEndPrompt = await this.askAI(userPrompt, systemPrompt);
            return highEndPrompt || basicIdea;
        } catch (e) {
            console.error('❌ [Image-Pro] 프롬프트 변환 실패:', e.message);
            return basicIdea;
        }
    }

    generateViralTitle(components) {
        // [OZ] 태그 컨벤션 유지 및 이모지 제거 (V4 호환)
        return `[OZ] ${components.storytellingTitle || components.mood + ' ' + components.genre} | ${components.theme} | AI Music Agent OZ`;
    }

    /**
     * [최적화] 이미 생성된 트랙에 대해 최소한의 메타데이터만 즉시 생성합니다.
     * AI 호출 없이 테마 기반으로 제목을 구성하여 병목을 제거합니다.
     */
    async generateMinimalMetadata(index, isInst, themeName) {
        const theme = this.themes[themeName] || this.themes["OZ CAFE"];
        const trackTitle = `${themeName} Session #${index + 1} (${isInst ? 'Inst.' : 'Vocal'})`;
        
        return {
            storytellingTitle: trackTitle,
            shortsHook: `${themeName}의 감성을 느껴보세요.`,
            seoTags: [themeName, theme.genre, "OZ Music", "AI BGM"],
            components: {
                theme: themeName,
                genre: theme.genre,
                mood: theme.mood,
                vibe: theme.vibe
            }
        };
    }


    /**
     * [시각화 지능] 가사와 테마를 바탕으로 3가지 시각적 장면(Scene)을 생성합니다.
     * @param {string} lyrics 가사 전문
     * @param {string} theme 테마명
     * @returns {Array} 장면 객체 배열
     */
    async generateVisualScenes(lyrics, theme) {
        console.log(`👁️ [Visual Engine] '${theme}' 테마 기반 시각화 장면 분석 중...`);
        
        const defaultScenes = [
            { goal: "A tranquil rainy window of a high-end jazz cafe, soft reflections", mood: "Cinematic" },
            { goal: "Close-up of a vintage piano keys with luxury amber lighting", mood: "Elegant" },
            { goal: "A sophisticated silhouette of a musician in a dreamy neon lounge", mood: "Ethereal" }
        ];

        try {
            // [Tier 3] 장면 묘사는 효율적인 로컬/Flash 지능으로 충분
            const analysisPrompt = `
                Theme: ${theme}
                Lyrics Snippet: ${lyrics ? lyrics.substring(0, 200) : "N/A"}
                Task: Create 3 cinematic visual scene descriptions for AI image generation. 
                Each scene should reflect the lyrics and theme.
                Output JSON Format: [{"goal": "description...", "mood": "mood..."}]
            `;

            // FAST_MODE 시 분석 건너뜀
            if (process.env.FAST_MODE === 'true') {
                return defaultScenes;
            }

            const response = await this.askAI(analysisPrompt, "You are a professional cinematic visual director.");
            const jsonMatch = response.match(/\[.*\]/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error(`❌ [Visual Scene Fail] 대표님 요청(${theme}) 시각화 분석 실패:`, e.message);
            throw new Error(`비주얼 장면 분석 엔진 접근 불가: ${e.message}`);
        }
    }

    // ── 시청자 참여 유도 질문 생성 (고정 댓글용) ──────────────────
    async generateEngagementQuestion() {
        const prompt = "Generate a single, warm, and poetic engagement question for a music channel's pinned comment. The question should be related to the day's music theme and emotional vibe, inviting viewers to share their thoughts. Respond with ONLY the question in English.";
        try {
            const response = await this.askAI(prompt, "You are a sensitive and communicative emotional YouTuber who connects deeply with your global audience.");
            return response || "What kind of scenery does this music bring to your mind today? ✨";
        } catch (err) {
            return "How about taking a momentary break with this melody today? ✨";
        }
    }

    /**
     * [시각화 최적화] 테마에 최적화된 비주얼 구성 파라미터를 추출합니다.
     */
    getVisualConfig(themeName) {
        const theme = this.themes[themeName] || this.themes["OZ CAFE"];
        const concept = this.thumbnailConcepts[themeName] || { style: "Atmospheric abstract music visual", colorPalette: ["Gray"], text: "Music" };

        return {
            workflow: theme.visualWorkflow || "basic_v1",
            negativePrompt: theme.visualNegativePrompt,
            style: concept.style,
            colorPalette: concept.colorPalette,
            text: concept.text
        };
    }

}

module.exports = new PromptEngineer();
