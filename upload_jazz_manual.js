const { authorize, uploadVideo } = require('./youtube_upload');
const path = require('path');
const fs = require('fs-extra');

const RUN_FOLDER = path.join(__dirname, 'loops', 'loop_OZ_CAFE_inst');
const MEM_FILE = path.join(__dirname, 'memory', 'upload_history.json');

async function saveToHistory(record) {
    try {
        let history = [];
        if (fs.existsSync(MEM_FILE)) {
            history = await fs.readJson(MEM_FILE);
        }
        history.push(record);
        await fs.writeJson(MEM_FILE, history, { spaces: 4 });
        console.log(`📝 [Memory] ${record.video_id} 업로드 이력 저장 완료.`);
    } catch (e) {
        console.error(`❌ [Memory Error] 히스토리 저장 실패:`, e);
    }
}

async function runUpload() {
    try {
        const metadata = await fs.readJson(path.join(RUN_FOLDER, 'metadata.json'));
        const auth = await authorize();
        console.log('✅ 유튜브 API 인증 성공');

        // 1. 컴필레이션 영상 업로드
        const compVideo = path.join(RUN_FOLDER, '_Instrumental___OZ____Cafe___Study___-_Cozy_1960s_Slow_Jazz_Ballad____Compilation.mp4');
        const thumbnail = path.join(RUN_FOLDER, 'background_0.png');
        const compTitle = `[Instrumental] [OZ] | Cafe Study - Cozy 1960s Slow Jazz Ballad | 1 Hour Immersive Loop`;
        const compDesc = `Experience the nostalgic atmosphere of a 1960s cafe with this cozy slow jazz ballad compilation.\n\n` +
                         `[Tracklist]\n` + metadata.tracklist.join('\n') + 
                         `\n\n#jazz #cafe #study #cozy #oz #lofi #jazzballad`;
        
        console.log(`\n📺 [Longform] 업로드 중...`);
        const now = new Date().toISOString(); 
        const loopId = await uploadVideo(auth, compVideo, thumbnail, compTitle, compDesc, ['jazz', 'cafe', 'study', 'cozy', 'oz'], now);

        if (loopId) {
            await saveToHistory({
                video_id: loopId,
                status: "published",
                type: "longform",
                timestamp: new Date().toISOString(),
                metadata: {
                    youtube_title: compTitle,
                    genre: metadata.genre,
                    isInstrumental: true
                }
            });
            console.log(`✅ 메인 영상 업로드 완료: https://youtu.be/${loopId}`);
        }

        // 2. 쇼츠 영상 업로드
        const shortsVideo = path.join(RUN_FOLDER, '_Instrumental___OZ____Cafe___Study___-_Cozy_1960s_Slow_Jazz_Ballad____Shorts.mp4');
        const shortsTitle = `[Instrumental] [OZ] | Cafe Study - Cozy 1960s Slow Jazz Ballad | #Shorts #OZ`;
        const shortsDesc = `Quick escape to a cozy 1960s jazz cafe. #shorts #lofi #jazz #oz`;

        console.log(`\n📱 [Shorts] 업로드 중...`);
        const shortsId = await uploadVideo(auth, shortsVideo, null, shortsTitle, shortsDesc, ['shorts', 'jazz', 'oz'], null);

        if (shortsId) {
            await saveToHistory({
                video_id: shortsId,
                status: "published",
                type: "shorts",
                timestamp: new Date().toISOString(),
                metadata: {
                    youtube_title: shortsTitle,
                    genre: metadata.genre,
                    isInstrumental: true
                }
            });
            console.log(`✅ 쇼츠 영상 업로드 완료: https://youtu.be/${shortsId}`);
        }

    } catch (e) {
        console.error('❌ 업로드 작업 중 오류 발생:', e);
    }
}

runUpload();
