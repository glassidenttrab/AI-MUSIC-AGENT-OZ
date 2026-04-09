/**
 * [AI MUSIC AGENT OZ] 통합 퍼블리싱 러너 V3 (트렌드 기반 다중 콘텐츠)
 * 1. 트랙 1 (가사 있음/보컬): Brazilian Phonk
 * 2. 트랙 2 (가사 없음/연주): Soulful Afro House
 * 각각 1시간 루프와 쇼츠 생성 후 성과 분석(Evaluate) 연동.
 */
const { generateHybridContent } = require('./generate_1hour_loop');
const { authorize, uploadVideo } = require('./youtube_upload');
const path = require('path');
const fs = require('fs-extra');

const MEM_FILE = path.join(__dirname, 'memory', 'upload_history.json');

async function isTrackDone(theme) {
    try {
        if (!fs.existsSync(MEM_FILE)) return false;
        const history = await fs.readJson(MEM_FILE);
        return history.some(record => record.metadata && record.metadata.genre === theme && record.type === "longform");
    } catch (e) {
        return false;
    }
}

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

async function processTrack(auth, theme, isInstrumental, publishAt) {
    console.log(`\n======================================================`);
    console.log(`🚀 [OZ V3] 트랙 처리 시작: ${theme} (${isInstrumental ? 'INST' : 'VOCAL'})`);
    console.log(`======================================================\n`);

    // 1시간 루프 생성 (Option A 호출)
    const result = await generateHybridContent(theme, isInstrumental, 60);

    // 메인 루프 업로드
    console.log(`\n📺 [Longform] ${result.loop.title} 업로드 중...`);
    const loopId = await uploadVideo(
        auth,
        result.loop.path,
        result.thumbnail,
        result.loop.title,
        result.loop.description,
        result.loop.tags,
        publishAt
    );

    if (loopId) {
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

    // 쇼츠 업로드 (메인보다 5분 앞서 공개)
    const shortsPublishAt = new Date(new Date(publishAt).getTime() - 5 * 60 * 1000).toISOString();
    console.log(`\n📱 [Shorts] ${result.shorts.title} 업로드 중...`);
    const shortsId = await uploadVideo(
        auth,
        result.shorts.path,
        null,
        result.shorts.title,
        result.shorts.description,
        result.shorts.tags,
        shortsPublishAt
    );

    if (shortsId) {
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
}

async function runV3Runner() {
    try {
        const auth = await authorize();
        console.log('✅ 유튜브 API 인증 성공');

        // 예약 시간 기획 (오늘 오후 9시경)
        const baseDate = new Date();
        baseDate.setHours(21, 0, 0, 0);

        // [트랙 1] Brazilian Phonk (가사 포함)
        if (await isTrackDone("Brazilian Phonk Aura")) {
            console.log(`⏩ [Skip] Brazilian Phonk Aura는 이미 완료되었습니다.`);
        } else {
            await processTrack(auth, "Brazilian Phonk Aura", false, baseDate.toISOString());
        }

        // [트랙 2] Soulful Afro House (연주 전용, 1시간 뒤 공개)
        baseDate.setHours(22, 0, 0, 0);
        if (await isTrackDone("Midnight Solstice Afro House")) {
            console.log(`⏩ [Skip] Midnight Solstice Afro House는 이미 완료되었습니다.`);
        } else {
            let retries = 2;
            while (retries > 0) {
                try {
                    await processTrack(auth, "Midnight Solstice Afro House", true, baseDate.toISOString());
                    break;
                } catch (e) {
                    retries--;
                    console.error(`⚠️ [Retry] 트랙 2 생성 실패. 남은 횟수: ${retries}`);
                    if (retries === 0) throw e;
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }

        console.log(`\n======================================================`);
        console.log(`🎉 [V3 전 공정 완료] 4개의 영상이 업로드 및 예약되었습니다.`);
        console.log(`======================================================\n`);

    } catch (error) {
        console.error(`❌ [Runner V3 Error]:`, error);
    }
}

if (require.main === module) {
    runV3Runner();
}
