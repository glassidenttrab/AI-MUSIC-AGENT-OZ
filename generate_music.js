const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

/**
 * [업그레이드] 고도화된 Python 기반 Lyria 3 엔진을 호출하는 래퍼 함수입니다.
 * 모든 출력물은 프로젝트 루트의 'music' 폴더에 저장됩니다.
 * 
 * @param {string} promptText - 음악 생성에 사용할 키워드 또는 프롬프트
 * @param {string} filename - 저장될 파일 이름 (예: "result_music.mp3")
 * @param {number} durationSeconds - (참고용) 현재 Pro(3분)/Clip(30초) 모델로 구분
 */
async function generateMusic(promptText, filename, durationSeconds = 80, lyrics = null) {
    const musicDir = path.join(__dirname, 'music');
    await fs.ensureDir(musicDir);

    const outputPath = path.join(musicDir, filename);
    const pythonScript = path.join(__dirname, 'generate_lyria_music.py');

    // 80초 이상이면 Pro 모델(3분), 미만이면 Clip 모델(30초)로 자동 선택 (유동적 운영)
    const isClip = durationSeconds < 40;
    const modelFlag = isClip ? ["--clip"] : [];

    console.log(`\n[AI Composer OZ Engine] 최신 Lyria 3 Python 엔진을 가동합니다...`);
    console.log(`🧠 프롬프트: ${promptText}`);
    if (lyrics) console.log(`🎤 가사 포함 생성: ${lyrics.substring(0, 50)}...`);
    console.log(`⏳ 목표 길이: 약 ${isClip ? '30초' : '3분 이내'} (Pro 모델 적용)`);

    return new Promise((resolve, reject) => {
        const pythonPath = `C:/Users/Ozpix/AppData/Local/Programs/Python/Python313/python.exe`;
        const { spawnSync } = require('child_process');

        const args = [
            pythonScript,
            "--prompt", promptText,
            "--output", outputPath,
        ];
        if (lyrics) {
            args.push("--lyrics", lyrics);
        }
        if (isClip) args.push("--clip");

        console.log(`\n[AI Composer OZ Engine] 최신 Lyria 3 엔진 가동 중...`);
        
        try {
            const result = spawnSync(pythonPath, args, { 
                encoding: 'utf-8', 
                windowsHide: true,
                env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
            });

            if (result.stdout) console.log(`[Python Engine Stdout]: ${result.stdout.trim()}`);
            if (result.stderr && !result.stderr.includes('DeprecationWarning')) {
                console.error(`[Python Engine Stderr]: ${result.stderr.trim()}`);
            }

            if (result.error || result.status !== 0) {
                console.error(`\n❌ [실패] 파이썬 엔진 실행 오류 (코드: ${result.status})`);
                return reject(result.error || new Error(`Exit code: ${result.status}`));
            }

            if (fs.existsSync(outputPath)) {
                console.log(`\n✅ [성공] 음악 작곡 및 파일 저장이 완료되었습니다: ${filename}`);
                resolve(outputPath);
            } else {
                console.error(`\n❌ [실패] 음악 파일이 생성되지 않았습니다: ${outputPath}`);
                reject(new Error(`Music file not created`));
            }
        } catch (error) {
            console.error(`\n❌ [실패] 예상치 못한 오류 발생:`, error.message);
            reject(error);
        }
    });
}

module.exports = { generateMusic };

