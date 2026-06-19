const fs = require('fs-extra');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
require('dotenv').config();

const ffmpegPath = require('ffmpeg-static');

/**
 * 오디오 파일의 길이를 초 단위로 반환하는 헬퍼 함수
 */
async function getAudioDuration(audioPath) {
    try {
        const ffprobePath = ffmpegPath.replace('ffmpeg.exe', 'ffprobe.exe');
        if (!fs.existsSync(ffprobePath)) {
            const stat = fs.statSync(audioPath);
            return stat.size / 16384;
        }

        const args = [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            audioPath
        ];
        const result = spawnSync(ffprobePath, args, { encoding: 'utf-8', windowsHide: true });
        
        const duration = parseFloat(result.stdout.trim());
        if (isNaN(duration)) {
            const stat = fs.statSync(audioPath);
            return stat.size / 16384;
        }
        return duration;
    } catch (e) {
        return 0;
    }
}

/**
 * [V4.5 고도화] 고도화된 Python 기반 Lyria 3 엔진을 호출하는 래퍼 함수입니다.
 * 
 * @param {string} promptText - 음악 생성에 사용할 키워드 또는 프롬프트
 * @param {string} filename - 저장될 파일 이름 (예: "result_music.mp3")
 * @param {number} durationSeconds - 생성 목표 길이
 * @param {string} lyrics - 가사 (선택 사항)
 * @param {string} category - 저장 폴더 카테고리 (예: "Jazz", "Lofi")
 */
const { generateSunoMusic } = require('./generate_suno_music');

async function generateLyriaMusicInternal(promptText, filename, durationSeconds = 180, lyrics = null, category = "General") {
    const musicDir = path.join(__dirname, '../../music', category);
    await fs.ensureDir(musicDir);

    const outputPath = path.join(musicDir, filename);
    const pythonScript = path.join(__dirname, 'generate_lyria_music.py');
    const pythonPath = 'C:/Users/Ozpix/AppData/Local/Programs/Python/Python313/python.exe';

    const MAX_ATTEMPTS = 1; // [안정화] 무한 과금 방지를 위해 단일 시도만 허용 (재시도는 상위 루프 위임)
    let attempts = 0;

    console.log(`\n🎼 [Lyria 3 Pro] 고품질 롱폼 생성 모드 가동 (${category})`);
    console.log(`   🔸 목표 길이: ${durationSeconds}초`);

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`   🧠 [시도 ${attempts}/${MAX_ATTEMPTS}] 리리아 엔진 호출 중...`);

        // [안정화] 각 시도 전에 기존 파일이 있다면 삭제 (오염 방지)
        if (fs.existsSync(outputPath)) {
            await fs.remove(outputPath);
        }
        
        console.log(`[DEBUG] PROMPT LENGTH: ${promptText ? promptText.length : 0}, PROMPT: ${promptText ? promptText.substring(0, 100) : "EMPTY"}`);

        // 프롬프트가 너무 길거나 특수문자 이스케이프 문제를 피하기 위해 임시 파일로 전달
        const tempPromptPath = path.join(musicDir, `${filename}.prompt.txt`);
        await fs.writeFile(tempPromptPath, promptText, 'utf-8');

        try {
            const result = spawnSync(pythonPath, [pythonScript, "--prompt_file", tempPromptPath, "--output", outputPath], { 
                encoding: 'utf-8', 
                windowsHide: true,
                env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
            });

            // 프롬프트 임시 파일 정리
            if (fs.existsSync(tempPromptPath)) {
                await fs.remove(tempPromptPath);
            }


            const combinedOutput = (result.stdout || "") + (result.stderr || "");
            
            // 1. 할당량 초과(429) 감지 및 백오프 처리
            if (combinedOutput.includes("429") || combinedOutput.includes("Quota Exceeded")) {
                console.warn(`\n⚠️ [할당량 초과] 3분(180초) 대기 후 재시도합니다.`);
                await new Promise(r => setTimeout(r, 180000));
                continue; 
            }

            // 2. 실행 결과 확인
            if (result.status === 0 && fs.existsSync(outputPath)) {
                const actualDuration = await getAudioDuration(outputPath);
                
                // 만약 생성된 음원이 목표 길이보다 너무 짧고(예: 60초 미만), 롱폼 모드인 경우 
                if (durationSeconds >= 120 && actualDuration < 100 && attempts < MAX_ATTEMPTS) {
                    console.log(`   ⚠️ 생성된 음원이 너무 짧습니다 (${Math.round(actualDuration)}초). 재시도합니다...`);
                    await fs.remove(outputPath); // 짧은 파일 삭제 후 재시도
                    continue;
                }

                console.log(`\n✅ [성공] 음악 작곡 완료: ${filename} (길이: ${Math.round(actualDuration)}초)`);
                return outputPath;
            } else {
                console.error(`\n❌ [실패] 엔진 오류 (Code: ${result.status})`);
                console.error(`[PYTHON OUTPUT]\n${combinedOutput}\n`);
                // 실패했는데도 파일이 남아있다면 삭제 (비정상 파일 방지)
                if (fs.existsSync(outputPath)) await fs.remove(outputPath);

                if (attempts === MAX_ATTEMPTS) throw new Error(`Lyria Engine failed with code ${result.status}`);
            }

        } catch (err) {
            console.error(`⚠️ 작업 오류:`, err.message);
            // 예외 발생 시에도 불완전한 파일이 생성되었다면 삭제
            if (fs.existsSync(outputPath)) await fs.remove(outputPath);

            if (attempts < MAX_ATTEMPTS) {
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }
        }
    }

    throw new Error(`[Lyria 3 Pro] 모든 시도가 실패했습니다.`);
}

/**
 * 메인 음악 생성 라우터
 * .env의 MUSIC_ENGINE 값에 따라 Lyria 3 또는 Suno 엔진을 호출합니다.
 */
async function generateMusic(promptText, filename, durationSeconds = 180, lyrics = null, category = "General") {
    const engine = (process.env.MUSIC_ENGINE || 'lyria').toLowerCase();
    
    if (engine === 'suno') {
        return await generateSunoMusic(promptText, filename, durationSeconds, lyrics, category);
    } else {
        return await generateLyriaMusicInternal(promptText, filename, durationSeconds, lyrics, category);
    }
}

module.exports = { generateMusic };
