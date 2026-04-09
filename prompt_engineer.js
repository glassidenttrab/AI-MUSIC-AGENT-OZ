const fs = require('fs-extra');
const path = require('path');

function loadLessons() {
    const lessonsPath = path.join(__dirname, 'memory', 'lessons_learned.json');
    try {
        if (fs.existsSync(lessonsPath)) {
            return JSON.parse(fs.readFileSync(lessonsPath, 'utf8'));
        }
    } catch (e) {
        console.error("[OZ Error] Failed to read lessons_learned.json", e);
    }
    return {};
}

let lessons_learned = loadLessons();

class PromptEngineer {
    constructor() {
        this.reload();
        this.trends = {
            genres: ["Lofi Jazz House", "Organic Ambient", "Classical Performance", "Euro Synthwave", "Afro House"],
            moods: ["Cozy", "Healing", "Elegant", "Viral", "Hypnotic"],
            instruments: ["Grand Piano", "Soft Strings", "Vintage Synths", "Nature Sounds", "Sub Bass"],
            vocals: ["Instrumental Only", "Ambient Whispers", "Ethereal Hum"],
            themes: ["OZ CAFE", "Nature/ASMR Sanctuary", "Classical Performance", "Euro Synth Night", "Midnight Solstice Afro", "Spring Blossom Walk"]
        };

        this.lyricTemplates = {
            "OZ CAFE": "(Verse 1)\nSteam rises from the porcelain cup\nRaindrops racing, never giving up\nCozy corner, world is far away\nIn this cafe, I think I'll stay...",
            "Nature/ASMR Sanctuary": "Instrumental. (Focus on organic textures, wind, and soft water flows)",
            "Classical Performance": "Instrumental. (Elegant and emotional classical performance. No lyrics needed.)",
            "Euro Synth Night": "(Verse 1)\nNeon pulse under the European sky...",
            "Midnight Solstice Afro": "(Verse 1)\nUnder the moon, rhythmic heart...",
            "Spring Blossom Walk": "(Verse 1)\nPink petals falling softly on my skin\nWarm breeze blowing, let the walk begin\nAcoustic melodies, a harmonica's tune\nUnder the dazzling sky of a spring afternoon\n\n(Chorus)\nHolding hands beneath the cherry blossom tree\nWalking at our pace, just you and me\nA spring-time melody drifting on the air\nA piece of this moment, a love we share"
        };

        this.shortsHooks = {
            "OZ CAFE": ["This coffee shop vibe will change your focus in 5 seconds ☕", "The perfect jazz backdrop for your deep work session", "Ever felt like you're in a 1960s movie? Now you can."],
            "Nature/ASMR Sanctuary": ["Instantly calm your mind with these healing sounds 🌿", "The ultimate sanctuary for your stressful day", "Close your eyes and let the nature take over"],
            "Classical Performance": ["Feel the raw emotion of a grand orchestra 🎹", "Timeless elegance for your quiet moments", "This masterpiece will touch your soul"],
            "Euro Synth Night": ["Elevate your night drive with this synthwave pulse 🏎️", "Cyberpunk energy for your late-night coding", "The beat that keeps the city alive"],
            "Aura Brazilian Bounce": ["Boost your energy with these viral Phonk beats ⚡", "The sound of the future underground", "Unstoppable rhythm for your workout"],
            "Midnight Solstice Afro": ["Get lost in the hypnotic pulse of Afro House 🌙", "Rhythmic healing for the midnight hours", "Connect with the tribal spirit of the dancefloor"],
            "Rainy Day Cafe": ["Rainy day + Jazz = Perfect productivity 🌧️☕", "Focus better with the sound of rain and soft piano", "Your virtual cafe is now open"],
            "Spring Blossom Walk": ["Take a beautiful walk under the cherry blossoms with this tune 🌸", "A sweet male vocal dedicated to your spring afternoon", "The perfect spring BGM for couples and dreamers 🎸"]
        };
    }

    reload() {
        lessons_learned = loadLessons();
    }

