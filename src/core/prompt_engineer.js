'use strict';

const fs = require('fs');
const path = require('path');
const { fetchYouTubeTrends } = require('./youtube_analyzer');

/**
 * PromptEngineer Class (v4.0 - Advanced Agentic Strategy)
 * 담당: 실시간 테마 분석, 최적화 테마 선정, Lyria 3용 정밀 프롬프트 및 메타데이터 생성
 */
class PromptEngineer {
    constructor() {
        this.memoryPath = path.join(__dirname, '../../memory/lessons_learned.json');
        
        // ─────────────────────────────────────────────
        // 1. 테마 정의 (Genre-Mood-Instrumental 조합)
        // ─────────────────────────────────────────────
        this.themes = {
            "OZ CAFE": {
                genre: "Jazz / Lounge",
                mood: "Sophisticated, Warm, Relaxing",
                vibe: "A quiet high-end virtual cafe with the sound of distant rain and clinking cups.",
                isInstrumental: true,
                baseWeight: 1.0
            },
            "Lofi Study Room": {
                genre: "Lofi Hip Hop / Chillhop",
                mood: "Focus, Millennial, Calm",
                vibe: "A cozy bedroom late at night, a desk lamp glowing, soft vinyl crackle.",
                isInstrumental: true,
                baseWeight: 1.2
            },
            "Nature/ASMR Sanctuary": {
                genre: "Ambient / Organic ASMR",
                mood: "Healing, Ethereal, Pure",
                vibe: "Deep ancient forest with wind chimes, flowing water, and evolving synth pads.",
                isInstrumental: true,
                baseWeight: 0.8
            },
            "Classical Performance": {
                genre: "Classical / Orchestral",
                mood: "Elegant, Intellectual, Cinematic",
                vibe: "Empty grand concert hall, focus on a single piano or a soft string quartet.",
                isInstrumental: true,
                baseWeight: 0.7
            },
            "Tokyo City Pop": {
                genre: "City Pop / Future Funk",
                mood: "Nostalgic, Energetic, Retro",
                vibe: "1980s neon Tokyo, driving along the coastal highway at sunset.",
                isInstrumental: false,
                baseWeight: 0.9
            },
            "Euro Synth Night": {
                genre: "Synthwave / Retrowave",
                mood: "Cool, Dynamic, Cyberpunk",
                vibe: "Fast driving through a futuristic city at midnight, neon light streaks.",
                isInstrumental: true,
                baseWeight: 1.1
            },
            "Spring Blossom Walk": {
                genre: "Acoustic Folk / Indie",
                mood: "Hopeful, Gentle, Bright",
                vibe: "Walking under cherry blossoms in full bloom, soft sunlight, warm breeze.",
                isInstrumental: false,
                baseWeight: 0.8
            },
            "Seoul Rainy Day": {
                genre: "K-Indie / Emotional R&B",
                mood: "Melancholic, Cozy, Sentimental",
                vibe: "A small window-side table in a Seoul cafe, watching the gray rainy street.",
                isInstrumental: false,
                baseWeight: 1.0
            },
            "Midnight Chill": {
                genre: "Downtempo / Electronic",
                mood: "Deep, Introspective, Smooth",
                vibe: "3 AM thoughts, low-frequency bass, minimal percussion, dark room vibes.",
                isInstrumental: true,
                baseWeight: 0.9
            },
            "Cinematic Orchestral": {
                genre: "Soundtrack / Epic Orchestral",
                mood: "Grand, Inspiring, Heroic",
                vibe: "A landscape view from a mountain top, vast opening credits of a film.",
                isInstrumental: true,
                baseWeight: 0.6
            },
            "Midnight Solstice Afro": {
                genre: "Afro House / Melodic House",
                mood: "Hypnotic, Tribal, Midnight-Energy",
                vibe: "A ritual dance around a fire under a full moon, deep steady rhythmic pulse.",
                isInstrumental: true,
                baseWeight: 0.7
            },
            "Deep Sleep Therapy": {
                genre: "Ambient / Delta Waves",
                mood: "Deeply Relaxing, Somber, Still",
                vibe: "Weightless floating in a void of peace, zero tension, slow breathing.",
                isInstrumental: true,
                baseWeight: 0.8
            }
        };

        // ─────────────────────────────────────────────
        // 2. 음악 이론 가중치 (Lyria 3를 위한 상세 설정)
        // ─────────────────────────────────────────────
        this.musicTheory = {
            "OZ CAFE": { bpm: "70-90", key: "Major 7th chords, Dorian mode", instruments: "Fender Rhodes, Upright Bass, Soft Brushed Drums, Muted Trumpet" },
            "Lofi Study Room": { bpm: "80-90", key: "Minor 9th, Jazzy progressions", instruments: "MPC style drums, Detuned Piano, Sub Bass, Ambient vinyl noise" },
            "Tokyo City Pop": { bpm: "110-125", key: "Major, Bright pop chords", instruments: "Slap Bass, DX7 Synths, Clean Electric Guitar, Disco Drums" },
            "Seoul Rainy Day": { bpm: "65-85", key: "Minor, Melancholic R&B", instruments: "Acoustic Piano, Soft Electric Guitar, Emotional Vocals, Rain texture" },
            "Nature/ASMR Sanctuary": { bpm: "Ambient (No clear beat)", key: "Lydian, Ethereal fixed drones", instruments: "Crystal Pads, Bamboo Flute, Water drops, Wind chimes" },
            "Euro Synth Night": { bpm: "100-115", key: "Aeolian, Dark Minor", instruments: "Analog Saw Synths, 808 Drums with Reverb, Arpeggiated Bass" },
            "Midnight Solstice Afro": { bpm: "120-124", key: "Phrygian, Tribal Minor", instruments: "Congas, Shakers, Deep Plucked Synths, Hypnotic Vocal Chops" },
            "Deep Sleep Therapy": { bpm: "40-60 (Extremely slow)", key: "No sudden changes, Flat keys", instruments: "Warm Sinewave Pads, Tibetan Bowls, Soft Ocean Hiss" }
        };

        // ─────────────────────────────────────────────
        // 3. 썸네일 컨셉
        // ─────────────────────────────────────────────
        this.thumbnailConcepts = {
            "OZ CAFE": { style: "Oil painting of a rainy cafe window", colorPalette: ["Warm Gold", "Rainy Blue", "Amber"], text: "Café Jazz" },
            "Lofi Study Room": { style: "Anime aesthetic, purple night bedroom", colorPalette: ["Purple", "Indigo", "Soft Pink"], text: "Study Lofi" },
            "Tokyo City Pop": { style: "Retro 80s anime style Tokyo night", colorPalette: ["Neon Pink", "Teal", "Electric Blue"], text: "Tokyo Grooves" },
            "Seoul Rainy Day": { style: "Cinematic photography of Seoul at night", colorPalette: ["Moody Cyan", "Neon Yellow", "Gray"], text: "Rainy Seoul" }
        };
    }

