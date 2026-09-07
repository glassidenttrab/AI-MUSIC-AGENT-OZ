const path = require('path');
const fs = require('fs-extra');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const NATURE_THEMES = {
    RAIN: {
        id: 'RAIN',
        name: 'Rain on Window (창가의 빗소리)',
        description: 'Cozy Rain on Window for Deep Sleep and Relaxation',
        frequency: 432
    },
    FOREST: {
        id: 'FOREST',
        name: 'Forest Stream & Birds (숲속 시냇물과 새소리)',
        description: 'Healing Forest Sounds for Stress Relief & Focus',
        frequency: 528
    },
    OCEAN: {
        id: 'OCEAN',
        name: 'Midnight Ocean Waves (심야 파도소리)',
        description: 'Deep Sleep Ocean Waves with 432Hz Binaural Tone',
        frequency: 432
    }
};

/**
 * 자연의 소리 및 힐링 주파수 오디오 생성기
 * @param {string} [themeKey='RAIN'] - 'RAIN' | 'FOREST' | 'OCEAN'
 * @param {number} [durationSeconds=180] - 생성 길이 (초)
 */
async function generateNatureAudio(themeKey = 'RAIN', durationSeconds = 180) {
    const key = (themeKey || 'RAIN').toUpperCase();
    const theme = NATURE_THEMES[key] || NATURE_THEMES.RAIN;

    const outputDir = path.join(__dirname, '../../music', 'NATURE_ZEN');
    await fs.ensureDir(outputDir);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Nature_${key}_${theme.frequency}Hz_${dateStr}_${Date.now().toString().slice(-4)}.mp3`;
    const outputPath = path.join(outputDir, filename);

    console.log(`\n🌿 [자연의 소리 & 명상 오디오 생성 개시]`);
    console.log(`   - 테마: ${theme.name}`);
    console.log(`   - 주파수: ${theme.frequency}Hz 치유 톤`);
    console.log(`   - 목표 길이: ${durationSeconds}초`);

    const freq = theme.frequency;
    const fadeOutStart = Math.max(0, durationSeconds - 2);

    const args = [
        '-y',
        '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=${durationSeconds}`,
        '-f', 'lavfi', '-i', `anoisesrc=d=${durationSeconds}:c=pink:r=44100:a=0.2`,
        '-filter_complex',
        `[0:a]volume=0.08,afade=t=in:ss=0:d=2,afade=t=out:st=${fadeOutStart}:d=2[tone];[1:a]lowpass=f=1400,highpass=f=150,volume=0.9[noise];[tone][noise]amix=inputs=2:duration=longest`,
        '-c:a', 'libmp3lame',
        '-b:a', '320k',
        outputPath
    ];

    try {
        execFileSync(ffmpegPath, args, { stdio: 'pipe' });
        console.log(`✅ [성공] 자연 명상 오디오 생성 완료: ${filename}`);
        return {
            audioPath: outputPath,
            filename: filename,
            metadata: {
                title: `[Nature Zen] ${theme.name} | ${freq}Hz Deep Sleep & Meditation`,
                theme: theme.name,
                frequency: freq,
                hashtags: ['#자연의소리', '#빗소리ASMR', '#수면음악', '#432Hz', '#528Hz', '#명상음악', '#DeepSleep']
            }
        };
    } catch (error) {
        console.error(`❌ [오류] 자연 오디오 생성 실패:`, error.message);
        throw error;
    }
}

module.exports = {
    NATURE_THEMES,
    generateNatureAudio
};
