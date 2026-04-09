const fs = require('fs-extra');
const path = require('path');
const { authorize, getOrCreatePlaylist, addVideoToPlaylist } = require('./youtube_upload');

/**
 * 기존 upload_history.json에 기록된 동영상들을
 * 장르 기반 재생목록으로 이동시키는 일회성 스크립트
 */
async function migrateToPlaylists() {
    console.log("\n=== 기존 동영상 재생목록 일괄 연동 시작 ===");
    
    try {
        // 인증
        const auth = await authorize();
        
        const memoryFile = path.join(__dirname, '.agent', 'memory', 'upload_history.json');
        if (!fs.existsSync(memoryFile)) {
            console.log("업로드 히스토리가 존재하지 않습니다.");
            return;
        }

        const history = await fs.readJson(memoryFile);
        console.log(`총 ${history.length}개의 업로드 기록을 확인했습니다.`);

        for (const record of history) {
            if (!record.video_id) continue;
            
            const genre = record.metadata?.genre || 'AI Music';
            const title = record.metadata?.youtube_title || record.title || '';
            
            // 제목 기준으로 보컬/연주곡 여부 대략 추정 (없으면 Vocal)
            const isInst = title.toLowerCase().includes('inst') || title.includes('연주곡') || title.includes('BGM');
            
            const playlistTitle = `[${genre}] AI Best Collection (${isInst ? 'Inst' : 'Vocal'})`;
            
            console.log(`\n▶ 처리 중: [${record.video_id}] ${title.substring(0, 30)}...`);
            console.log(`  -> 대상 재생목록: ${playlistTitle}`);
            
            const playlistId = await getOrCreatePlaylist(auth, playlistTitle);
            if (playlistId) {
                await addVideoToPlaylist(auth, record.video_id, playlistId);
                // YouTube API 초당 요청 제한(Quota) 에러 방지를 위한 1초 대기
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log("\n✅ 모든 동영상 재생목록 자동 연동 완료!");

    } catch (e) {
        console.error("\n❌ 마이그레이션 중 오류 발생:", e);
    }
}

migrateToPlaylists();
