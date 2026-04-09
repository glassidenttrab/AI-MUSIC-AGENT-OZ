const { authorize } = require('./youtube_upload');

async function trigger() {
    console.log('[AI MUSIC AGENT OZ] 유튜브 인증 절차를 시작합니다...');
    try {
        await authorize();
        console.log('✅ 인증이 완료되었습니다. token.json이 생성되었습니다.');
    } catch (err) {
        console.error('❌ 인증 중 오류 발생:', err.message);
    }
}

trigger();
