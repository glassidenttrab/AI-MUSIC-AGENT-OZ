const { generateHybridContent } = require('../generate_1hour_loop');
const { authorize, uploadVideo, getOrCreatePlaylist, addVideoToPlaylist, postComment } = require('../youtube_upload');
const path = require('path');
const fs = require('fs-extra');

async function runSpringSpecial() {
    console.log("🌸 [OZ Special Request] 봄 테마 제작 및 업로드 시작...");
    
    const theme = "Spring Blossom Walk";
    
    try {
        // 1. 콘텐츠 생성 (3분 목표, 곡 1개)
        console.log("🎵 Step 1: 음악 및 비디오 생성 중...");
        const result = await generateHybridContent(theme, false, 3.5, 1);
        
        // 2. 유튜브 인증
        console.log("🔐 Step 2: 유튜브 API 인증 중...");
        const auth = await authorize();
        
        // 3. 롱폼 업로드
        console.log("📺 Step 3: 롱폼 비디오 업로드 중...");
        const loopVideoId = await uploadVideo(
            auth,
            result.loop.path,
            result.thumbnail,
            result.loop.title,
            result.loop.description,
            result.loop.tags
        );
        
        // 4. 쇼츠 업로드
        console.log("📱 Step 4: 쇼츠 비디오 업로드 중...");
        const shortsVideoId = await uploadVideo(
            auth,
            result.shorts.path,
            null,
            result.shorts.title,
            result.shorts.description,
            result.shorts.tags
        );
        
        // 5. 후속 작업 (재생목록 추가 및 댓글)
        if (loopVideoId) {
            const playlistId = await getOrCreatePlaylist(auth, "OZ AI Healing Mix");
            if (playlistId) await addVideoToPlaylist(auth, loopVideoId, playlistId);
            await postComment(auth, loopVideoId, result.metadata.pinnedCommentCandidate);
        }
        
        console.log("\n✨ [OZ Special Request] 모든 작업이 완료되었습니다!");
        console.log(`- 롱폼: https://youtu.be/${loopVideoId}`);
        console.log(`- 쇼츠: https://youtu.be/${shortsVideoId}`);
        
    } catch (error) {
        console.error("❌ 오류 발생:", error);
    }
}

runSpringSpecial();
