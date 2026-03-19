const path = require('path');
const fs = require('fs-extra');
const { createSlideshowVideo } = require('./make_video');
const { generateMusic } = require('./generate_music');
const { authorize, uploadVideo } = require('./youtube_upload');
const { createDynamicThumbnail, createSlideVariants } = require('./make_thumb');

async function main() {
    console.log('====== [AI MUSIC AGENT OZ] 엔진 통합 모듈 가동 ======');

    // 명령줄 인자로 인덱스(0, 1, 2)를 받을 수 있도록 처리
    const runIndex = process.argv[2] ? parseInt(process.argv[2]) : 0;
    console.log(`[정보] #${runIndex + 1}번째 영상 작업 세션을 시작합니다.`);

    try {
        // 1. YouTube API 사전 인증 체크 (토큰.json 연동 확인)
        console.log('[1/4] YouTube 채널 인증 연결 확인 중...');
        const auth = await authorize();
        console.log('✅ YouTube 채널 인증 대기가 확인되었습니다.');

        // 2. 비디오 합성 소스 정의 
        const now = new Date();
        const dateString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;

        const musicDir = path.join(__dirname, 'MUSIC');

        // [OZ 에이전트 인공지능 뇌 확장] 동적 컨셉 생성기
        const genres = ["Jazz Hip Hop", "Cyberpunk EDM", "Chillout Deep House", "Cinematic Lofi Phonk", "Synthwave", "Ambient Electronic", "Future Bass"];
        const moods = ["Relaxing", "Energetic", "Melancholy", "Dreamy", "Futuristic", "Dark and Gritty", "Upbeat", "Chill"];
        const tempos = ["slow tempo", "mid-tempo", "fast paced", "driving beat", "laid back rhythm"];

        // 인덱스를 활용해 매번 다른 시드값을 가질 수 있도록 유도
        const randomSeed = Math.floor(Math.random() * 1000) + runIndex;
        const selectedGenre = genres[(Math.floor(Math.random() * genres.length) + runIndex) % genres.length];
        const selectedMood = moods[(Math.floor(Math.random() * moods.length) + runIndex) % moods.length];
        const selectedTempo = tempos[(Math.floor(Math.random() * tempos.length) + runIndex) % tempos.length];

        // 장르명과 생성일자, 인덱스를 결합하여 저장 경로 지정 (중복 방지)
        const genreTitleSafe = selectedGenre.replace(/\s+/g, '_'); 
        const audioFileName = `${genreTitleSafe}_${dateString}_${runIndex}.mp3`;
        const audioFile = path.join(musicDir, audioFileName);

        // 썸네일 소스와 결과 출력 파일명에 인덱스 부여 하여 덮어쓰기 방지
        const originalThumbFile = path.join(__dirname, 'sample_thumb.png');
        const generatedThumbFile = path.join(__dirname, `final_thumb_${runIndex}.png`);
        const videoOutput = path.join(__dirname, `final_output_${runIndex}.mp4`);

        // 음악 길이 설정 (기본 181초, 환경변수로 조절 가능)
        const musicDuration = process.env.OZ_MUSIC_DURATION ? parseInt(process.env.OZ_MUSIC_DURATION) : 181;
        console.log(`\n[2/4] Google Lyria RealTime 가동 - 완전 자동 작곡 단계 (${musicDuration}초)...`);
        const promptText = `${selectedMood} ${selectedGenre} with ${selectedTempo}, high quality production, atmospheric, instrumental`;
        console.log(`🧠 AI 뇌 생성 테마 -> ${promptText}`);

        // 음악 생성
        await generateMusic(promptText, audioFileName, musicDuration);

        // 파일 유효성 검사
        if (!fs.existsSync(audioFile) || !fs.existsSync(originalThumbFile)) {
            console.error('❌ 소스 파일이 존재하지 않아 합성을 중지합니다.');
            return;
        }

        // 3. 썸네일 및 슬라이드쇼 이미지 생성
        await createDynamicThumbnail(originalThumbFile, generatedThumbFile, selectedGenre, selectedMood);

        const slidesDir = path.join(__dirname, 'slides');
        const slideImages = await createSlideVariants(originalThumbFile, slidesDir, selectedGenre, selectedMood);

        // 4. 슬라이드쇼 비디오 렌더링
        console.log('\n[3/4] 슬라이드쇼 영상 합성 및 인코딩을 시작합니다...');
        await createSlideshowVideo(slideImages, audioFile, videoOutput, 10);
        console.log('\n✅ 최종 슬라이드쇼 비디오 합성 완료:', videoOutput);

        // 5. 메타데이터 및 유튜브 자동 송출 시작
        console.log('\n[4/4] 완성된 영상을 유튜브에 업로드하기 위한 패키징 진행 중...');

        const title = `[${selectedGenre}] ${selectedMood} 감성의 무한 루프 플레이리스트 🎧 | 2026 Trend Vol.${runIndex + 1}`;
        const description = `본 채널은 데이터 분석 기반 AI MUSIC AGENT 시스템에 의해 100% 자율 운영됩니다. 매일 새로운 무드와 장르를 결합하여 음악을 자동 생성합니다. (Series #${runIndex + 1})

▶ 오늘의 생성 테마 (AI Prompt):
- 장르: ${selectedGenre}
- 무드: ${selectedMood}
- 템포: ${selectedTempo}

▶ Tracklist (Generated automatically by OZ Engine)
- 00:00 ${selectedMood} ${selectedGenre} Original Mix

* Background Art Concept:
A cinematic, chill lofi anime style illustration for a YouTube channel banner. A futuristic cyberpunk DJ mixing music.`;

        const tags = [selectedGenre.replace(/\s+/g, ''), selectedMood.replace(/\s+/g, ''), "AIMusic", "OZAGENT", "Trending2026", "Instrumental", "Playlist"];

        // 유튜브 예약 시간 설정 (환경변수 OZ_PUBLISH_TIME: "HH:mm" 형식)
        let publishAt = null;
        if (process.env.OZ_PUBLISH_TIME) {
            const [hours, minutes] = process.env.OZ_PUBLISH_TIME.split(':');
            const scheduledDate = new Date();
            scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // 만약 예약 시간이 이미 지났다면 내일로 설정
            if (scheduledDate < new Date()) {
                scheduledDate.setDate(scheduledDate.getDate() + 1);
            }
            publishAt = scheduledDate.toISOString();
            console.log(`📅 예약 업로드 설정: ${publishAt}`);
        }

        // 유튜브 모듈 호출
        await uploadVideo(auth, videoOutput, generatedThumbFile, title, description, tags, publishAt);

        console.log(`\n====== [AI MUSIC AGENT OZ] #${runIndex + 1} 사이클 성공 종료 ======`);
        
        // scheduler.js에서 루프를 돌릴 때 프로세스가 종료되지 않게 main 함수 종료로 마무리
        // (단일 실행 시를 위해 exit는 require.main 체크 부분에서 처리)

    } catch (err) {
        console.error(`❌ #${runIndex + 1} 프로세스 구동 중 치명적 오류 발생:`, err);
        throw err; // scheduler.js에서 잡을 수 있도록 throw
    }
}

// 스크립트 단독 호출 시 main 실행
if (require.main === module) {
    main().then(() => process.exit(0)).catch(() => process.exit(1));
}
