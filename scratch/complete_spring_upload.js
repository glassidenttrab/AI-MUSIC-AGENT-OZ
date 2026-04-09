const { generateHybridContent } = require('../generate_1hour_loop');
const { authorize, uploadVideo, getOrCreatePlaylist, addVideoToPlaylist, postComment } = require('../youtube_upload');
const path = require('path');

async function completeUpload() {
    console.log("🌸 [OZ] 롱폼 비디오 업로드 재시도 및 마무리 시작...");
    
    try {
        const theme = "Spring Blossom Walk";
        const result = await generateHybridContent(theme, false, 3.5, 1);
        
        const auth = await authorize();
        
        // 1. 롱폼 업로드 (실패했던 부분)
        console.log("📺 Step 1: 롱폼 비디오 업로드 재시도 중...");
        const loopVideoId = await uploadVideo(
            auth,
            result.loop.path,
            result.thumbnail,
            result.loop.title,
            result.loop.description,
            result.loop.tags
        );
        
        // 2. 후속 작업
        if (loopVideoId) {
            console.log("✅ 롱폼 업로드 성공! 재생목록 및 댓글 작성 중...");
            const playlistId = await getOrCreatePlaylist(auth, "OZ AI Healing Mix");
            if (playlistId) await addVideoToPlaylist(auth, loopVideoId, playlistId);
            await postComment(auth, loopVideoId, result.metadata.pinnedCommentCandidate);
        }

        console.log("\n✨ 모든 보완 작업이 완료되었습니다!");
        console.log(`- 롱폼(새로 업로드): https://youtu.be/${loopVideoId}`);
        console.log(`- 쇼츠(기존 성공): https://youtu.be/DUfpOPrMzr4`);
        
    } catch (error) {
        console.error("❌ 오류 발생:", error);
    }
}

completeUpload();