    generateStructuredPrompt(index = 0, isInstrumental = false, overrideTheme = null) {
        let theme = overrideTheme || this.trends.themes[index % this.trends.themes.length];
        let genre, mood, instrument, vocal;

        let originalThemeName = theme;
        if (theme === "OZ CAFE") {
            const isFast = (index % 2 === 1); 
            genre = isFast ? "1960s Fast Bebop Jazz" : "1960s Slow Jazz Ballad";
            mood = isFast ? "Energetic & Intellectual" : "Smoky & Nostalgic";
            instrument = isFast ? "Virtuosic Bebop Piano, energetic Trumpet flares, soulful Saxophone solos, walking Bass" : "Muted Trumpet, smoky Saxophone, soft Piano chords, double Bass, brush Drums";
            theme = isFast ? "1960s Fast Jazz style" : "1960s Slow Jazz style";
        } else if (theme === "Nature/ASMR Sanctuary") {
            genre = "Organic Healing Ambient";
            mood = "Deep Relaxing";
            instrument = "Soft Piano & Nature Soundscapes";
            isInstrumental = true;
        } else if (theme.toLowerCase().includes("cafe") && (theme.toLowerCase().includes("rain") || theme.includes("비"))) {
            const isFast = (index % 2 === 1);
            genre = isFast ? "1960s Mid-tempo Swing Jazz" : "1960s Slow Jazz Ballad";
            mood = "Rainy, Smoky, Nostalgic, Cozy";
            instrument = "Muted Trumpet, soft Piano, brush Drums, constant soft Rain ASMR texture, subtle Cafe background noise";
            theme = "Rainy Day Open-air Cafe atmosphere";
        } else if (theme === "Classical Performance" || theme === "Classical Grand") {
            genre = "Classical Grand Orchestra";
            mood = "Majestic & Emotional";
            instrument = "Symphony Orchestra, Grand Piano, Cinematic Strings, Woodwinds";
            theme = "Classical Grand Performance (8k Cinematic)";
            isInstrumental = true;
        } else if (theme === "Euro Synth Night") {
            genre = "Modern Euro Synthwave";
            mood = "Driving & Energetic";
            instrument = "Vintage Analogue Synths & Punchy Drums";
        } else if (theme === "Spring Blossom Walk") {
            genre = "Spring Mid-tempo Acoustic Pop / Folk";
            mood = "Warm, Romantic, Joyful, Breezy";
            instrument = "Warm Acoustic Guitar, Bright Grand Piano, Soulful Harmonica solos, soft acoustic Percussion";
            vocal = "Deep, Warm, and Sweet Male Vocal";
        } else {
            genre = overrideTheme ? (overrideTheme.includes("Phonk") ? "Brazilian Phonk" : "Afro House") : this.trends.genres[index % this.trends.genres.length];
            mood = overrideTheme ? (overrideTheme.includes("Phonk") ? "Viral" : "Hypnotic") : this.trends.moods[index % this.trends.moods.length];
            instrument = overrideTheme ? (overrideTheme.includes("Phonk") ? "Distorted Bass" : "Hypnotic Synths") : this.trends.instruments[index % this.trends.instruments.length];
        }
        
        vocal = vocal || (isInstrumental ? "Instrumental Only" : this.trends.vocals[index % (this.trends.vocals.length - 1)]);

        const lyrics = isInstrumental ? null : (this.lyricTemplates[originalThemeName] || "Instrumental.");
        let storytellingTitle = this.generateStorytellingTitle({ genre, mood, theme: originalThemeName });
        
        if (isInstrumental) {
            storytellingTitle = `[Instrumental] ${storytellingTitle}`;
        }

        const shortsHook = this.generateShortsHook(originalThemeName, index);
        const seoTags = this.generateSEOTags(originalThemeName, genre, mood);

        const fullPrompt = `${genre}, ${mood} mood, with ${instrument}, ${vocal}, themed around ${theme}. High fidelity.`;
        
        return {
            fullPrompt: fullPrompt,
            lyrics: lyrics,
            storytellingTitle: storytellingTitle,
            shortsHook: shortsHook,
            seoTags: seoTags,
            components: { genre, mood, instrument, vocal, theme, isInstrumental }
        };
    }

    generateShortsHook(theme, index) {
        const hooks = this.shortsHooks[theme] || ["Experience the evolution of sound with OZ 🎧"];
        return hooks[index % hooks.length];
    }

    generateSEOTags(theme, genre, mood) {
        const baseTags = ["AI Music", "Oz AI Artist", "Soundscape", "2026 Music"];
        const intentTags = [
            `${genre} for study`,
            `${theme} atmosphere`,
            `Relaxing ${genre} music`,
            `${mood} vibes for work`,
            `Focus music ${new Date().getFullYear()}`,
            "No Copyright AI Music"
        ];
        return [...baseTags, ...intentTags];
    }

