// [안정성 패치] 비-터미널 환경(로그 리다이렉션 등)에서 clearLine/cursorTo 오류 방지
[process.stdout, process.stderr].forEach(s => {
    if (s && (!s.isTTY || typeof s.clearLine !== 'function')) {
        s.clearLine = s.clearLine || ((dir) => {});
        s.cursorTo = s.cursorTo || ((x, y) => {});
    }
});

const path = require('path');
const fs = require('fs-extra');
const { createSlideshowVideo } = require('../core/make_video');
const { generateMusic } = require('../core/generate_music');
const { authorize, uploadVideo } = require('../core/youtube_upload');
const { createDynamicThumbnail, createSlideVariants, createLyricThemedImages } = require('../core/make_thumb');

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

        const musicDir = path.join(__dirname, '../../music/General');

        // 2. 비디오 합성 소스 정의
        const promptEngineer = require('../core/prompt_engineer');

        // [Smart Skip] 오늘 생성된 기존 음원이 있는지 먼저 확인
        let promptData = null;
        const filesInDir = fs.existsSync(musicDir) ? fs.readdirSync(musicDir) : [];
        const todaySong = filesInDir.find(f => f.includes(dateString) && f.endsWith('.mp3'));

        if (todaySong) {
            console.log(`✨ [Smart Detect] 오늘 생성된 음원 [${todaySong}]을 발견했습니다!`);
            console.log(`⏩ 외부 API 장애를 대비하여 AI 브레인 단계를 건너뛰고 즉시 영상 합성을 진행합니다.`);
            
            // 파일명에서 정보 추출 (형식: Genre_Theme_Date_Index.mp3)
            const parts = todaySong.replace('.mp3', '').split('_');
            const detectedGenre = parts[0] || "Jazz Lounge";
            const detectedTheme = parts[2] || "OZ CAFE"; 

            promptData = {
                fullPrompt: `${detectedGenre} with ${detectedTheme} theme`,
                lyrics: "OZ CAFE - Sophisticated Jazz Lounge\nEnjoy the peaceful vibes of the ethereal world.",
                storytellingTitle: `[OZ CAFE] ${detectedGenre} - ${detectedTheme} (AI Original Mix)`,
                components: {
                    genre: detectedGenre,
                    mood: "Sophisticated",
                    instrument: "Piano & Bass",
                    vocal: "Instrumental",
                    theme: detectedTheme
                }
            };
        } else {
            // 💡 테마 선정 및 고도화된 프롬프트 생성 (클라우드 전용 엔진)
            const selectedTheme = await promptEngineer.selectOptimalTheme();
            promptData = await promptEngineer.generateStructuredPrompt(runIndex, false, selectedTheme);
        }

        const { fullPrompt, lyrics, storytellingTitle, components } = promptData;
        const { genre, mood, instrument, vocal, theme } = components;

        // 장르명과 제목, 생성일자, 인덱스를 결합하여 저장 경로 지정
        const sanitize = (str) => str.replace(/[\/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
        const genreSafe = sanitize(genre); 
        const titleSafe = sanitize(theme);
        const baseFileName = `${genreSafe}_${titleSafe}_${dateString}_${runIndex}`;
        
        const audioFileName = todaySong || `${baseFileName}.mp3`;
        const audioFile = path.join(musicDir, audioFileName);
        const videoDir = path.join(__dirname, '../../videos');
        const videoOutput = path.join(videoDir, `${baseFileName}.mp4`);

        // 썸네일 소스와 결과 출력 파일명
        const originalThumbFile = path.join(__dirname, '../../images', 'sample_thumb.png');
        const generatedThumbFile = path.join(__dirname, '../../images', `final_thumb_${runIndex}.png`);
        
        fs.ensureDirSync(videoDir);

        // 음악 길이 설정
        const musicDuration = process.env.OZ_MUSIC_DURATION ? parseInt(process.env.OZ_MUSIC_DURATION) : 181;
        console.log(`\n[2/4] Google Lyria RealTime 가동 - 작곡 단계 (${musicDuration}초)...`);
        
        // 음악 생성 (기속 파일 없을 시)
        if (!todaySong && !fs.existsSync(audioFile)) {
            await generateMusic(fullPrompt, audioFileName, musicDuration, lyrics);
        } else {
            console.log(`\n🎵 [알림] 기존 파일 [${audioFileName}]을 활용해 영상 합성을 진행합니다.`);
        }

        // [최종 경로 확정] 이미 위에서 확정된 audioFile을 사용
        const finalAudioPath = audioFile;
        const audioFileExists = fs.existsSync(finalAudioPath);
        const thumbFileExists = fs.existsSync(originalThumbFile);

        if (!audioFileExists || !thumbFileExists) {
            throw new Error(`❌ 필수 소스 파일 누락으로 합성을 중지합니다. 확인 필요: audioFile=${audioFileExists} (targetPath: ${finalAudioPath}), thumbFile=${thumbFileExists}`);
        }
        
        console.log(`✅ 소스 확인 완료: ${path.basename(finalAudioPath)}`);

        // 3. 썸네일 및 슬라이드쇼 이미지 생성
        await createDynamicThumbnail(originalThumbFile, generatedThumbFile, genre, mood);

        const slidesDir = path.join(__dirname, '../../images', 'slides');
        const genericSlides = await createSlideVariants(originalThumbFile, slidesDir, genre, mood);
        
        // [신규] 가사 및 테마 반영 이미지 3장 생성
        const lyricImages = await createLyricThemedImages(lyrics, theme, genre, mood);
        
        // 가사 이미지와 일반 슬라이드를 결합 (가사 이미지를 앞쪽에 배치하여 강조)
        const slideImages = [...lyricImages, ...genericSlides];

        // 4. 슬라이드쇼 비디오 렌더링
        console.log('\n[3/4] 슬라이드쇼 영상 합성 및 인코딩을 시작합니다...');
        await createSlideshowVideo(slideImages, audioFile, videoOutput, 12);
        console.log('\n✅ 최종 슬라이드쇼 비디오 합성 완료:', videoOutput);

        // 5. 메타데이터 및 유튜브 자동 송출 시작
        console.log('\n[4/4] 완성된 영상을 유튜브에 업로드하기 위한 패키징 진행 중...');

        const title = storytellingTitle;
        const description = `Welcome to the auditory archive of AI Music Agent [OZ].

This soundscape was autonomously composed, curated, and visualized by the OZ Engine, an advanced AI system analyzing 2026 global music trends and storytelling patterns. Every note, rhythm, and visual element is a unique synthesis of digital artistry.

▶ Analytics & Curation (Structured Prompt):
- Genre/Era: ${genre}
- Tempo/Mood: ${mood}
- Key Instrument: ${instrument}
- Vocal Presence: ${vocal}
- Narrative Theme: ${theme}

▶ Tracklist (Generated by OZ Engine):
- 00:00 ${mood} ${genre} Original Mix (feat. ${instrument})

▶ Lyrics (Generated by OZ):
${lyrics}

▶ System Log:
- Concept: A cinematic visual with ${mood} mood, capturing the essence of ${theme}.
- Engine: OZ v2.6.4 (High Fidelity)

#AIMusic #OzAgent #FutureSound #ElectronicSoul #VisualMusic`;

        const tags = [
            "AIMusic", "OzAgent", "FutureSound", "ElectronicSoul", "VisualMusic", 
            "GenerativeArt", "4K", "AmbientSoundscapes", "SeoulVibe", "DigitalArtistry",
            "ImmersiveExperience", "AIArtist", "SoundDesign", "CinematicAudio", "FutureBeats",
            genre.replace(/\s+/g, ''), mood.replace(/\s+/g, ''), theme.replace(/\s+/g, ''), "OzAI", "ModernAudio"
        ];

        // 유튜브 예약 시간 설정 (환경변수 OZ_PUBLISH_TIME: "HH:mm" 형식)
        let publishAt = null;
        if (process.env.OZ_PUBLISH_TIME) {
            const [hours, minutes] = process.env.OZ_PUBLISH_TIME.split(':');
            const scheduledDate = new Date();
            scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // [지능형 스케줄링] 현재 시간보다 예약 시간이 미래라면 오늘로, 과거라면 내일로 설정
            if (scheduledDate < new Date()) {
                scheduledDate.setDate(scheduledDate.getDate() + 1);
            }
            
            publishAt = scheduledDate.toISOString();
            console.log(`📅 예약 업로드 성공적 설정: ${publishAt}`);
        }

        // [신규] 생성 결과 리포트 작성 (reports 폴더)
        const reportDir = path.join(__dirname, '../../reports');
        const reportFile = path.join(reportDir, `${baseFileName}.md`);
        const reportContent = `# [AI MUSIC AGENT OZ] 생성 리포트\n\n` +
            `## 🎵 노래 정보\n` +
            `- **제목**: ${theme}\n` +
            `- **장르**: ${genre}\n` +
            `- **무드**: ${mood}\n` +
            `- **사용한 악기**: ${instrument}\n` +
            `- **보컬 스타일**: ${vocal}\n\n` +
            `## 🎤 가사\n` +
            `\`\`\`\n${lyrics}\n\`\`\`\n\n` +
            `## 📂 파일 정보\n` +
            `- **음원**: ${audioFileName}\n` +
            `- **영상**: ${baseFileName}.mp4\n` +
            `- **생성 일시**: ${now.toLocaleString()}\n` +
            `- **예약 공개**: ${publishAt || '미설정 (즉시 공개)'}`;

        await fs.ensureDir(reportDir);
        await fs.writeFile(reportFile, reportContent, 'utf8');
        console.log(`\n📄 [리포트 생성] 가사 및 메타데이터가 저장되었습니다: ${reportFile}`);

        // [다국어 로컬라이제이션] 제목 및 설명글 번역 생성
        let localizations = null;
        try {
            localizations = await promptEngineer.generateMultiLanguageMetadata(title, description);
        } catch (transErr) {
            console.warn(`⚠️ 다국어 번역본 생성 중 오류 발생: ${transErr.message}`);
        }

        // 유튜브 모듈 호출
        const videoId = await uploadVideo(auth, videoOutput, generatedThumbFile, title, description, tags, publishAt, {
            localizations: localizations
        });

        if (videoId) {
            console.log(`\n====== [AI MUSIC AGENT OZ] #${runIndex + 1} 사이클 성공 종료 ======`);
            
            // [자율 에이전트 메모리 연동] 업로드 이력 기록
            const memoryDir = path.join(__dirname, '../../.agent', 'memory');
            const memoryFile = path.join(memoryDir, 'upload_history.json');
            
            await fs.ensureDir(memoryDir);
            
            let history = [];
            if (fs.existsSync(memoryFile)) {
                try {
                    history = await fs.readJson(memoryFile);
                } catch (e) {
                    history = [];
                }
            }
            
            history.push({
                timestamp: new Date().toISOString(),
                status: "published",
                video_id: videoId,
                metadata: {
                    youtube_title: title,
                    genre: genre,
                    mood: mood,
                    prompt: fullPrompt,
                    publish_at: publishAt
                }
            });
            
            await fs.writeJson(memoryFile, history, { spaces: 4 });
            console.log(`[메모리] #${runIndex + 1} 업로드 이력이 저장되었습니다.`);

            // [지능형 피드백 루프 자동화] 업로드 후 성과 분석 엔진 실행
            console.log(`\n🔎 [오즈 메모리 엔진] 성과 분석 및 피드백 루프를 가동합니다...`);
            const { execSync } = require('child_process');
            try {
                const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
                const feedbackScript = path.join(__dirname, '../../.agent', 'tools', 'evaluate_feedback.py');
                const feedbackOutput = execSync(`${pythonCmd} "${feedbackScript}"`, { encoding: 'utf8' });
                console.log(feedbackOutput);
            } catch (err) {
                console.warn(`⚠️ 성과 분석 도중 경미한 오류가 발생했으나 업로드는 완료되었습니다: ${err.message}`);
            }
        }
        
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
