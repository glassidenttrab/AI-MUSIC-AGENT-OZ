const { authorize, uploadVideo, getOrCreatePlaylist, addVideoToPlaylist, postComment } = require('../core/youtube_upload');
const path = require('path');
const fs = require('fs-extra');

const HISTORY_FILE = path.join(__dirname, '../../memory/upload_history.json');

async function updateHistory(entry) {
    try {
        const history = await fs.readJson(HISTORY_FILE);
        history.push(entry);
        await fs.writeJson(HISTORY_FILE, history, { spaces: 4 });
        console.log(`[History] '${entry.video_id}' 기록 완료.`);
    } catch (err) {
        console.error('⚠️ 이력 업데이트 실패:', err.message);
    }
}

async function runRecovery(folderPath) {
    console.log(`\n=== [RECOVERY] 대상 폴더: ${path.basename(folderPath)} ===`);
    
    try {
        if (!fs.existsSync(folderPath)) throw new Error("폴더가 존재하지 않습니다.");
        const metadata = await fs.readJson(path.join(folderPath, 'metadata.json'));
        
        // 파일 검색
        const files = await fs.readdir(folderPath);
        const compilationFile = files.find(f => f.endsWith('Compilation.mp4') || f === '_Compilation.mp4');
        const shortsFile = files.find(f => f.endsWith('Shorts.mp4'));
        const thumbFile = files.find(f => f.startsWith('background_0.png'));

        if (!compilationFile) throw new Error("풀버전 영상 파일을 찾을 수 없습니다.");

        const auth = await authorize();

        // 1. 풀버전 업로드
        console.log(`\n[1/3] 풀버전 업로드 중: ${compilationFile}`);
        const baseTitle = `[OZ] ${metadata.theme} | 1 Hour Immersive Loop 🎧`;
        const description = `Full immersive audio experience curated by AI Music Agent [OZ].\n\nTheme: ${metadata.theme}\nGenre: ${metadata.genre}\n\n[Tracklist]\n${metadata.tracklist.join('\n')}\n\n#OZ #Music #AI #Soundscape #Healing #Jazz #${metadata.genre.replace(/ /g, '')}`;

        const videoId = await uploadVideo(
            auth, 
            path.join(folderPath, compilationFile), 
            thumbFile ? path.join(folderPath, thumbFile) : null, 
            baseTitle, 
            description, 
            metadata.seoTags,
            null, // 즉시 공개
            { notifySubscribers: true }
        );

        if (videoId) {
            // 이력 추가
            await updateHistory({
                video_id: videoId,
                status: "published",
                type: "longform",
                timestamp: new Date().toISOString(),
                metadata: {
                    youtube_title: baseTitle,
                    theme: metadata.theme,
                    isInstrumental: metadata.vocalOrInst === 'instrumental'
                }
            });

            // 고정 댓글
            console.log('[2/3] 고정 댓글 작성 중...');
            await postComment(auth, videoId, metadata.pinnedCommentCandidate || "Enjoy the music! ✨");

            // 재생목록
            const playlistId = await getOrCreatePlaylist(auth, "OZ IMMERSIVE LOOPS");
            if (playlistId) await addVideoToPlaylist(auth, videoId, playlistId);
        }

        // 2. 쇼츠 업로드
        if (shortsFile) {
            console.log(`\n[3/3] 쇼츠 업로드 중: ${shortsFile}`);
            const shortsTitle = `${metadata.theme} Vibes ✨ #Shorts #AI #OZ`;
            const shortsId = await uploadVideo(
                auth,
                path.join(folderPath, shortsFile),
                null,
                shortsTitle,
                `Experience ${metadata.theme} #Shorts #AI #Music #Soundscape`,
                metadata.seoTags
            );

            if (shortsId) {
                await updateHistory({
                    video_id: shortsId,
                    status: "published",
                    type: "shorts",
                    timestamp: new Date().toISOString(),
                    metadata: {
                        youtube_title: shortsTitle,
                        theme: metadata.theme,
                        isInstrumental: metadata.vocalOrInst === 'instrumental'
                    }
                });
            }
        }

        console.log(`\n✅ [COMPLETE] ${metadata.theme} 업로드 완료!`);

    } catch (err) {
        console.error(`\n❌ [ERROR] ${path.basename(folderPath)} 복구 실패:`, err.message);
    }
}

// CLI 실행
const target = process.argv[2];
if (target) {
    runRecovery(target);
} else {
    console.log("사용법: node src/apps/recovery_uploader.js [폴더경로]");
}
