const path = require('path');
const fs = require('fs-extra');
const { generateTrotPrompt } = require('./trot_prompt_engine');
const { generateSunoMusic } = require('./generate_suno_music');

/**
 * K-트롯 채널 전용 음원 생성 파이프라인
 * @param {Object} options
 * @param {string} [options.subGenre='DANCE'] - 'DANCE' | 'EMOTIONAL' | 'DISCO'
 * @param {string} [options.customTheme] - 맞춤 주제
 * @param {number} [options.durationSeconds=200] - 목표 음원 길이
 */
async function generateTrotTrack(options = {}) {
    const { subGenre = 'DANCE', customTheme = null, durationSeconds = 200 } = options;
    
    // 1. 트로트 프롬프트 및 가사 생성
    const trotData = generateTrotPrompt(subGenre, customTheme);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Trot_${subGenre}_${dateStr}_${Date.now().toString().slice(-4)}.mp3`;

    console.log(`\n==============================================`);
    console.log(`🎤 [K-트롯 생성 개시] 테마: ${trotData.title}`);
    console.log(`   - 장르: ${trotData.genre} (BPM: ${trotData.bpm})`);
    console.log(`   - Suno 프롬프트: ${trotData.sunoPrompt}`);
    console.log(`   - 가사 포함 여부: Yes (${trotData.lyrics.length}자)`);
    console.log(`==============================================\n`);

    // 2. Suno 엔진 호출 (저장 카테고리: TROT_KOREA)
    const savedPath = await generateSunoMusic(
        trotData.sunoPrompt,
        filename,
        durationSeconds,
        trotData.lyrics,
        'TROT_KOREA'
    );

    return {
        audioPath: savedPath,
        filename: filename,
        metadata: trotData
    };
}

module.exports = {
    generateTrotTrack
};
