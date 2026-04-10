const fs = require('fs-extra');
const { google } = require('googleapis');
const readline = require('readline');
const path = require('path');

// OAuth2 인증 설정
const SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload', 
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/youtube.readonly'
];
const TOKEN_PATH = path.join(__dirname, '../../configs', 'token.json');

// 다운로드 받은 클라이언트 시크릿 파일명
const CLIENT_SECRET_FILE = 'client_secret_83268081542-9qq9mlgep0f3bgo0h85ud5ddsljvun6v.apps.googleusercontent.com.json';

/**
 * YouTube API 클라이언트 인증 처리
 */
async function authorize() {
    // 클라이언트 시크릿 파일 읽기
    const content = await fs.readFile(path.join(__dirname, '../../configs', CLIENT_SECRET_FILE), 'utf8');
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
                    privacyStatus: 'private' // 일단 private 상태로 업로드 (업로드 후 시간 설정)
                },
            },
            media: {
                body: fs.createReadStream(videoFilePath),
            },
        }, {
            // 업로드 진행 상황 표시
            onUploadProgress: evt => {
                const progress = (evt.bytesRead / fileSize) * 100;
                if (Math.round(progress) % 10 === 0) {
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

        // 예약 업로드인 경우, 업로드 완료 후 예약 시간 별도 설정 (공개 시간 업데이트)
        if (publishAt) {
            const now = new Date();
            const scheduledTime = new Date(publishAt);
            
            // 만약 예약 시간이 이미 과거라면, 예약 대신 즉시 공개(public)로 설정
            if (scheduledTime <= now) {
                console.log(`\n⏰ [알림] 예약 시간(${publishAt})이 이미 지났습니다. 즉시 공개(public)로 전환합니다.`);
                await youtube.videos.update({
                    part: 'status',
                    requestBody: {
                        id: res.data.id,
                        status: {
                            privacyStatus: 'public'
                        }
                    }
                });
                console.log('✅ 즉시 공개 전환 완료!');
            } else {
                console.log(`\n⏰ [예약 시간 설정] 업로드 완료 후 예약 시간(${publishAt})을 설정합니다...`);
                await youtube.videos.update({
                    part: 'snippet,status',
                    requestBody: {
                        id: res.data.id,
                        snippet: {
                            title: title,
                            description: description,
                            tags: tags,
                            categoryId: '10'
                        },
                        status: {
                            privacyStatus: 'private',
                            publishAt: publishAt
                        }
                    }
                });
                console.log('✅ 예약 공개 시간 업데이트 완료!');
            }
        }

        return res.data.id;

    } catch (e) {
        console.error('\n❌ 업로드 실패:', e.toString());
        return null;
    }
}

/**
 * 재생목록을 검색하고, 없으면 새로 생성하여 ID를 반환합니다.
 */
async function getOrCreatePlaylist(auth, title) {
    const youtube = google.youtube({ version: 'v3', auth });

    try {
        // 1. 기존 재생목록 검색
        let pageToken = null;
        let playlistId = null;

        do {
            const res = await youtube.playlists.list({
                part: 'snippet',
                mine: true,
                maxResults: 50,
                pageToken: pageToken
            });

            const playlists = res.data.items || [];
            const found = playlists.find(p => p.snippet.title === title);

            if (found) {
                playlistId = found.id;
                break;
            }
            pageToken = res.data.nextPageToken;
        } while (pageToken);

        if (playlistId) {
            console.log(`[재생목록] 기존 재생목록 '${title}'(ID: ${playlistId})을(를) 사용합니다.`);
            return playlistId;
        }

        // 2. 새 재생목록 생성
        console.log(`[재생목록] 재생목록 '${title}'이(가) 없어 새로 생성합니다...`);
        const createRes = await youtube.playlists.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: title,
                    description: `AI가 생성한 ${title} 음악 모음입니다.`
                },
                status: {
                    privacyStatus: 'public' // 생성된 재생목록은 기본 공개
                }
            }
        });

        console.log(`✅ [재생목록 생성 완료] ID: ${createRes.data.id}`);
        return createRes.data.id;

    } catch (e) {
        console.error('❌ 재생목록 검색/생성 실패:', e.toString());
        return null;
    }
}

/**
 * 특정 동영상을 재생목록에 추가합니다.
 */
async function addVideoToPlaylist(auth, videoId, playlistId) {
    const youtube = google.youtube({ version: 'v3', auth });

    try {
        console.log(`[재생목록 추가] 영상(${videoId})을 재생목록(${playlistId})에 추가합니다...`);
        await youtube.playlistItems.insert({
            part: 'snippet',
            requestBody: {
                snippet: {
                    playlistId: playlistId,
                    resourceId: {
                        kind: 'youtube#video',
                        videoId: videoId
                    }
                }
            }
        });
        console.log(`✅ [재생목록 추가 완료]`);
        return true;
    } catch (e) {
        // 이미 재생목록에 있는 경우 오류 무시 (API 버전에 따라 메시지가 다를 수 있음)
        if (e.message && e.message.includes('already in the playlist')) {
            console.log(`⚠️ 영상이 이미 재생목록에 포함되어 있습니다.`);
            return true;
        }
        console.error('❌ 재생목록 추가 실패:', e.message || e.toString());
        return false;
    }
}

/**
 * 특정 동영상에 댓글을 작성합니다. (질문형 고정 댓글용)
 */
async function postComment(auth, videoId, text) {
    const youtube = google.youtube({ version: 'v3', auth });

    try {
        console.log(`[댓글 작성] 영상(${videoId})에 댓글을 남깁니다: "${text}"`);
        await youtube.commentThreads.insert({
            part: 'snippet',
            requestBody: {
                snippet: {
                    videoId: videoId,
                    topLevelComment: {
                        snippet: {
                            textOriginal: text
                        }
                    }
                }
            }
        });
        console.log(`✅ [댓글 작성 완료]`);
        return true;
    } catch (e) {
        console.error('❌ 댓글 작성 실패:', e.toString());
        return false;
    }
}

/**
 * YouTube API 할당량이 남아있는지 확인합니다. (단순 채널 정보 조회로 테스트)
 */
async function checkQuota(auth) {
    const youtube = google.youtube({ version: 'v3', auth });
    try {
        await youtube.channels.list({
            part: 'id',
            mine: true
        });
        return true;
    } catch (e) {
        if (e.message && e.message.includes('quotaExceeded')) {
            return false;
        }
        throw e; // 다른 에러(인증 등)는 상위로 던짐
    }
}

// 모듈로 내보내어 다른 파일에서 호출 가능하도록 설정
module.exports = {
    authorize,
    uploadVideo,
    getOrCreatePlaylist,
    addVideoToPlaylist,
    postComment,
    checkQuota
};
