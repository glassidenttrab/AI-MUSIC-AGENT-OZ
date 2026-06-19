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
const QUOTA_FILE = path.join(__dirname, '../../memory', 'quota_usage.json');

// 다운로드 받은 클라이언트 시크릿 파일명
const CLIENT_SECRET_FILE = 'client_secret_83268081542-9qq9mlgep0f3bgo0h85ud5ddsljvun6v.apps.googleusercontent.com.json';

/**
 * YouTube API 할당량 관리 시스템
 */
class QuotaManager {
    constructor() {
        this.dailyLimit = 10000;
        this.costs = {
            upload: 1600,
            list: 1,
            update: 50,
            insert_playlist: 50,
            comment: 50,
            search: 100
        };
    }

    async getUsage() {
        await fs.ensureDir(path.dirname(QUOTA_FILE));
        if (!fs.existsSync(QUOTA_FILE)) {
            return { date: new Date().toISOString().split('T')[0], used: 0 };
        }
        const data = await fs.readJson(QUOTA_FILE);
        const today = new Date().toISOString().split('T')[0];
        if (data.date !== today) {
            return { date: today, used: 0 };
        }
        return data;
    }

    async addUsage(action) {
        const usage = await this.getUsage();
        const cost = this.costs[action] || 1;
        usage.used += cost;
        await fs.writeJson(QUOTA_FILE, usage, { spaces: 4 });
        console.log(`[Quota] '${action}' 수행 (+${cost}). 오늘 누적 사용량: ${usage.used}/${this.dailyLimit}`);
        return usage.used;
    }

    async hasCapacity(action, customCost = null) {
        const usage = await this.getUsage();
        const cost = customCost !== null ? customCost : (this.costs[action] || 1);
        return (usage.used + cost) <= this.dailyLimit;
    }
}

const quotaManager = new QuotaManager();

/**
 * YouTube API 클라이언트 인증 처리
 */
async function authorize() {
    const content = await fs.readFile(path.join(__dirname, '../../configs', CLIENT_SECRET_FILE), 'utf8');
    const credentials = JSON.parse(content);
    
    const clientSecret = credentials.installed ? credentials.installed.client_secret : credentials.web.client_secret;
    const clientId = credentials.installed ? credentials.installed.client_id : credentials.web.client_id;
    const redirectUrl = credentials.installed ? credentials.installed.redirect_uris[0] : credentials.web.redirect_uris[0];

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);

    try {
        const token = await fs.readFile(TOKEN_PATH, 'utf8');
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    } catch (err) {
        return await getNewToken(oAuth2Client);
    }
}

function getNewToken(oAuth2Client) {
    return new Promise((resolve, reject) => {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        console.log('\n======================================================');
        console.log('1. 다음 URL을 브라우저에서 열고 구글 로그인을 진행하세요:');
        console.log(authUrl);
        console.log('2. 승인 코드를 아래에 입력하세요.');
        console.log('======================================================\n');
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question('승인 코드(code) 입력: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) return reject(err);
                oAuth2Client.setCredentials(token);
                fs.ensureDirSync(path.dirname(TOKEN_PATH));
                fs.writeJsonSync(TOKEN_PATH, token);
                resolve(oAuth2Client);
            });
        });
    });
}

/**
 * 영상 처리 상태가 'processed'가 될 때까지 대기합니다.
 */
async function waitForProcessing(auth, videoId, maxWaitMinutes = 20) {
    const youtube = google.youtube({ version: 'v3', auth });
    const startTime = Date.now();
    console.log(`[Processing] 영상(${videoId})의 처리 상태를 모니터링합니다...`);

    while (Date.now() - startTime < maxWaitMinutes * 60 * 1000) {
        try {
            await quotaManager.addUsage('list');
            const res = await youtube.videos.list({
                part: 'status,snippet',
                id: videoId
            });

            const video = res.data.items[0];
            if (!video) throw new Error("영상을 찾을 수 없습니다.");

            const status = video.status.uploadStatus;
            console.log(`[Status] 현재 상태: ${status} (대기 시간: ${Math.round((Date.now() - startTime) / 1000)}초)`);

            if (status === 'processed') {
                console.log(`✅ 영상 처리가 완료되었습니다.`);
                return true;
            } else if (status === 'failed') {
                throw new Error(`영상 처리 실패: ${video.status.failureReason}`);
            }

            // 30초 대기
            await new Promise(r => setTimeout(r, 30000));
        } catch (err) {
            console.error(`⚠️ 상태 확인 중 오류: ${err.message}`);
            await new Promise(r => setTimeout(r, 10000));
        }
    }
    console.warn(`⚠️ 최대 대기 시간(${maxWaitMinutes}분)을 초과했습니다. 작업을 계속 진행합니다.`);
    return false;
}

