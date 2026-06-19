const { authorize, uploadVideo, getOrCreatePlaylist, addVideoToPlaylist, postComment } = require('../core/youtube_upload');
const path = require('path');
const fs = require('fs-extra');

async function recoverUpload() {
    console.log('=== [RECOVERY] 실종된 OZ CAFE 영상 구출 작전 시작 ===');
    
    try {
        const auth = await authorize();
        const folder = path.join(__dirname, '../../loops/loop_OZ_CAFE_inst');
        const metadata = await fs.readJson(path.join(folder, 'metadata.json'));
        
        const compilationFile = path.join(folder, '_Instrumental___OZ____Cafe___Study___-_Cozy_1960s_Slow_Jazz_Ballad____Compilation.mp4');
        const shortsFile = path.join(folder, '_Instrumental___OZ____Cafe___Study___-_Cozy_1960s_Slow_Jazz_Ballad____Shorts.mp4');
        const thumbFile = path.join(folder, 'background_0.png');

        const baseTitle = "[Instrumental] [OZ] | Cafe & Study | - Cozy 1960s Slow Jazz Ballad 🎧";
        const tracklistText = metadata.tracklist.join('\n');
        const ugcEncouragement = "✨ Feel free to use this audio in your Shorts! Tag @OZ and share your creativity with the world.";
        const engagementQuestion = "오늘의 이 음악은 당신에게 어떤 풍경을 떠올리게 하나요? ✨";
        
        const description = `Full immersive audio experience curated by AI Music Agent [OZ].\n\n${ugcEncouragement}\n\nTheme: OZ CAFE\n\n[Tracklist]\n${tracklistText}\n\n${engagementQuestion}\n\n#OZ #Music #AI #Soundscape #Healing #Jazz #Study`;

        // 1. 풀버전 업로드
        console.log('\n[1/3] 풀버전 영상 업로드 중...');
        const videoId = await uploadVideo(auth, compilationFile, thumbFile, baseTitle, description, metadata.seoTags);
        
        // 2. 고정 댓글 작성
        if (videoId) {
            console.log('[2/3] 고정 댓글 작성 중...');
            await postComment(auth, videoId, metadata.pinnedCommentCandidate);
            
            // 재생목록 추가
            const playlistId = await getOrCreatePlaylist(auth, "OZ CAFE Series");
            if (playlistId) {
                await addVideoToPlaylist(auth, videoId, playlistId);
            }
        }

        // 3. 쇼츠 업로드
        console.log('\n[3/3] 쇼츠 영상 업로드 중...');
        const shortsTitle = `Jazz for Study: ${metadata.shortsHook} #Shorts #Jazz #OZ`;
        await uploadVideo(auth, shortsFile, null, shortsTitle, "Used #Shorts #AI #Music", metadata.seoTags);

        console.log('\n✅ [SUCCESS] 모든 영상 구출 및 업로드 완료!');
        
    } catch (err) {
        console.error('\n❌ [ERROR] 구출 작전 중 오류 발생:', err.message);
    }
}

recoverUpload();
