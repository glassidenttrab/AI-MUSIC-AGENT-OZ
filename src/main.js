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
        // 1. 최적의 테마 선정 (YouTube 실시간 트렌드 및 성능 데이터 기반)
        const selectedTheme = await promptEngineer.selectOptimalTheme();
        
        // 2. 고도화된 Lyria 3 프롬프트 생성
        const musicPrompt = promptEngineer.generateStructuredPrompt(selectedTheme);
        
        // 3. 바이럴 메타데이터 생성
        const metadata = promptEngineer.generateViralMetadata(selectedTheme);

        // 4. 결과 출력 (사용자 피드백 대기 및 확인용)
        console.log('\n------------------------------------------------');
        console.log(`📌 SELECTED THEME : ${selectedTheme}`);
        console.log('------------------------------------------------');
        
        console.log('\n[🎹 Lyria 3 Music Generation Prompt]');
        console.log('------------------------------------------------');
        console.log(musicPrompt);
        console.log('------------------------------------------------');

        console.log('\n[📺 YouTube MetaData (Viral Optimized)]');
        console.log(`TITLE: ${metadata.title}`);
        console.log(`TAGS : ${metadata.tags.join(', ')}`);
        console.log('\n[DESCRIPTION PREVIEW]');
        console.log(metadata.descriptionHeader);
        console.log('------------------------------------------------');

        // 5. 성공 이력 기록 (시뮬레이션 - 실제 생성 단계 이후에 호출 권장)
        // 향후 자동화 파이프라인 연동 시 이 부분을 활용해 학습 시스템 고도화
        console.log('\n✅ 4세대 전략 프롬프트 생성 완료!');
        console.log('이제 생성된 프롬프트를 사용하여 고해상도 음악을 제작할 수 있습니다.');

    } catch (error) {
        console.error('\n❌ 시스템 오류 발생:', error.message);
        if (error.stack) console.debug(error.stack);
    }
}

// 스크립트 실행
main();
