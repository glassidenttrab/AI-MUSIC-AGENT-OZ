const fs = require('fs-extra');
const path = require('path');

let lessons_learned = {};
const lessonsPath = path.join(__dirname, 'memory', 'lessons_learned.json');
try {
    if (fs.existsSync(lessonsPath)) {
        lessons_learned = JSON.parse(fs.readFileSync(lessonsPath, 'utf8'));
    }
} catch (e) {
    console.error("[OZ Error] Failed to read lessons_learned.json", e);
}

class PromptEngineer {
    constructor() {
        this.trends = {
            genres: ["Brazilian Phonk", "Afro House", "Lofi Jazz", "Ethereal Ambient", "Synthwave", "Deep Melodic Tech"],
            moods: ["Viral", "Cinematic", "Ethereal", "Hypnotic", "Nocturnal"],
            instruments: ["Distorted Bass", "Grand Piano", "Sub Bass", "Hypnotic Synths", "Drift Guitars"],
            vocals: ["Aggressive Echoes", "Soulful Fragments", "Ambient Whispers", "Instrumental Journey"],
            themes: ["Aura Brazilian Bounce", "Midnight Solstice Afro", "Rainy Urban Sanctuary", "Midnight Expressway", "Deep Focus Realm"]
        };

        this.lyricTemplates = {
            "Aura Brazilian Bounce": "(Verse 1)\nAura in the night, feeling so bright\nBrazilian bounce, take it to the height...",
            "Midnight Solstice Afro": "(Verse 1)\nUnder the moon, rhythmic heart\nAfro pulse, it's just the start...",
            "Rainy Urban Sanctuary": "(Verse 1)\nWalking down the neon street\nRain is falling at my feet...",
            "Midnight Expressway": "(Verse 1)\nChrome and circuits in my veins...",
            "Deep Focus Realm": "(Verse 1)\nPages turning in the dark...",
            "Neon Seoul Horizon": "(Verse 1)\nPurple lights against the wall..."
        };
    }

    generateStructuredPrompt(index = 0, isInstrumental = false, overrideTheme = null) {
        let theme = overrideTheme || this.trends.themes[index % this.trends.themes.length];
        const genre = overrideTheme ? (overrideTheme.includes("Phonk") ? "Brazilian Phonk" : "Afro House") : this.trends.genres[index % this.trends.genres.length];
        const mood = overrideTheme ? (overrideTheme.includes("Phonk") ? "Viral" : "Hypnotic") : this.trends.moods[index % this.trends.moods.length];
        const instrument = overrideTheme ? (overrideTheme.includes("Phonk") ? "Distorted Bass" : "Hypnotic Synths") : this.trends.instruments[index % this.trends.instruments.length];
        
        // 보컬 설정: 연주곡일 경우 'Instrumental Only', 아닐 경우 'Soulful Echoes' 등 랜덤
        const vocal = isInstrumental ? "Instrumental Only" : this.trends.vocals[index % (this.trends.vocals.length - 1)];

        const lyrics = isInstrumental ? null : (this.lyricTemplates[theme] || "Instrumental.");
        let storytellingTitle = this.generateStorytellingTitle({ genre, mood, theme });
        
        if (isInstrumental) {
            storytellingTitle = `[Instrumental] ${storytellingTitle}`;
        }

        const fullPrompt = `${genre}, ${mood} mood, with ${instrument}, ${vocal}, themed around ${theme}. High fidelity.`;
        
        return {
            fullPrompt: fullPrompt,
            lyrics: lyrics,
            storytellingTitle: storytellingTitle,
            components: { genre, mood, instrument, vocal, theme, isInstrumental }
        };
    }

    generateStorytellingTitle({ genre, mood, theme }) {
        const scenarios = {
            "Rainy Urban Sanctuary": `[OZ] | ${theme} | - Emotional ${genre} Experience 🎧`,
            "Midnight Expressway": `[OZ] | ${theme} | - Cybernetic ${genre} Loop 🏎️`,
            "Solstice Sunset": `[OZ] | ${theme} | - Sunset ${genre} Vibe 🌅`,
            "Deep Focus Realm": `[OZ] | ${theme} | - Deep ${genre} for Immersion 📚`,
            "Neon Seoul Horizon": `[OZ] | ${theme} | - Dreamy ${genre} Landscape 💜`
        };

        return scenarios[theme] || `[OZ] | ${mood} ${genre} Soundscape 🎧`;
    }

    selectOptimalTheme() {
        console.log(`\n[OZ STRATEGY] Analyzing YouTube Trends from Real API Performance...`);
        let weightTable = [
            { theme: "Rainy Urban Sanctuary", genreMatch: "Brazilian Phonk Aura", score: 50 },
            { theme: "Midnight Expressway", genreMatch: "Synthwave", score: 50 },
            { theme: "Deep Focus Realm", genreMatch: "Lofi Jazz", score: 50 },
            { theme: "Midnight Solstice Afro", genreMatch: "Midnight Solstice Afro House", score: 50 }
        ];

        if (lessons_learned.successful_genres && lessons_learned.successful_genres.length > 0) {
            console.log(`[OZ Memory] Applying reward weights to themes matching: ${lessons_learned.successful_genres.join(", ")}`);
            weightTable = weightTable.map(item => {
                if (lessons_learned.successful_genres.includes(item.genreMatch)) {
                    item.score += 40; // 성공한 장르에 해당하는 테마 확률 대폭 증가
                }
                return item;
            });
        }

        if (lessons_learned.technical_issues && lessons_learned.technical_issues.length > 0) {
            // "Mismatched theme for ..." 이슈가 있을 경우 그 부분을 회피시키는 로직 (단순화)
            const badStr = lessons_learned.technical_issues.join(" ");
            if (badStr.includes("Mismatched theme")) {
                console.log(`[OZ Penalty] Applying penalties for Mismatched themes`);
                weightTable.forEach(item => {
                    if (badStr.includes(item.genreMatch)) item.score -= 20; 
                });
            }
        }

        const optimal = weightTable.sort((a, b) => b.score - a.score)[0];
        console.log(`✅ Selected Theme based on API Feedback: [${optimal.theme}] (Score: ${optimal.score})`);
        return optimal.theme;
    }
}

module.exports = new PromptEngineer();
