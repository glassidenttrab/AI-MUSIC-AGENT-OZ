const path = require('path');
const fs = require('fs-extra');
const { CHANNELS, getChannelConfig } = require('../configs/channels.config');
const { generateTrotTrack } = require('../core/generate_trot_music');
const { generateNatureAudio } = require('../core/generate_nature_audio');
const { renderNatureVideo } = require('../core/make_nature_video');

/**
 * 3대 유튜브 채널 통합 오케스트레이터
 * 
 * 사용법:
 *   node src/apps/run_multichannel.js --channel=TROT --genre=DANCE
 *   node src/apps/run_multichannel.js --channel=NATURE --theme=RAIN --duration=60
 *   node src/apps/run_multichannel.js --channel=OZ
 */
async function run() {
    const args = process.argv.slice(2);
    let channelKey = 'OZ';
    let subGenre = null;
    let duration = 60; // 분 단위 (기본)

    for (const arg of args) {
        if (arg.startsWith('--channel=')) {
            channelKey = arg.split('=')[1].toUpperCase();
        } else if (arg.startsWith('--genre=')) {
            subGenre = arg.split('=')[1];
        } else if (arg.startsWith('--theme=')) {
            subGenre = arg.split('=')[1];
        } else if (arg.startsWith('--duration=')) {
            duration = parseInt(arg.split('=')[1], 10);
        }
    }

    const config = getChannelConfig(channelKey);

    console.log(`\n======================================================`);
    console.log(`🚀 [멀티채널 자동화 오케스트레이터 가동]`);
    console.log(`   - 선택 채널: [${config.id}] ${config.name}`);
    console.log(`   - 대상 언어: ${config.targetLanguage}`);
    console.log(`   - 음악 카테고리: ${config.musicCategory}`);
    console.log(`   - 시각 렌더러: ${config.visualStyle.renderer}`);
    console.log(`======================================================\n`);

    try {
        if (config.id === 'TROT') {
            console.log(`[Step 1] K-트롯 음원 생성 파이프라인 가동...`);
            // 트로트 생성
            const trotRes = await generateTrotTrack({
                subGenre: subGenre || 'DANCE',
                durationSeconds: 200
            });
            console.log(`\n🎉 [K-트롯 생성 완료]`);
            console.log(`   - 파일: ${trotRes.audioPath}`);
            console.log(`   - 제목: ${trotRes.metadata.title}`);
            console.log(`   - 해시태그: ${trotRes.metadata.recommendedHashtags.join(' ')}`);

        } else if (config.id === 'NATURE') {
            console.log(`[Step 1] 자연의 소리 & 힐링 주파수 오디오 합성...`);
            const natureRes = await generateNatureAudio(subGenre || 'RAIN', 60); // 60초 샘플 생성
            console.log(`\n🎉 [Nature Zen 오디오 생성 완료]`);
            console.log(`   - 파일: ${natureRes.audioPath}`);
            console.log(`   - 제목: ${natureRes.metadata.title}`);

        } else {
            console.log(`[OZ CAFE / Synthwave 파이프라인 가동]`);
            console.log(`기존 자율 에이전트 모듈(run_autonomous.js)과 연동됩니다.`);
        }

    } catch (error) {
        console.error(`\n❌ [실패] 채널 파이프라인 실행 중 오류 발생:`, error.message);
    }
}

if (require.main === module) {
    run();
}

module.exports = { run };
