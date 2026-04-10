const { GoogleGenAI } = require("@google/genai");
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

async function checkGemini() {
    console.log("--- [Gemini API Check] ---");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY가 설정되지 않았습니다.");
        return;
    }
    
    try {
        const client = new GoogleGenAI({ apiKey: apiKey });
        const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Identify yourself briefly.");
        const text = result.response.text();
        console.log("✅ Gemini API 연결 성공!");
        // console.log("응답:", text.trim());
    } catch (err) {
        console.error("❌ Gemini API 오류:", err.message);
        if (err.message.includes("quota") || err.message.includes("429")) {
            console.error("⚠️ 할당량 초과(Quota Exceeded)가 의심됩니다.");
        }
    }
}

async function checkYouTube() {
    console.log("\n--- [YouTube API Check] ---");
    const TOKEN_PATH = path.join(__dirname, 'token.json');
    const CLIENT_SECRET_FILE = 'client_secret_83268081542-9qq9mlgep0f3bgo0h85ud5ddsljvun6v.apps.googleusercontent.com.json';

    if (!fs.existsSync(TOKEN_PATH)) {
        console.error("❌ YouTube 토큰 파일(token.json)이 없습니다.");
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
        const res = await youtube.channels.list({
            part: 'snippet,statistics',
            mine: true
        });

        if (res.data.items && res.data.items.length > 0) {
            console.log(`✅ YouTube 채널 연결 성공: ${res.data.items[0].snippet.title}`);
        } else {
            console.log("⚠️ YouTube 채널 정보를 가져올 수 없습니다.");
        }
    } catch (err) {
        console.error("❌ YouTube API 오류:", err.message);
    }
}

async function run() {
    const keys = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(k => k);
    console.log(`--- [총 ${keys.length}개의 API 키 검증 시작] ---`);
    
    for (let i = 0; i < keys.length; i++) {
        console.log(`\n🔑 Key #${i+1} 검증 중...`);
        const apiKey = keys[i];
        try {
            const client = new GoogleGenAI({ apiKey: apiKey });
            const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("Identify yourself briefly.");
            console.log(`✅ Key #${i+1} 성공!`);
        } catch (err) {
            console.error(`❌ Key #${i+1} 실패: ${err.message}`);
        }
    }
    
    await checkYouTube();
}

run();
