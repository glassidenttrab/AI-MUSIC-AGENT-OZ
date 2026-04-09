const { authorize, uploadVideo } = require('./youtube_upload');
const path = require('path');
const fs = require('fs-extra');

const PROJECT_DIR = path.join(__dirname, 'loops', 'loop_Rainy_Day_Open-air_Cafe_inst');
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
        console.log('🚀 [Rainy Day Cafe] 유튜브 업로드 시작...');
        const auth = await authorize();
        console.log('✅ 유튜브 API 인증 성공');

        // 1. 컴필레이션 영상 (1시간)
        const compVideo = path.join(PROJECT_DIR, 'Rainy_Day_Open-air_Cafe_Compilation.mp4');
        const thumbnail = path.join(PROJECT_DIR, 'background_0.png');
        const compTitle = `[OZ] Rainy Day Open-air Cafe | 1 Hour Jazz Compilation for Study & Relaxation`;
        
        // 트랙리스트 생성 루틴
        let tracklistStr = '';
        for(let i=1; i<=10; i++) {
            tracklistStr += `- [OZ] Rainy Day Cafe Jazz - Pt ${i}\n`;
        }

        const compDesc = `Experience the serene and nostalgic atmosphere of a rainy day at an open-air cafe with this 1-hour smooth jazz compilation.\n\n` +
                         `Perfect for studying, working, or just relaxing with the sound of rain and soft jazz.\n\n` +
                         `[Tracklist]\n${tracklistStr}\n` +
                         `Created by AI Music Agent OZ.\n\n` +
                         `#jazz #cafe #rainyday #relaxation #study #oz #lofi #smoothjazz`;
        
        console.log(`\n📺 [Longform] 업로드 중: ${compTitle}`);
        const loopId = await uploadVideo(auth, compVideo, thumbnail, compTitle, compDesc, ['jazz', 'cafe', 'rainy', 'oz', 'relax'], new Date().toISOString());

        if (loopId) {
            await saveToHistory({
                video_id: loopId,
                status: "published",
                type: "longform",
                timestamp: new Date().toISOString(),
                metadata: {
                    youtube_title: compTitle,
                    theme: "Rainy Day Cafe",
                    isInstrumental: true
                }
            });
            console.log(`✅ [Main] 업로드 완료: https://youtu.be/${loopId}`);
        }

        // 2. 쇼츠 영상 (Shorts)
        const shortsVideo = path.join(PROJECT_DIR, 'Rainy_Day_Open-air_Cafe_Shorts.mp4');
        const shortsTitle = `Cozy Rainy Day Cafe Vibes ☕️🌧️ #shorts #jazz #oz`;
        const shortsDesc = `Quick escape to a rainy open-air cafe with some smooth jazz. #shorts #jazz #rainyday #cozy #oz`;

        console.log(`\n📱 [Shorts] 업로드 중: ${shortsTitle}`);
        const shortsId = await uploadVideo(auth, shortsVideo, null, shortsTitle, shortsDesc, ['shorts', 'jazz', 'oz', 'rainy'], null);

        if (shortsId) {
            await saveToHistory({
                video_id: shortsId,
                status: "published",
                type: "shorts",
                timestamp: new Date().toISOString(),
                metadata: {
                    youtube_title: shortsTitle,
                    theme: "Rainy Day Cafe",
                    isInstrumental: true
                }
            });
            console.log(`✅ [Shorts] 업로드 완료: https://youtu.be/${shortsId}`);
        }

        console.log('\n✨ 모든 업로드 작업이 성공적으로 완료되었습니다.');

    } catch (e) {
        console.error('❌ 업로드 작업 중 치명적 오류 발생:', e);
    }
}

runUpload();