/**
 * YouTube 채널에 동영상 자동 업로드
 */
async function uploadVideo(auth, videoFilePath, coverFilePath, title, description, tags, publishAt = null, options = {}) {
    const youtube = google.youtube({ version: 'v3', auth });

    if (!fs.existsSync(videoFilePath)) {
        throw new Error(`에러: 동영상 파일이 존재하지 않습니다. ${videoFilePath}`);
    }

    if (!(await quotaManager.hasCapacity('upload'))) {
        throw new Error("❌ 할당량 부족: 오늘 업로드 가능한 한도를 초과했습니다.");
    }

    // 제목 길이 검증 (최대 100자)
    const finalTitle = title.length > 100 ? title.substring(0, 97) + "..." : title;
    
    // 챕터 포맷팅 (설명문 최상단에 자동 삽입)
    let finalDescription = description;
    if (options.chapters && Array.isArray(options.chapters)) {
        const chapterText = "\n[Timestamps]\n" + options.chapters.map(c => `${c.time} ${c.title}`).join('\n') + "\n\n";
        finalDescription = chapterText + description;
    }

    console.log(`[업로드 개시] ${finalTitle} (${Math.round(fs.statSync(videoFilePath).size / 1024 / 1024)}MB)`);
    const fileSize = fs.statSync(videoFilePath).size;

    try {
        await quotaManager.addUsage('upload');
        const res = await youtube.videos.insert({
            part: 'id,snippet,status' + (options.localizations ? ',localizations' : ''),
            notifySubscribers: options.notifySubscribers || false,
            requestBody: {
                snippet: {
                    title: finalTitle,
                    description: finalDescription,
                    tags: tags,
                    categoryId: '10',
                    defaultLanguage: 'ko'
                },
                status: {
                    privacyStatus: 'private', // 초기 상태는 항상 private
                    selfDeclaredMadeForKids: false
                },
                ...(options.localizations && { localizations: options.localizations })
            },
            media: {
                body: fs.createReadStream(videoFilePath),
            },
        }, {
            onUploadProgress: evt => {
                const progress = (evt.bytesRead / fileSize) * 100;
                if (Math.round(progress) % 20 === 0) {
                    process.stdout.write(`\r업로드 중... ${Math.round(progress)}%`);
                }
            },
        });

        const videoId = res.data.id;
        console.log(`\n✅ 업로드 완료! ID: ${videoId}`);

        // 썸네일 업로드
        if (coverFilePath && fs.existsSync(coverFilePath)) {
            try {
                await quotaManager.addUsage('update');
                await youtube.thumbnails.set({
                    videoId: videoId,
                    media: { body: fs.createReadStream(coverFilePath) }
                });
                console.log('✅ 썸네일 적용 완료');
            } catch (thumbErr) {
                console.error(`⚠️ 썸네일 업로드 실패: ${thumbErr.message}`);
            }
        }

        // 처리 완료 대기 (옵션)
        if (options.waitForProcessing) {
            await waitForProcessing(auth, videoId);
        }

        // 공개 상태 업데이트 (예약 또는 즉시 공개)
        const statusPatch = { privacyStatus: 'public' };
        if (publishAt) {
            const scheduledTime = new Date(publishAt);
            if (scheduledTime > new Date()) {
                statusPatch.privacyStatus = 'private';
                statusPatch.publishAt = scheduledTime.toISOString();
                console.log(`⏰ 예약 공개 설정: ${publishAt}`);
            } else {
                console.log(`⏰ 예약 시간이 지나 즉시 공개로 전환합니다.`);
            }
        }

        await quotaManager.addUsage('update');
        await youtube.videos.update({
            part: 'status',
            requestBody: {
                id: videoId,
                status: statusPatch
            }
        });
        
        console.log(`✅ 최종 상태 업데이트 완료 (${statusPatch.privacyStatus})`);
        return videoId;

    } catch (e) {
        const errorMessage = e.message || '';
        const isQuotaExceeded = (e.errors && e.errors.some(err => err.reason === 'quotaExceeded')) || 
                                errorMessage.toLowerCase().includes('quota');

        if (isQuotaExceeded) {
            console.error('\n🛑 [CRITICAL] 유튜브 API 할당량이 실제로 모두 소진되었습니다!');
            try {
                const usage = { date: new Date().toISOString().split('T')[0], used: 10000 };
                fs.writeJsonSync(path.join(__dirname, '../../memory/quota_usage.json'), usage, { spaces: 4 });
            } catch (jsonErr) {
                console.warn('⚠️ [Quota] 상태 파일 업데이트 실패:', jsonErr.message);
            }
        }
        console.error('\n❌ 업로드 프로세스 실패:', errorMessage);
        throw e;
    }


}

