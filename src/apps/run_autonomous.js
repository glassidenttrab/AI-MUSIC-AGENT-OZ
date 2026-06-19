const { authorize, uploadVideo, getOrCreatePlaylist, addVideoToPlaylist, postComment, checkQuota } = require('../core/youtube_upload');
const { generateHybridContent } = require('./generate_1hour_loop');
const promptEngineer = require('../core/prompt_engineer');
const fs = require('fs-extra');
const path = require('path');
const notificationService = require('../core/notification_service');

/**
 * 🔒 PROJECT ISOLATION GATE:
 * Reference only __dirname based paths. NEVER use relative paths to enter
 * neighbor directories like 'f:\ProJectHome\Ozpix_Instar_Arin'.
 */

/**
 * 전역 로깅 함수 (파일 및 콘솔 동시 출력)
 */
async function logToFile(message) {
    const logDir = path.join(__dirname, '../../memory', 'logs');
    await fs.ensureDir(logDir);
    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `autonomous_${dateStr}.log`);
    const timestamp = new Date().toLocaleString();
    const formattedMessage = `[${timestamp}] ${message}\n`;
    
    process.stdout.write(formattedMessage);
    await fs.appendFile(logFile, formattedMessage);
}

/**
 * 2026 YouTube 트렌드를 분석하여 '가사곡'과 '연주곡' 2가지를 각각 생성하고,
 * 각 곡에 대해 '1시간 루프'와 '쇼츠' 버전을 만들어 총 4개의 영상을 예약 업로드합니다.
 */
/**
 * 매일 1회의 자율 사이클을 수행합니다.
 * 월~토: 곡 생성 -> 쇼츠 업로드 -> 원본 아카이브 보관
 * 일요일: 곡 생성 -> 쇼츠 업로드 -> 원본 아카이브 보관 -> [주간 옴니버스 병합 업로드]
 */
