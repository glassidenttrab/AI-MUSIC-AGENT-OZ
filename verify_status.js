const { google } = require('googleapis');
const path = require('path');
const fs = require('fs-extra');

async function verifyYouTube() {
    console.log("--- [YouTube Auth & Quota Check] ---");
    const TOKEN_PATH = path.join(__dirname, 'token.json');
    const CLIENT_SECRET_FILE = 'client_secret_83268081542-9qq9mlgep0f3bgo0h85ud5ddsljvun6v.apps.googleusercontent.com.json';

    if (!fs.existsSync(TOKEN_PATH)) {
        console.error("❌ token.json 파일이 없습니다.");
        return;
    }

    try {
        const credentials = await fs.readJson(path.join(__dirname, CLIENT_SECRET_FILE));
        const token = await fs.readJson(TOKEN_PATH);
        
        const clientSecret = credentials.installed ? credentials.installed.client_secret : credentials.web.client_secret;
        const clientId = credentials.installed ? credentials.installed.client_id : credentials.web.client_id;
        const redirectUrl = credentials.installed ? credentials.installed.redirect_uris[0] : credentials.web.redirect_uris[0];

        const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
        oAuth2Client.setCredentials(token);

        const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });
        
        // 채널 정보 가져오기 시도 (가장 기본적인 Read 요청)
        const res = await youtube.channels.list({
            part: 'snippet,statistics',
            mine: true
        });

        if (res.data.items && res.data.items.length > 0) {
            const channel = res.data.items[0];
            console.log(`✅ 인증 성공: ${channel.snippet.title}`);
            console.log(`📊 채널 상태: 구독자 ${channel.statistics.subscriberCount}명, 총 조회수 ${channel.statistics.viewCount}회`);
        } else {
            console.log("⚠️ 인증은 성공했으나 채널 정보를 찾을 수 없습니다.");
        }

    } catch (err) {
        console.error("❌ YouTube 연동 실패:", err.message);
        if (err.message.includes('invalid_grant')) {
            console.error("👉 [해결책] 토큰이 만료되었거나 리프레시 토큰이 무효화되었습니다. trigger_auth.js를 다시 실행해야 합니다.");
        } else if (err.message.includes('quotaExceeded')) {
            console.error("👉 [해결책] 오늘 사용 가능한 YouTube API 할당량을 모두 소진했습니다. 태평양 표준시(PST) 정오에 리셋됩니다.");
        }
    }
}

verifyYouTube();