async function getOrCreatePlaylist(auth, title) {
    const youtube = google.youtube({ version: 'v3', auth });
    try {
        await quotaManager.addUsage('list');
        let pageToken = null;
        let playlistId = null;

        do {
            const res = await youtube.playlists.list({
                part: 'snippet',
                mine: true,
                maxResults: 50,
                pageToken: pageToken
            });
            const found = (res.data.items || []).find(p => p.snippet.title === title);
            if (found) { playlistId = found.id; break; }
            pageToken = res.data.nextPageToken;
        } while (pageToken);

        if (playlistId) return playlistId;

        await quotaManager.addUsage('insert_playlist');
        const createRes = await youtube.playlists.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: { title: title, description: `Collection of ${title} generated by AI-OZ` },
                status: { privacyStatus: 'public' }
            }
        });
        return createRes.data.id;
    } catch (e) {
        console.error('❌ 재생목록 처리 실패:', e.message);
        return null;
    }
}

async function addVideoToPlaylist(auth, videoId, playlistId) {
    const youtube = google.youtube({ version: 'v3', auth });
    try {
        await quotaManager.addUsage('insert_playlist');
        await youtube.playlistItems.insert({
            part: 'snippet',
            requestBody: {
                snippet: {
                    playlistId: playlistId,
                    resourceId: { kind: 'youtube#video', videoId: videoId }
                }
            }
        });
        return true;
    } catch (e) {
        if (e.message.includes('already in the playlist')) return true;
        console.error('❌ 재생목록 추가 실패:', e.message);
        return false;
    }
}

async function postComment(auth, videoId, text) {
    const youtube = google.youtube({ version: 'v3', auth });
    try {
        await quotaManager.addUsage('comment');
        await youtube.commentThreads.insert({
            part: 'snippet',
            requestBody: {
                snippet: {
                    videoId: videoId,
                    topLevelComment: { snippet: { textOriginal: text } }
                }
            }
        });
        console.log(`✅ 댓글 작성 완료`);
        return true;
    } catch (e) {
        console.error('❌ 댓글 작성 실패:', e.message);
        return false;
    }
}

async function localizePlaylist(auth, playlistId, defaultTitle, defaultDescription, localizations) {
    const youtube = google.youtube({ version: 'v3', auth });
    try {
        await quotaManager.addUsage('update');
        await youtube.playlists.update({
            part: 'snippet,localizations',
            requestBody: {
                id: playlistId,
                snippet: {
                    title: defaultTitle,
                    description: defaultDescription || `Collection of ${defaultTitle} generated by AI-OZ`,
                    defaultLanguage: 'ko'
                },
                localizations: localizations
            }
        });
        console.log(`✅ 재생목록(${playlistId}) 다국어 설정 완료`);
        return true;
    } catch (e) {
        console.error(`❌ 재생목록 다국어 설정 실패:`, e.message);
        return false;
    }
}

async function checkQuota(auth, amount = 1600) {
    return await quotaManager.hasCapacity('upload', amount);
}

module.exports = {
    authorize,
    uploadVideo,
    getOrCreatePlaylist,
    addVideoToPlaylist,
    postComment,
    localizePlaylist,
    checkQuota,
    QuotaManager: quotaManager
};

