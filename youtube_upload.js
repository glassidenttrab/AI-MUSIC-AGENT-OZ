const fs = require('fs-extra');
const { google } = require('googleapis');
const readline = require('readline');
const path = require('path');

// OAuth2 인증 설정
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const TOKEN_PATH = path.join(__dirname, 'token.json');

// 다운로드 받은 클라이언트 시크릿 파일명
const CLIENT_SECRET_FILE = 'client_secret_83268081542-9qq9mlgep0f3bgo0h85ud5ddsljvun6v.apps.googleusercontent.com.json';

/**
 * YouTube API 클라이언트 인증 처리
 */
async function authorize() {
    // 클라이언트 시크릿 파일 읽기
    const content = await fs.readFile(path.join(__dirname, CLIENT_SECRET_FILE), 'utf8');
    const credentials = JSON.parse(content);
    
    // 구조 확인 (웹 어플리케이션인지 설치형인지에 따라 다름)
    const clientSecret = credentials.installed ? credentials.installed.client_secret : credentials.web.client_secret;
    const clientId = credentials.installed ? credentials.installed.client_id : credentials.web.client_id;
    const redirectUrl = credentials.installed ? credentials.installed.redirect_uris[0] : credentials.web.redirect_uris[0];

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);

    // 저장된 토큰이 있는지 확인
    try {
        const token = await fs.readFile(TOKEN_PATH, 'utf8');
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    } catch (err) {
        // 토큰이 없다면 새로운 토큰 발급 (최초 1회 실행)
        return await getNewToken(oAuth2Client);
    }
}

/**
 * 사용자 동의를 받아 새 오프라인 토큰 생성
 */
function getNewToken(oAuth2Client) {
    return new Promise((resolve, reject) => {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline', // 리프레시 토큰 발급에 필요
            scope: SCOPES,
        });

        console.log('\n======================================================');
        console.log('1. 다음 URL을 브라우저에서 열고 구글 로그인을 진행하세요:');
        console.log(authUrl);
        console.log('2. 권한 허용 후 브라우저가 "http://localhost/..." 형식의 페이지로 이동하며 실패(연결 거부 등) 화면이 나올 수 있습니다. (정상입니다.)');
        console.log('3. 이때 브라우저 상단의 주소창(URL)을 보면 "code=" 뒤에 긴 문자열이 있습니다.');
        console.log('   예) http://localhost/?state=...&code=4/0AcvDMr...&scope=...');
        console.log('4. 이 "code=" 뒷부분의 문자열(4/ 로 시작하는 부분)을 복사해서 아래에 붙여넣기 하세요.');
        console.log('======================================================\n');
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question('복사한 승인 코드(code)를 입력하세요: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) {
                    console.error('토큰 발급 중 오류 발생:', err);
                    return reject(err);
                }
                oAuth2Client.setCredentials(token);
                // 발급받은 토큰을 로컬에 저장 (이후부터는 자동 로그인)
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                console.log('토큰이 성공적으로 저장되었습니다:', TOKEN_PATH);
                resolve(oAuth2Client);
            });
        });
    });
}

/**
 * YouTube 채널에 동영상 자동 업로드
 */
async function uploadVideo(auth, videoFilePath, coverFilePath, title, description, tags, publishAt = null) {
    const youtube = google.youtube({ version: 'v3', auth });

    if (!fs.existsSync(videoFilePath)) {
        console.error("에러: 동영상 파일이 존재하지 않습니다.", videoFilePath);
        return;
    }

    console.log(`[업로드 준비] ${title} 영상을 업로드합니다...`);
    const fileSize = fs.statSync(videoFilePath).size;

    try {
        const res = await youtube.videos.insert({
            part: 'id,snippet,status',
            notifySubscribers: false,
            requestBody: {
                snippet: {
                    title: title,
                    description: description,
                    tags: tags,
                    categoryId: '10', // 10은 Music 카테고리
                },
                status: {
                    privacyStatus: publishAt ? 'private' : 'private', // 예약 시에는 private 유지
                    publishAt: publishAt, // '2026-03-15T15:00:00Z' 형식
                },
            },
            media: {
                body: fs.createReadStream(videoFilePath),
            },
        }, {
            // 업로드 진행 상황 표시
            onUploadProgress: evt => {
                const progress = (evt.bytesRead / fileSize) * 100;
                if (process.stdout.isTTY && typeof process.stdout.clearLine === 'function') {
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    process.stdout.write(`업로드 중... ${Math.round(progress)}% 완료`);
                } else {
                    console.log(`업로드 진행률: ${Math.round(progress)}% 완료`);
                }
            },
        });

        console.log('\n\n✅ 동영상 업로드 완료! Video ID:', res.data.id);
        console.log('유튜브 링크: https://youtu.be/' + res.data.id);

        // 썸네일 업로드 (선택사항)
        if (coverFilePath && fs.existsSync(coverFilePath)) {
            console.log(`썸네일(${coverFilePath}) 업로드 중...`);
            await youtube.thumbnails.set({
                videoId: res.data.id,
                media: {
                    body: fs.createReadStream(coverFilePath)
                }
            });
            console.log('✅ 썸네일 적용 완료!');
        }

    } catch (e) {
        console.error('\n❌ 업로드 실패:', e.toString());
    }
}

// 모듈로 내보내어 다른 파일에서 호출 가능하도록 설정
module.exports = {
    authorize,
    uploadVideo
};
