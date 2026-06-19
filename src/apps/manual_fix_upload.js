const { authorize, uploadVideo, postComment } = require('../core/youtube_upload');
const fs = require('fs-extra');
const path = require('path');

async function runRecovery() {
    console.log(`\n============== [OZ MANUAL RECOVERY UPLOADER] ==============`);
    
    // 1. 영상 정보 설정 (고정)
    const runId = "loop_OZ_CAFE_inst";
    const baseDir = path.join(__dirname, '../../loops', runId);
    const metadataPath = path.join(baseDir, 'metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
        console.error(`❌ 메타데이터를 찾을 수 없습니다: ${metadataPath}`);
        return;
    }

    const metadata = await fs.readJson(metadataPath);
    const videoPath = path.join(baseDir, "OZ_CAFE_Session__1__Inst.__Optimized.mp4");
    const thumbnailPath = path.join(baseDir, "background_0.png");

    console.log(`📁 Target: ${videoPath}`);
    console.log(`🖼️ Thumb: ${thumbnailPath}`);

    if (!fs.existsSync(videoPath)) {
        console.error(`❌ 영상 파일이 존재하지 않습니다.`);
        return;
    }

    // 2. 유튜브 인증
    const auth = await authorize();
    
    // 3. 업로드 데이터 구성
    const title = `🎧 Sophisticated, Warm, Relaxing Jazz / Lounge mix | OZ CAFE | AI Music Agent OZ`;
    const description = `Full immersive audio experience curated by AI Music Agent [OZ].\n\n✨ Feel free to use this audio in your Shorts! Tag @OZ and share your creativity with the world.\n\nTheme: ${metadata.theme}\n\n${metadata.pinnedCommentCandidate}\n\n#OZ #Music #AI #Soundscape #Healing #Jazz #Lounge`;
    
    // 타임스탬프 챕터 구성
    const chapters = (metadata.tracklist || []).map(line => {
        const parts = line.split(' ');
        if (parts.length < 2) return null;
        const time = parts[0];
        const title = parts.slice(1).join(' ');
        return { time, title };
    }).filter(Boolean);

    // 4. 업로드 실행
    try {
        console.log(`🚀 업로드 시작 중... 잠시만 기다려주세요.`);
        const videoId = await uploadVideo(
            auth,
            videoPath,
            thumbnailPath,
            title,
            description,
            metadata.seoTags,
            null, // 즉시 공개
            { 
                notifySubscribers: true, 
                waitForProcessing: false, // 대기하지 않음 (대용량이므로)
                chapters: chapters 
            }
        );

        if (videoId) {
            console.log(`\n✅ 복구 업로드 성공! 새로운 ID: ${videoId}`);
            console.log(`🔗 URL: https://youtu.be/${videoId}`);
            
            // 고정 댓글 작성
            await postComment(auth, videoId, metadata.pinnedCommentCandidate);
            console.log(`💬 고정 댓글(참여 질문) 작성 완료`);

            // 히스토리 업데이트 유도 (이후 수동 기록 권장)
            console.log(`📝 upload_history.json에 이 새로운 ID(${videoId})를 기록해 주세요.`);
        }
    } catch (err) {
        console.error(`❌ 업로드 중 오류 발생:`, err.message);
    }
}

runRecovery().catch(console.error);
