'use strict';

require('dotenv').config();
const promptEngineer = require('./core/prompt_engineer');

/**
 * AI Music Agent OZ - 4th Generation Generation Engine
 * 메인 워크플로우 시작점
 */
async function main() {
    console.log('================================================');
    console.log('   🚀 AI MUSIC AGENT OZ - 4th GEN ACTIVATED');
    console.log('================================================');

    try {
        // 1. 최적의 테마 선정
        const selectedTheme = await promptEngineer.selectOptimalTheme();
        const tracks = [];
        const trackCount = 10;

        console.log('\n------------------------------------------------');
        console.log(`🎯 SELECTED BATCH THEME : ${selectedTheme}`);
        console.log(`📊 TARGET: 10 TRACKS / 1 HOUR COMPILATION`);
        console.log('------------------------------------------------');

        // 2. 10곡 배치 생성 루프 가동
        console.log(`\n🚀 [Batch Mode] 10개의 고유 프롬프트 생성을 시작합니다...`);
        for (let i = 0; i < trackCount; i++) {
            process.stdout.write(`⏳ Generating Track #${i + 1}/${trackCount}... `);
            const trackInfo = await promptEngineer.generateStructuredPrompt(i, true, selectedTheme);
            tracks.push(trackInfo);
            console.log(`✅ [${trackInfo.storytellingTitle}]`);
        }

        // 3. 통합 리포트 출력
        console.log('\n================================================');
        console.log('📜  AI MUSIC AGENT OZ - MEGA BATCH REPORT');
        console.log('================================================');
        
        console.log('\n🎵 [Album Tracklist Preview]');
        tracks.forEach((t, idx) => {
            console.log(`   Track ${idx + 1}: ${t.storytellingTitle}`);
        });

        console.log('\n--- Detailed Track Metadata ---');
        tracks.forEach((t, idx) => {
            console.log(`\n[Track ${idx + 1}] ${t.storytellingTitle}`);
            console.log(`🔗 Prompt: ${t.fullPrompt.substring(0, 100)}...`);
            console.log(`🏷️ Tags  : ${t.seoTags.slice(0, 5).join(', ')}`);
        });

        console.log('\n------------------------------------------------');
        console.log('📺 [YouTube Viral MetaData Pack]');
        const metadata = promptEngineer.generateViralMetadata(selectedTheme);
        console.log(`TITLE suggestion: [1 Hour] ${selectedTheme} | ${tracks[0].storytellingTitle} & More`);
        console.log(`TAGS: ${tracks[0].seoTags.join(', ')}`);
        
        console.log('\n✅ 10곡 배치 프롬프트 생성 완료!');
        console.log('사용자님, 위 프롬프트들을 순서대로 사용해 1시간 분량의 명작을 완성하세요.');

    } catch (error) {
        console.error('\n❌ 시스템 오류 발생:', error.message);
        if (error.stack) console.debug(error.stack);
    }
}

// 스크립트 실행
main();
