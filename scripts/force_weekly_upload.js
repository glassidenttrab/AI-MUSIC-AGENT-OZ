const fs = require('fs-extra');
const path = require('path');
const { authorize, uploadVideo } = require('../src/core/youtube_upload');
const { concatAudioFiles, createSlideshowVideo, getAudioDuration } = require('../src/core/make_video');

const __projectRoot = path.join(__dirname, '..');
const candidatesDir = path.join(__projectRoot, 'memory', 'weekly_best_candidates');
const metaPath = path.join(candidatesDir, 'candidates_meta.json');

/**
 * 초 단위를 MM:SS 포맷으로 변환
 */
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function forceWeeklyUpload() {
    console.log('🚀 [주간 결산 수동 모드] 주간 합본 및 업로드를 시작합니다...');

    if (!fs.existsSync(metaPath)) {
        console.error('❌ candidates_meta.json 파일을 찾을 수 없습니다.');
        return;
    }

    const weeklyMeta = await fs.readJson(metaPath);
    const uniqueMeta = Array.from(new Map(weeklyMeta.map(item => [item.date, item])).values());

    if (uniqueMeta.length === 0) {
        console.error('❌ 병합할 데이터가 없습니다.');
        return;
    }

    console.log(`📂 총 ${uniqueMeta.length}곡의 데이터를 병합합니다...`);

    // 경로 정규화 (상대경로를 절대경로로 변환)
    const normalizedMeta = uniqueMeta.map(m => {
        const audioPath = path.isAbsolute(m.audio) ? m.audio : path.join(candidatesDir, m.audio);
        const imagePath = path.isAbsolute(m.image) ? m.image : path.join(candidatesDir, m.image);
        return {
            ...m,
            audio: audioPath,
            image: imagePath
        };
    });

    try {
        const now = new Date();
        const dateTag = now.toISOString().split('T')[0];
        const weeklyOutputDir = path.join(__projectRoot, 'output', 'weekly_best');
        await fs.ensureDir(weeklyOutputDir);

        const mergedAudioPath = path.join(weeklyOutputDir, `Weekly_Best_${uniqueMeta.length}_${dateTag}.mp3`);
        const finalVideoPath = path.join(weeklyOutputDir, `Weekly_Golden_Selection_${dateTag}.mp4`);

        // 1. 오디오 병합
        console.log('🎼 오디오 파일 병합 중...');
        const audioList = normalizedMeta.map(m => m.audio);
        await concatAudioFiles(audioList, mergedAudioPath);
        console.log('✅ 오디오 병합 완료.');

        // 2. 트랙리스트 데이터 구성 (타임스탬프용)
        console.log('⏱️ 트랙리스트 타임스탬프 계산 중...');
        let currentTime = 0;
        const tracklistData = [];
        for (const m of normalizedMeta) {
            const duration = await getAudioDuration(m.audio);
            tracklistData.push({
                title: m.title,
                time: formatTime(currentTime),
                startTime: currentTime,
                duration: duration
            });
            currentTime += duration;
        }

        // 3. 주간 슬라이드쇼 영상 렌더링
        console.log('🎬 비디오 렌더링 중...');
        const imageList = normalizedMeta.map(m => m.image);
        await createSlideshowVideo(imageList, mergedAudioPath, finalVideoPath, 15, tracklistData);
        console.log('✅ 비디오 렌더링 완료.');

        // 4. 주간 베스트 유튜브 업로드
        console.log('📡 유튜브 업로드 준비 중...');
        const auth = await authorize();
        const weeklyTitle = `[Weekly Best] Golden Selection Vol.${Math.floor(Date.now()/604800000)} | Top ${uniqueMeta.length} AI Healing Tracks`;
        const weeklyDesc = `A special collection of this week's best AI-curated music.\n\n[Tracklist]\n` + 
                           tracklistData.map(t => `${t.time} ${t.title}`).join('\n') + 
                           `\n\n#AI #Healing #WeeklyBest #Music #OZ`;

        const weeklyId = await uploadVideo(
            auth,
            finalVideoPath,
            normalizedMeta[0].image, // 첫날 이미지를 대표 썸네일로
            weeklyTitle,
            weeklyDesc,
            ["Weekly", "Best", "AI_Music", "Healing", "OZ"],
            null,
            { notifySubscribers: true, waitForProcessing: true }
        );

        if (weeklyId) {
            console.log(`🏆 [성공] 주간 골든 셀렉션 ${uniqueMeta.length}곡 합본이 업로드되었습니다! ID: ${weeklyId}`);
            
            // 5. 아카이브 및 정리
            console.log('🧹 파일 정리 중...');
            const historyDir = path.join(__projectRoot, 'weekly_history', dateTag);
            await fs.ensureDir(historyDir);
            await fs.move(candidatesDir, path.join(historyDir, 'candidates_backup'), { overwrite: true });
            await fs.ensureDir(candidatesDir); // 다음 주를 위해 재생성
            console.log(`🧹 주간 데이터가 성공적으로 히스토리(${dateTag})로 이동되었습니다.`);
        } else {
            console.error('❌ 업로드 중 문제가 발생했습니다. 비디오 ID가 반환되지 않았습니다.');
        }

    } catch (err) {
        console.error(`❌ 주간 결산 중 오류 발생:`, err);
    }
}

forceWeeklyUpload();
