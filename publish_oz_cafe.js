/**
 * [AI MUSIC AGENT OZ] OZ CAFE 시각물 합성 및 예약 업로드 스크립트
 */
const { generateHybridContent } = require('./src/apps/generate_1hour_loop');
const { authorize, uploadVideo } = require('./src/core/youtube_upload');
const path = require('path');
const fs = require('fs-extra');

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

async function runTask() {
    try {
        const theme = "OZ CAFE";
        const isInstrumental = true;
        const targetMinutes = 60;
        const songCount = 10;

        console.log(`\n======================================================`);
        console.log(`🚀 [OZ CAFE RUNNER] 시각물 합성 & 유튜브 업로드 작업 시작`);
        console.log(`🎭 테마: ${theme} / 연주곡: ${isInstrumental}`);
        console.log(`======================================================\n`);

        // 1. 유튜브 인증
        const auth = await authorize();
        console.log('✅ 유튜브 API 인증 완료');

        // 2. 콘텐츠 합성 (이미지, 비디오 렌더링)
        console.log('\n🎨 시각물(썸네일/배경 이미지) 및 영상 합성 프로세스 가동 중...');
        // track_0 ~ track_9 가 이미 존재하므로 오디오 생성은 skip되고 합성만 진행됨
        const result = await generateHybridContent(theme, isInstrumental, targetMinutes, songCount);

        console.log('\n✅ 영상 렌더링 완료. 유튜브 업로드 단계로 전환합니다.');

        // 예약 시간 기획 (오늘 혹은 내일 오후 9시경)
        const baseDate = new Date();
        baseDate.setHours(21, 0, 0, 0);
        if (baseDate.getTime() < Date.now()) {
            baseDate.setDate(baseDate.getDate() + 1);
        }

        // 3. 메인 영상 업로드
        console.log('\n📺 [메인 영상] 업로드 시작...');
        const loopId = await uploadVideo(
            auth,
            result.loop.path,
            result.thumbnail,
            result.loop.title,
            result.loop.description,
            result.loop.tags,
            baseDate.toISOString()
        );

        if (loopId) {
            console.log(`✅ 메인 영상 업로드 성공! ID: ${loopId}`);
            await saveToHistory({
                video_id: loopId,
                status: "published",
                type: "longform",
                timestamp: new Date().toISOString(),
                metadata: {
                    youtube_title: result.loop.title,
                    genre: theme,
                    isInstrumental: isInstrumental
                }
            });
        }

        // 4. 쇼츠 영상 업로드 (메인보다 10분 앞서 예약)
        const shortsDate = new Date(baseDate.getTime() - 10 * 60 * 1000).toISOString();
        console.log('\n📱 [쇼츠 영상] 업로드 시작...');
        const shortsId = await uploadVideo(
            auth,
            result.shorts.path,
            null,
            result.shorts.title,
            result.shorts.description,
            result.shorts.tags,
            shortsDate
        );

        if (shortsId) {
            console.log(`✅ 쇼츠 영상 업로드 성공! ID: ${shortsId}`);
            await saveToHistory({
                video_id: shortsId,
                status: "published",
                type: "shorts",
                timestamp: new Date().toISOString(),
                metadata: {
                    youtube_title: result.shorts.title,
                    genre: theme,
                    isInstrumental: isInstrumental
                }
            });
        }

        console.log(`\n======================================================`);
        console.log(`🎉 [모든 작업 완료] OZ CAFE 콘텐츠 합성 및 업로드 성공`);
        console.log(`======================================================\n`);

    } catch (e) {
        console.error(`❌ 작업 중 에러 발생:`, e);
    }
}

runTask();
