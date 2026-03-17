const { SunoAI } = require('suno-ai');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

/**
 * Suno AI를 사용하여 가사가 있는 노래를 생성합니다.
 * @param {object} options - 생성 옵션
 * @param {string} options.lyrics - 가사 (prompt)
 * @param {string} options.style - 음악 스타일 (tags)
 * @param {string} options.title - 곡 제목
 * @param {string} options.filename - 저장할 파일명 (예: "vocal_song.mp3")
 */
async function generateSunoMusic(options) {
    const { lyrics, style, title, filename } = options;
    const cookie = process.env.SUNO_COOKIE;

    if (!cookie) {
        throw new Error("❌ SUNO_COOKIE가 .env 파일에 설정되어 있지 않습니다.");
    }

    const musicDir = path.join(__dirname, 'MUSIC');
    await fs.ensureDir(musicDir);

    console.log(`\n[Suno AI Bridge] 가사 기반 곡 생성을 시작합니다: "${title}"`);
    console.log(`스타일: ${style}`);

    const suno = new SunoAI(cookie);
    await suno.init();

    const payload = {
        prompt: lyrics,
        tags: style,
        title: title,
        mv: 'chirp-v3-5', // 최신 모델 시도 (v3.5)
        make_instrumental: false
    };

    try {
        console.log("🎵 Suno 서버에 작곡 요청을 보냈습니다. (약 1-2분 소요)");
        const songInfo = await suno.generateSongs(payload);
        
        if (!songInfo || songInfo.length === 0) {
            throw new Error("곡 생성 결과가 없습니다.");
        }

        // Suno는 보통 2개의 버전을 생성하므로 첫 번째 것을 사용
        const targetSong = songInfo[0];
        console.log(`✅ 곡 생성 완료! ID: ${targetSong.id}`);
        console.log(`🔗 오디오 URL: ${targetSong.audio_url}`);

        // 파일 다운로드 및 저장
        const outputPath = path.join(musicDir, filename);
        console.log(`💾 MUSIC 폴더로 다운로드 중...`);
        
        await suno.saveSongs([targetSong], musicDir);
        
        // suno.saveSongs는 id.mp3 형태로 저장하므로 파일명 변경 필요
        const downloadedFile = path.join(musicDir, `${targetSong.id}.mp3`);
        if (await fs.exists(downloadedFile)) {
            await fs.move(downloadedFile, outputPath, { overwrite: true });
            console.log(`✨ 최종 저장 완료: ${outputPath}`);
            return outputPath;
        } else {
            throw new Error("다운로드된 파일을 찾을 수 없습니다.");
        }

    } catch (error) {
        console.error("❌ Suno 생성 중 오류 발생:", error);
        throw error;
    }
}

module.exports = { generateSunoMusic };