async function runAutonomousCycle() {
    try {
        const now = new Date();
        const isSunday = now.getDay() === 0;
        
        // [안정화] 중복 실행 방지 (Lock 시스템)
        const lockFile = path.join(__dirname, '../../.oz_autonomous.lock');
        if (fs.existsSync(lockFile)) {
            const pid = await fs.readFile(lockFile, 'utf8');
            await logToFile(`⚠️ [중단] 이미 자율 사이클이 실행 중입니다 (PID: ${pid}). 중복 실행을 차단합니다.`);
            return;
        }
        await fs.writeFile(lockFile, process.pid.toString());

        await logToFile(`=== [AI MUSIC AGENT OZ] 자율 전략 2.0: 주간 옴니버스 & 매일 쇼츠 모드 가동 ===`);
        await logToFile(`📅 현재 시각: ${now.toLocaleString()} (${isSunday ? '일요일 - 주간 결산의 날' : '평일 - 쇼츠 & 아카이브 모드'})`);

        // 1. 유튜브 인증
        const auth = await authorize();
        
        // 1.1 유튜브 할당량 체크 (업로드 제외 모드가 아닐 때만 체크)
        // [안정화] 롱폼(1600) + 쇼츠(1600) + 메타데이터 업데이트 등을 고려하여 최소 3500 이상 확보 확인
        const isQuotaAvailable = await checkQuota(auth, 3500);
        const skipUpload = process.argv.includes('--no-upload');

        if (!isQuotaAvailable && !skipUpload) {
            await logToFile(`⚠️ [중단] 유튜브 API 할당량이 부족합니다. 내일 다시 시도합니다.`);
            return;
        } else if (!isQuotaAvailable && skipUpload) {
            await logToFile(`🔔 [알림] 할당량이 부족하지만, --no-upload 모드이므로 생산 프로세스만 진행합니다.`);
        }

        // 2. 전략 수립 (v4 엔진 분석)
        // 비용 절감을 위해 하루에 1개 테마만 선정 (보컬/연주 여부는 랜덤 또는 교차)
        const isInst = Math.random() > 0.5;
        const theme = "Lofi Study Room"; // 사용자 요청에 의해 고정
        await logToFile(`🎯 오늘의 테마 선정(사용자 고정): [${theme}] (${isInst ? '연주곡' : '보컬곡'})`);

        // 3. 생산 프로세스 (2곡 배치 & 60분 루프 생산 - 초절전 모드)
        await logToFile(`🎶 [생산] 오늘의 메가 트랙 배치 제작 개시 (2곡 / 60분 - 초절전 모드)...`);
        const content = await generateHybridContent(theme, isInst, 60, 2);
        
        // 4. 롱폼(Long-form) 컴필레이션 업로드 (메인 콘텐츠)
        await logToFile(`📡 [롱폼 업로드] ${content.loop.title} (60분 합본)`);
        
        // 타임스탬프 챕터 정보 추출 (안전한 접근)
        const chapters = (content.metadata?.tracklist || []).map(line => {
            const parts = line.split(' ');
            if (parts.length < 2) return null;
            const time = parts[0];
            const title = parts.slice(1).join(' ');
            return { time, title };
        }).filter(Boolean);

        // [다국어 로컬라이제이션] 기본 실행 적용
        let loopLocalizations = null;
        try {
            loopLocalizations = await promptEngineer.generateMultiLanguageMetadata(content.loop.title, content.loop.description);
            // 번역 제목이 100자를 초과하지 않도록 검증 및 단축 (버그 예방)
            if (loopLocalizations) {
                for (const lang of Object.keys(loopLocalizations)) {
                    if (loopLocalizations[lang].title && loopLocalizations[lang].title.length > 95) {
                        loopLocalizations[lang].title = loopLocalizations[lang].title.substring(0, 92) + "...";
                    }
                }
            }
        } catch (transErr) {
            await logToFile(`⚠️ 롱폼 다국어 번역 생성 실패(기본 한글로 업로드): ${transErr.message}`);
        }

        const loopVideoId = await uploadVideo(
            auth,
            content.loop.path,
            content.thumbnail,
            content.loop.title,
            content.loop.description,
            content.loop.tags,
            null, // 즉시 공개
            { 
                notifySubscribers: true, 
                waitForProcessing: true,
                chapters: chapters, // 타임스탬프 자동 삽입
                localizations: loopLocalizations // 다국어 기본 주입
            }
        );

        if (loopVideoId) {
            await logToFile(`✅ 롱폼 업로드 성공! ID: ${loopVideoId}`);
            await recordHistory(loopVideoId, "Longform", content, false);
            
            // 고정 댓글로 참여 질문 작성
            await postComment(auth, loopVideoId, content.metadata.pinnedCommentCandidate);
        }

        // 5. 쇼츠(Shorts) 업로드 (유입용 서브 콘텐츠)
        await logToFile(`📡 [쇼츠 업로드] ${content.shorts.title} (#Shorts)`);
        // [다국어 로컬라이제이션] 기본 실행 적용
        let shortsLocalizations = null;
        try {
            shortsLocalizations = await promptEngineer.generateMultiLanguageMetadata(content.shorts.title, content.shorts.description);
            if (shortsLocalizations) {
                for (const lang of Object.keys(shortsLocalizations)) {
                    if (shortsLocalizations[lang].title && shortsLocalizations[lang].title.length > 95) {
                        shortsLocalizations[lang].title = shortsLocalizations[lang].title.substring(0, 92) + "...";
                    }
                }
            }
        } catch (transErr) {
            await logToFile(`⚠️ 쇼츠 다국어 번역 생성 실패(기본 한글로 업로드): ${transErr.message}`);
        }

        const shortsVideoId = await uploadVideo(
            auth, 
            content.shorts.path, 
            content.shorts.thumbnail || content.thumbnail, 
            content.shorts.title, 
            content.shorts.description, 
            content.shorts.tags, 
            null, // 즉시 공개
            { 
                waitForProcessing: false,
                localizations: shortsLocalizations // 다국어 기본 주입
            }
        );

        if (shortsVideoId) {
            await logToFile(`✅ 쇼츠 업로드 성공! ID: ${shortsVideoId}`);
            await recordHistory(shortsVideoId, "Shorts", content, true);
        }

        // 6. [NEW] 주간 골든 셀렉션 후보 선발 (매일 1곡)
        const candidatesDir = path.join(__dirname, '../../memory/weekly_best_candidates');
        await fs.ensureDir(candidatesDir);
        const dailyBestMetaPath = path.join(candidatesDir, 'candidates_meta.json');
        
        let weeklyMeta = [];
        if (fs.existsSync(dailyBestMetaPath)) {
            weeklyMeta = await fs.readJson(dailyBestMetaPath);
        }

        const dateTag = now.toISOString().split('T')[0];
        const bestAudioPath = path.join(candidatesDir, `${dateTag}_best.mp3`);
        const bestImagePath = path.join(candidatesDir, `${dateTag}_best.jpg`);
        
        // 첫 번째 트랙을 대표곡으로 복사
        if (content.audioPaths && content.audioPaths.length > 0) {
            await fs.copy(content.audioPaths[0], bestAudioPath);
            await fs.copy(content.thumbnail, bestImagePath);
            await logToFile(`🌟 [선발] 오늘의 대표곡을 주간 베스트 후보군에 등록했습니다.`);
        } else {
            await logToFile(`⚠️ [경고] 오디오 트랙 경로를 찾을 수 없어 주간 베스트 후보 등록을 건너뜁니다.`);
        }

        // [안정화] 메타데이터 기록 (트랙 제목 등 - 안전한 접근을 위해 구조 분해 및 폴백 적용)
        let trackTitle = `${theme} - Gold Selection`;
        try {
            if (content && content.metadata && Array.isArray(content.metadata.tracks) && content.metadata.tracks.length > 0) {
                trackTitle = content.metadata.tracks[0].title || trackTitle;
            }
        } catch (e) {
            await logToFile(`⚠️ 메타데이터 추출 중 오류 발생(무시하고 계속): ${e.message}`);
        }

        weeklyMeta.push({
            date: dateTag,
            audio: bestAudioPath,
            image: bestImagePath,
            title: trackTitle,
            theme: theme
        });
        
        // 중복 방지 (날짜 기준 유니크)
        const uniqueMeta = Array.from(new Map(weeklyMeta.map(item => [item.date, item])).values());
        await fs.writeJson(dailyBestMetaPath, uniqueMeta, { spaces: 4 });
        await logToFile(`🌟 [선발] 오늘의 대표곡 '${trackTitle}'을 주간 베스트 후보군에 등록했습니다.`);

        // 7. 고화질 원본 아카이브 보관 (일요일 백업용)
        const archiveDir = path.join(__dirname, '../../weekly_archive');
        await fs.ensureDir(archiveDir);
        const archiveFileName = `${dateTag}_${content.vocalOrInst}_${theme.replace(/\s+/g, '_')}.mp4`;
        const archivePath = path.join(archiveDir, archiveFileName);
        
        await fs.copy(content.loop.path, archivePath);
        await logToFile(`🔒 [아카이브] 오늘의 1시간 합본을 금고에 보관했습니다: ${archiveFileName}`);

        // 8. 일요일 주간 결산 (Weekly Golden Selection 7개 합본)
        if (isSunday) {
            await logToFile(`🏆 [주간 결산] 일요일입니다. 'Weekly Golden Selection' 제작을 시작합니다.`);
            
            if (uniqueMeta.length >= 7) {
                await logToFile(`📂 총 ${uniqueMeta.length}일치의 우수 트랙을 병합합니다...`);
                
                try {
                    const { concatAudioFiles, createSlideshowVideo, getAudioDuration } = require('../core/make_video');
                    const weeklyOutputDir = path.join(__dirname, '../../output/weekly_best');
                    await fs.ensureDir(weeklyOutputDir);
                    
                    const mergedAudioPath = path.join(weeklyOutputDir, `Weekly_Best_7_${dateTag}.mp3`);
                    const finalVideoPath = path.join(weeklyOutputDir, `Weekly_Golden_Selection_${dateTag}.mp4`);
                    
                    // 1. 오디오 병합
                    const audioList = uniqueMeta.map(m => m.audio);
                    await concatAudioFiles(audioList, mergedAudioPath);
                    
                    // 2. 트랙리스트 데이터 구성 (타임스탬프용)
                    let currentTime = 0;
                    const tracklistData = [];
                    for (const m of uniqueMeta) {
                        const duration = await getAudioDuration(m.audio);
                        tracklistData.push({
                            title: m.title,
                            time: formatTime(currentTime), // 00:00 포맷
                            startTime: currentTime,
                            duration: duration
                        });
                        currentTime += duration;
                    }

                    // 3. 주간 슬라이드쇼 영상 렌더링 (7장 이미지 순환 + 텍스트 오버레이)
                    const imageList = uniqueMeta.map(m => m.image);
                    await createSlideshowVideo(imageList, mergedAudioPath, finalVideoPath, 15, tracklistData);
                    
                    // 4. 주간 베스트 유튜브 업로드
                    const weeklyTitle = `[Weekly Best] Golden Selection Vol.${Math.floor(Date.now()/604800000)} | Top 7 AI Healing Tracks`;
                    const weeklyDesc = `A special collection of this week's best AI-curated music.\n\n[Tracklist]\n` + 
                                     tracklistData.map(t => `${t.time} ${t.title}`).join('\n') + 
                                     `\n\n#AI #Healing #WeeklyBest #Music #OZ`;
                    
                    // [다국어 로컬라이제이션] 기본 실행 적용
                    let weeklyLocalizations = null;
                    try {
                        weeklyLocalizations = await promptEngineer.generateMultiLanguageMetadata(weeklyTitle, weeklyDesc);
                        if (weeklyLocalizations) {
                            for (const lang of Object.keys(weeklyLocalizations)) {
                                if (weeklyLocalizations[lang].title && weeklyLocalizations[lang].title.length > 95) {
                                    weeklyLocalizations[lang].title = weeklyLocalizations[lang].title.substring(0, 92) + "...";
                                }
                            }
                        }
                    } catch (transErr) {
                        await logToFile(`⚠️ 주간베스트 다국어 번역 생성 실패: ${transErr.message}`);
                    }

                    const weeklyId = await uploadVideo(
                        auth,
                        finalVideoPath,
                        uniqueMeta[0].image, // 첫날 이미지를 대표 썸네일로
                        weeklyTitle,
                        weeklyDesc,
                        ["Weekly", "Best", "AI_Music", "Healing", "OZ"],
                        null,
                        { 
                            notifySubscribers: true, 
                            waitForProcessing: true,
                            localizations: weeklyLocalizations // 다국어 기본 주입
                        }
                    );

                    if (weeklyId) {
                        await logToFile(`🏆 [성공] 주간 골든 셀렉션 7곡 합본이 업로드되었습니다! ID: ${weeklyId}`);
                        
                        // 아카이브 및 정리
                        const historyDir = path.join(__dirname, '../../weekly_history', dateTag);
                        await fs.ensureDir(historyDir);
                        await fs.move(candidatesDir, path.join(historyDir, 'candidates_backup'), { overwrite: true });
                        await fs.ensureDir(candidatesDir); // 다음 주를 위해 재생성
                        await logToFile(`🧹 주간 데이터가 성공적으로 히스토리로 이동되었습니다.`);
                    }
                } catch (weeklyErr) {
                    await logToFile(`❌ 주간 결산 중 오류 발생: ${weeklyErr.message}`);
                }
            } else {
                await logToFile(`⚠️ 주간 결산을 위한 데이터가 부족합니다. (현재: ${uniqueMeta.length}/7일치)`);
            }
        }

        /**
         * 초 단위를 MM:SS 포맷으로 변환
         */
        function formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }

        await logToFile(`🏆 [SUCCESS] 오늘의 자율 사이클(전략 2.0)이 완수되었습니다.`);
        
        // 락 파일 해제
        if (fs.existsSync(lockFile)) await fs.remove(lockFile);

        // 알림 서비스
        try {
            if (notificationService.sendInfo) {
                const statusMsg = isSunday ? '쇼츠 및 주간 옴니버스 업로드 완료' : '쇼츠 업로드 및 아카이브 저장 완료';
                await notificationService.sendInfo('오즈 자율 사이클 완료', `🎉 ${statusMsg}\n테마: ${theme}`);
            }
        } catch (e) {}

    } catch (err) {
        await logToFile(`❌ 자율 사이클 중 치명적 오류 발생: ${err.message}`);
        if (err.stack) await logToFile(err.stack);

        // 오류 시에도 락 파일 해제
        if (fs.existsSync(lockFile)) await fs.remove(lockFile);

        if (err.message && err.message.includes("CRITICAL_CIRCUIT_BREAKER_TRIPPED")) {
            await logToFile(`🚨 서킷 브레이커가 발동되었습니다. 마스터 스케줄러의 재시도를 막기 위해 특수 종료 코드로 종료합니다.`);
            process.exit(99);
        }

        process.exit(1);
    }
}

// 업로드 이력 기록 (메모리 저장용)
async function recordHistory(videoId, type, content, isShorts = false) {
    const memoryDir = path.join(__dirname, '../../.agent', 'memory');
    const memoryFile = path.join(memoryDir, 'upload_history.json');
    await fs.ensureDir(memoryDir);

    let history = [];
    if (fs.existsSync(memoryFile)) {
        try { history = await fs.readJson(memoryFile); } catch (e) { history = []; }
    }

    const record = {
        timestamp: new Date().toISOString(),
        video_id: videoId,
        type: type, // "Shorts" 또는 "Omnibus"
        title: isShorts ? content.shorts.title : (content.loop ? content.loop.title : type),
        status: "published",
        metadata: {
            theme: content.components ? content.components.theme : "Weekly Compilation",
            genre: content.components ? content.components.genre : "Best of Week",
            isInst: content.vocalOrInst === 'instrumental'
        }
    };

    history.push(record);
    if (history.length > 500) history = history.slice(-500);
    
    await fs.writeJson(memoryFile, history, { spaces: 4 });
    console.log(`[메모리] ${type} 업로드 이력이 저장되었습니다.`);
}

if (require.main === module) {
    runAutonomousCycle().catch(console.error);
}
