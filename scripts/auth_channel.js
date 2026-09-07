const { authorize } = require('../src/core/youtube_upload');
const { CHANNELS, getChannelConfig } = require('../src/configs/channels.config');

/**
 * 다중 채널 OAuth 인증 전용 유틸리티
 * 사용법: node scripts/auth_channel.js --channel=TROT
 *        node scripts/auth_channel.js --channel=NATURE
 *        node scripts/auth_channel.js --channel=OZ
 */
async function main() {
    const args = process.argv.slice(2);
    let channelKey = 'OZ';

    for (const arg of args) {
        if (arg.startsWith('--channel=')) {
            channelKey = arg.split('=')[1].toUpperCase();
        }
    }

    const config = getChannelConfig(channelKey);
    console.log(`\n🔑 [YouTube 채널 인증 개시]`);
    console.log(`   - 채널 ID: ${config.id}`);
    console.log(`   - 채널명: ${config.name}`);
    console.log(`   - 토큰 저장 파일: configs/${config.tokenFile}\n`);

    try {
        const auth = await authorize(channelKey);
        console.log(`\n🎉 [성공] ${config.name} (${config.id}) 채널 인증이 성공적으로 완료되었습니다!`);
    } catch (error) {
        console.error(`\n❌ [오류] 인증 진행 중 문제 발생:`, error.message);
    }
}

main();