    generateStorytellingTitle({ genre, mood, theme }) {
        const scenarios = {
            "OZ CAFE": `[OZ] | Cafe & Study | - Cozy ${genre} 🎧`,
            "Nature/ASMR Sanctuary": `[OZ] | Healing ASMR | - ${genre} 🌿`,
            "Classical Performance": `[OZ] | Classical | - Emotional ${genre} 🎹`,
            "Euro Synth Night": `[OZ] | Night Drive | - ${genre} 🏎️`,
            "Aura Brazilian Bounce": `[OZ] | Aura | - Viral ${genre} ⚡`,
            "Midnight Solstice Afro": `[OZ] | Solstice | - Hypnotic ${genre} 🌙`,
            "Spring Blossom Walk": `[OZ] | Spring | - Warm Acoustic ${genre} 🌸`
        };

        return scenarios[theme] || `[OZ] ${theme} - ${genre} Mix`;
    }

    /**
     * 시청자 참여를 유도하는 질문형 댓글 생성 (Engagement Loop)
     */
    generateEngagementQuestion() {
        const questions = [
            "💬 Question of the Day: What mood are you in right now?",
            "🌍 Where are you listening from today? I'd love to know!",
            "☕ What's your favorite drink while listening to this mix?",
            "✨ If this music was a place, where would it be?",
            "🎧 How did you find this channel? YouTube's algorithm or a friend?",
            "🌙 What are you working on while this plays in the background?",
            "🎵 Which track from this mix is your favorite so far?"
        ];
        return questions[Math.floor(Math.random() * questions.length)];
    }

    selectOptimalTheme(rank = 0) {
        console.log(`\n[OZ STRATEGY] 4.5 Gen Feedback-Driven Engine: Analyzing Trends...`);
        
        let weightTable = [
            { theme: "OZ CAFE", genreMatch: "Jazz", score: 60 },
            { theme: "Nature/ASMR Sanctuary", genreMatch: "Ambient", score: 55 },
            { theme: "Classical Performance", genreMatch: "Classical", score: 52 },
            { theme: "Euro Synth Night", genreMatch: "Synthwave", score: 50 },
            { theme: "Aura Brazilian Bounce", genreMatch: "Phonk", score: 40 },
            { theme: "Midnight Solstice Afro", genreMatch: "Afro House", score: 40 }
        ];

        // 70:30 법칙 (Exploitation vs Exploration)
        const isExplorationMode = Math.random() < 0.3;
        
        if (isExplorationMode) {
            console.log(`📡 [OZ Exploration] 30% 확률로 새로운 장르 탐색 모드 발동!`);
            // 탐색 모드: 모든 점수를 비슷하게 맞추거나 무작위성 부여
            weightTable = weightTable.map(item => ({ ...item, score: Math.random() * 100 }));
        } else if (lessons_learned.successful_genres && lessons_learned.successful_genres.length > 0) {
            console.log(`[OZ Exploitation] 성공한 장르(성능 기반) 집중 강화 모드...`);
            weightTable = weightTable.map(item => {
                // 부분 일치 검사로 유연성 확보
                const isSuccessful = lessons_learned.successful_genres.some(sg => sg.toLowerCase().includes(item.genreMatch.toLowerCase()));
                if (isSuccessful) {
                    console.log(`✨ [Reward] Found success match: ${item.genreMatch}`);
                    item.score += 50; 
                }
                return item;
            });
        }

        if (lessons_learned.technical_issues && lessons_learned.technical_issues.length > 0) {
            const badStr = lessons_learned.technical_issues.join(" ").toLowerCase();
            if (badStr.includes("mismatched")) {
                weightTable.forEach(item => {
                    if (badStr.includes(item.genreMatch.toLowerCase())) {
                        console.log(`⚠️ [Penalty] Found technical issue match for: ${item.genreMatch}`);
                        item.score -= 30;
                    }
                });
            }
        }

        const sorted = weightTable.sort((a, b) => b.score - a.score);
        const idx = Math.min(rank, sorted.length - 1);
        const optimal = sorted[idx];
        
        console.log(`✅ Final Decision (Mode: ${isExplorationMode ? 'Exploration' : 'Exploitation'}): [${optimal.theme}] (Score: ${optimal.score.toFixed(1)})`);
        return optimal.theme;
    }
}

module.exports = new PromptEngineer();
