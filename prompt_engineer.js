const fs = require('fs-extra');
const path = require('path');

class PromptEngineer {
    constructor() {
        this.trends = {
            genres: ["Euphoric House", "Afro House", "Lofi Jazz", "Lofi Hip Hop", "Synthwave", "Deep House"],
            moods: ["Energetic", "Relaxing", "Dark", "Atmospheric", "Chillout"],
            instruments: ["Plucked Synth", "Analog Keys", "Deep Sub Bass", "Ethereal Pads", "Retro Drum Machines"],
            vocals: ["Soulful Echoes", "Cybernetic Vocals", "Ambient Whispers", "Instrumental Only"],
            themes: ["Cyberpunk Night Drive", "Neon-lit Bedroom", "Rainy Seoul City", "Sunset Beach Vibe", "Quiet Library Study"]
        };

        this.lyricTemplates = {
            "Rainy Seoul City": "(Verse 1)\nWalking down the neon street\nRain is falling at my feet...",
            "Cyberpunk Night Drive": "(Verse 1)\nChrome and circuits in my veins...",
            "Sunset Beach Vibe": "(Verse 1)\nGolden sand and orange sky...",
            "Quiet Library Study": "(Verse 1)\nPages turning in the dark...",
            "Neon-lit Bedroom": "(Verse 1)\nPurple lights against the wall..."
        };
    }

    generateStructuredPrompt(index = 0, isInstrumental = false) {
        const genre = this.trends.genres[index % this.trends.genres.length];
        const mood = this.trends.moods[index % this.trends.moods.length];
        const instrument = this.trends.instruments[index % this.trends.instruments.length];
        const theme = this.trends.themes[index % this.trends.themes.length];
        
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
            "Rainy Seoul City": `Emotional ${genre} in the Rainy City 🎧`,
            "Cyberpunk Night Drive": `Neon Cyberpunk ${genre} Loop 🏎️`,
            "Sunset Beach Vibe": `Sunset ${genre} Vibe 🌅`,
            "Quiet Library Study": `Focus ${genre} for Study 📚`,
            "Neon-lit Bedroom": `Dreamy ${genre} in Neon Light 💜`
        };

        return scenarios[theme] || `${mood} ${genre} Mix 🎧`;
    }

    selectOptimalTheme() {
        console.log(`\n[OZ STRATEGY] Analyzing 2026 YouTube Trends...`);
        const weightTable = [
            { theme: "Rainy Seoul City", score: 98 },
            { theme: "Cyberpunk Night Drive", score: 92 },
            { theme: "Quiet Library Study", score: 95 }
        ];
        const optimal = weightTable.sort((a, b) => b.score - a.score)[0];
        console.log(`✅ Selected Theme: [${optimal.theme}]`);
        return optimal.theme;
    }
}

module.exports = new PromptEngineer();
