const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

/**
 * [업그레이드] 고도화된 Python 기반 Lyria 3 엔진을 호출하는 래퍼 함수입니다.
 * 
 * @param {string} promptText - 음악 생성에 사용할 키워드 또는 프롬프트
 * @param {string} filename - 저장될 파일 이름 (예: "result_music.mp3")
 * @param {number} durationSeconds - (참고용) 현재 Pro(3분)/Clip(30초) 모델로 구분
 * @param {string} lyrics - 가사 (선택 사항)
 * @param {string} category - 저장 폴더 카테고리 (예: "Jazz", "Lofi")
 */
async function generateMusic(promptText, filename, durationSeconds = 180, lyrics = null, category = "General") {
    const musicDir = path.join(__dirname, '../../music', category);
    await fs.ensureDir(musicDir);

    const outputPath = path.join(musicDir, filename);
    const pythonScript = path.join(__dirname, 'generate_lyria_music.py');
    const isClip = durationSeconds < 40;

    // [핵심] 다중 API 키 로테이션 및 재시도 로직
    const apiKeys = (process.env.GEMINI_API_KEY || "").split(',').map(k => k.trim()).filter(k => k);
    let keyIndex = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = 20; // 다중 키 환경을 고려하여 시도 횟수를 대폭 상향

    console.log(`\n[AI Composer] Lyria 3 엔진 가동 준비... (가용 키: ${apiKeys.length}개)`);
    
    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const currentKey = apiKeys[keyIndex % apiKeys.length];
        
        console.log(`🧠 [시도 ${attempts}/${MAX_ATTEMPTS}] Key #${(keyIndex % apiKeys.length) + 1} 사용 중...`);
        if (lyrics) console.log(`🎤 가사 포함 생성 모드 활성`);

        const pythonPath = `C:/Users/Ozpix/AppData/Local/Programs/Python/Python313/python.exe`;
        const { spawnSync } = require('child_process');

        const args = [pythonScript, "--prompt", promptText, "--output", outputPath];
        if (lyrics) args.push("--lyrics", lyrics);
        if (isClip) args.push("--clip");

        try {
            const result = spawnSync(pythonPath, args, { 
                encoding: 'utf-8', 
                windowsHide: true,
                env: { ...process.env, GEMINI_API_KEY: currentKey, PYTHONIOENCODING: 'utf-8' }
            });

            const output = (result.stdout || "") + (result.stderr || "");
            
            // 1. 할당량 초과(429) 감지 및 로테이션/백오프
            if (output.includes("Resource has been exhausted") || output.includes("429")) {
                console.warn(`\n⚠️ [할당량 초과] 429 에러 감지 (Key #${(keyIndex % apiKeys.length) + 1}).`);
                
                if (apiKeys.length > 1) {
                    keyIndex++;
                    const nextKeyLabel = (keyIndex % apiKeys.length) + 1;
                    
                    // [핵심 개선] 전체 키를 한 바퀴 다 돌 때까지는 5초만 대기하며 다음 키 시도
                    const isFullRotation = attempts % apiKeys.length === 0;
                    const waitSec = isFullRotation ? 180 : 30; // 5초에서 30초로 상향 (IP 차단 회피용)
                    
                    console.log(`🔄 ${waitSec}초 대기 후 다음 API 키로 로테이션합니다... (Next: Key #${nextKeyLabel})`);
                    
                    // 모든 가용 키를 3바퀴 돌았는데도 계속 429라면 전멸 판정
                    if (attempts >= apiKeys.length * 3) {
                        console.error(`\n🚨 [경고] 가용한 모든 API 키(3회 순회)가 소진되었습니다.`);
                        throw new Error("QUOTA_EXHAUSTED_ALL_KEYS");
                    }
                    await new Promise(r => setTimeout(r, waitSec * 1000));
                } else {
                    console.log(`⏱️ 단일 키 운영 중. 150초 대기 후 재시도합니다...`);
                    await new Promise(r => setTimeout(r, 150000));
                }
                continue; 
            }

            // 2. 안전 필터 작동 감지
            if (output.includes("Safety triggered") || output.includes("차단됨")) {
                console.error(`\n❌ [차단] 프롬프트 안전 필터가 작동했습니다.`);
                throw new Error("Safety Filter Triggered");
            }

            // 3. 실행 결과 확인
            if (result.status === 0 && fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log(`\n✅ [성공] 음악 작곡 완료: ${filename} (크기: ${Math.round(stats.size/1024)} KB)`);
                return outputPath;
            } else {
                console.error(`\n❌ [실패] 엔진 종료 (Code: ${result.status})`);
                if (attempts === MAX_ATTEMPTS) throw new Error(`Python execution failed with code ${result.status}`);
            }

        } catch (err) {
            console.error(`⚠️ 회차 오류:`, err.message);
            if (attempts === MAX_ATTEMPTS) throw err;
            await new Promise(r => setTimeout(r, 5000)); // 일반 오류 시 5초 대기 후 재시도
        }
    }
    throw new Error("최대 재시도 횟수를 초과했습니다.");
}

module.exports = { generateMusic };

