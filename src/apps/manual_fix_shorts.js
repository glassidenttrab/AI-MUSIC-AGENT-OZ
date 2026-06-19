const { authorize, uploadVideo, recordHistory } = require('../core/youtube_upload');
const fs = require('fs-extra');
const path = require('path');

async function runShortsRecovery() {
    console.log(`\n============== [OZ MANUAL SHORTS RECOVERY] ==============`);
    
    const runId = "loop_OZ_CAFE_inst";
    const baseDir = path.join(__dirname, '../../loops', runId);
    const metadataPath = path.join(baseDir, 'metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
        console.error(`❌ 메타데이터를 찾을 수 없습니다.`);
        return;
    }

    const metadata = await fs.readJson(metadataPath);
    // 가장 용량이 큰(2.6MB) 쇼츠 후보 파일을 선택
    const shortsPath = path.join(baseDir, "_Instrumental___OZ____Cafe___Study___-_Cozy_1960s_Slow_Jazz_Ballad____Shorts.mp4");
    
    console.log(`📁 Target Shorts: ${shortsPath}`);

    if (!fs.existsSync(shortsPath)) {
        console.error(`❌ 쇼츠 영상 파일이 존재하지 않습니다.`);
        return;
    }

    const auth = await authorize();
    
    const title = `OZ CAFE의 감성을 1분 안에 느껴보세요 ☕️ #Shorts #Jazz #Lounge`;
    const description = `Full 1h version is available on our channel! \n\nTheme: ${metadata.theme}\n${metadata.shortsHook}\n\n#OZ #Music #AI #Soundscape #Healing #Jazz #Lounge #Cafe`;

    try {
        const videoId = await uploadVideo(
            auth,
            shortsPath,
            null, // 쇼츠는 썸네일 불필요 (보통 자동 생성)
            title,
            description,
            [...metadata.seoTags, "Shorts"],
            null,
            { waitForProcessing: false }
        );

        if (videoId) {
            console.log(`\n✅ 쇼츠 복구 업로드 성공! ID: ${videoId}`);
        }
    } catch (err) {
        console.error(`❌ 쇼츠 업로드 중 오류 발생:`, err.message);
    }
}

runShortsRecovery().catch(console.error);