    // ── 데이터 관리 (학습 데이터) ───────────────
    reload() {
        console.log('🔄 [Prompt Engineer] 데이터 리로드 수행 중...');
        // 현재는 메모리 파일만 다시 읽음 (동적 확장을 위해)
        return this.loadMemory();
    }

    loadMemory() {
        try {
            if (fs.existsSync(this.memoryPath)) {
                return JSON.parse(fs.readFileSync(this.memoryPath, 'utf8'));
            }
        } catch (e) {
            console.warn('Memory load failed:', e.message);
        }
        return { successful_genres: [], technical_issues: [], external_trends: [], performance_history: [] };
    }

    saveMemory(memory) {
        try {
            fs.writeFileSync(this.memoryPath, JSON.stringify(memory, null, 2));
        } catch (e) {
            console.error('Memory save failed:', e.message);
        }
    }

    // ── 핵심: 최적의 테마 자동 선정 (70:20:10 전략) ────
    async selectOptimalTheme() {
        console.log('\n🧠 [Prompt Engineer] 최적의 음악 테마 분석 중...');
        const memory = this.loadMemory();
        let trendScores = {};
        try {
            trendScores = await fetchYouTubeTrends();
        } catch (e) {
            console.warn('⚠️ 트렌드 분석 실패 (기본값 사용):', e.message);
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

            candidates.push({ name, score });
        }

        candidates.sort((a, b) => b.score - a.score);
        const selected = candidates[0].name;

        console.log(`🎯 최종 선정된 테마: ${selected} (최종 점수: ${candidates[0].score.toFixed(2)})`);
        return selected;
    }

    // ── Lyria 3용 고기능성 프롬프트 생성 ──────────
    generateStructuredPrompt(index, isInst, themeName) {
        const theme = this.themes[themeName] || this.themes["OZ CAFE"];
        const theory = this.musicTheory[themeName] || this.musicTheory["OZ CAFE"];
        
        // 1. 고유 가사/구성 생성 (v4용 변형)
        const lyrics = isInst ? "" : `(Verse ${index + 1})\nCoffee steam dancing in the air\nRain tapping on the glass, a quiet prayer\nNo need to rush, just stay right here\n[Chorus]\nOZ CAFE, where the time stands still\nMelodies flowing with a gentle thrill.`;

        // 2. 프롬프트 구성 요소
        const promptSections = [
            `CORE STYLE: ${theme.genre} mix for YouTube music channel.`,
            `VIBE & ATMOSPHERE: ${theme.vibe} Ensure the mood is ${theme.mood}. (Variant #${index})`,
            `TECHNICAL SPECS: Target BPM is ${theory.bpm}. Set in ${theory.key}.`,
            `INSTRUMENTATION: Main focus on ${theory.instruments}.`,
            `PRODUCTION QUALITY: Ultra-high fidelity, optimized for background listening.`,
            `STRUCTURE: High quality loop content.`
        ];

        const fullPrompt = promptSections.join('\n');
        const viralMeta = this.generateViralMetadata(themeName);

        return {
            fullPrompt,
            lyrics,
            storytellingTitle: `${themeName} - Track ${index + 1}`,
            shortsHook: `${themeName} vibe for your busy day.`,
            seoTags: viralMeta.tags,
            components: {
                theme: themeName,
                genre: theme.genre,
                mood: theme.mood,
                vibe: theme.vibe
            }
        };
    }

    // ── 바이럴 요소 생성 (타이틀, 태그 등) ───────────
    generateViralMetadata(themeName) {
        const theme = this.themes[themeName] || { genre: "Lo-Fi", mood: "Chill", vibe: "Relaxing" };
        const tags = [
            "OZ Music", theme.genre.replace(/\s+/g, ""), theme.mood.split(', ')[0],
            "BackgroundMusic", "StudyMusic", "RelaxingMusic", "BGM", "AI-Music"
        ];

        return {
            tags: tags,
            descriptionHeader: `\nWelcome to OZ Music. Today's theme is ${themeName}.\n${theme.vibe}`
        };
    }

    generateViralTitle(components) {
        return `🎧 ${components.mood} ${components.genre} mix | ${components.theme} | AI Music Agent OZ`;
    }

    generateEngagementQuestion() {
        const questions = [
            "How does this track make you feel today?",
            "What's your favorite thing to do while listening to this?",
            "Which cafe vibe would you like to hear next?"
        ];
        return questions[Math.floor(Math.random() * questions.length)];
    }

}

module.exports = new PromptEngineer();
