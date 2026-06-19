const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

/**
 * Suno 비공식 API 래퍼를 통한 음악 생성 엔진
 * 
 * @param {string} promptText - 음악 스타일/장르/악기 프롬프트
 * @param {string} filename - 저장될 파일 이름
 * @param {number} durationSeconds - 생성 목표 길이 (Suno는 기본 2~4분 생성되며, 여기서는 참고용)
 * @param {string} lyrics - 가사 (없으면 Instrumental)
 * @param {string} category - 저장 폴더 카테고리
 */
async function generateSunoMusic(promptText, filename, durationSeconds = 180, lyrics = null, category = "General") {
    const musicDir = path.join(__dirname, '../../music', category);
    await fs.ensureDir(musicDir);
    const outputPath = path.join(musicDir, filename);

    const SUNO_API_URL = process.env.SUNO_API_URL || 'http://localhost:3000/api';
    
    console.log(`\n🎼 [Suno AI] 음악 생성 가동 (${category})`);
    console.log(`   🔸 목표 길이: ${durationSeconds}초, 보컬 유무: ${lyrics ? '보컬(가사 있음)' : '연주곡(Instrumental)'}`);

    try {
        // 1. 음악 생성 요청 (Generate)
        console.log(`   🧠 Suno 엔진에 생성 요청 중... (프롬프트: ${promptText.substring(0, 50)}...)`);
        const generateRes = await axios.post(`${SUNO_API_URL}/custom_generate`, {
            prompt: lyrics || "",
            tags: promptText,
            title: path.basename(filename, '.mp3'),
            make_instrumental: !lyrics,
            wait_audio: false
        });

        const data = generateRes.data;
        if (!data || !data.length) {
            throw new Error("Suno API 응답에 생성된 트랙 정보가 없습니다.");
        }

        // Suno는 기본적으로 2개의 트랙을 반환함
        const track1 = data[0];
        const track2 = data[1] || data[0];
        const targetId = track1.id;

        console.log(`   ⏳ 생성 대기 중... (Track ID: ${targetId})`);

        // 2. 상태 폴링 (Polling) - 생성 완료 대기
        let audioUrl = null;
        let attempts = 0;
        const MAX_POLLS = 60; // 최대 60 * 5초 = 300초 대기

        while (attempts < MAX_POLLS) {
            await new Promise(r => setTimeout(r, 5000)); // 5초 대기
            attempts++;
            
            const statusRes = await axios.get(`${SUNO_API_URL}/get?ids=${targetId}`);
            const trackInfo = statusRes.data[0];

            if (trackInfo.status === 'streaming' || trackInfo.status === 'complete') {
                if (trackInfo.audio_url) {
                    audioUrl = trackInfo.audio_url;
                    console.log(`   ✅ 생성 완료! (상태: ${trackInfo.status})`);
                    break;
                }
            } else if (trackInfo.status === 'error') {
                throw new Error("Suno 생성 실패 (status: error)");
            }
            
            process.stdout.write('.');
        }

        if (!audioUrl) {
            throw new Error("생성 시간 초과 (Timeout)");
        }

        // 3. 파일 다운로드
        console.log(`\n   📥 오디오 다운로드 중...`);
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        await fs.writeFile(outputPath, audioRes.data);

        console.log(`✅ [성공] Suno 음악 작곡 완료: ${filename}`);
        return outputPath;

    } catch (error) {
        console.error(`\n❌ [실패] Suno 엔진 오류:`, error.response ? JSON.stringify(error.response.data) : error.message);
        if (fs.existsSync(outputPath)) await fs.remove(outputPath);
        throw error;
    }
}

module.exports = { generateSunoMusic };
