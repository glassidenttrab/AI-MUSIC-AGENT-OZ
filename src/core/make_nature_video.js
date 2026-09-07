const path = require('path');
const fs = require('fs-extra');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

/**
 * Nature & Zen 채널 전용 장시간/고화질 비디오 렌더러
 * @param {string} imagePath - 고화질 16:9 배경 이미지
 * @param {string} audioPath - 오디오 파일 경로
 * @param {string} outputFilename - 생성될 mp4 파일명
 * @param {number} [targetDurationMinutes=60] - 목표 영상 길이 (분 단위, 기본 60분)
 */
async function renderNatureVideo(imagePath, audioPath, outputFilename, targetDurationMinutes = 60) {
    const videoDir = path.join(__dirname, '../../videos', 'NATURE_ZEN');
    await fs.ensureDir(videoDir);
    const outputPath = path.join(videoDir, outputFilename);

    console.log(`\n🎬 [Nature Zen 비디오 렌더링 개시]`);
    console.log(`   - 배경 이미지: ${path.basename(imagePath)}`);
    console.log(`   - 오디오: ${path.basename(audioPath)}`);
    console.log(`   - 목표 시간: ${targetDurationMinutes}분`);

    const targetSeconds = targetDurationMinutes * 60;

    const args = [
        '-y',
        '-loop', '1',
        '-framerate', '1',
        '-i', imagePath,
        '-stream_loop', '-1',
        '-i', audioPath,
        '-c:v', 'libx264',
        '-tune', 'stillimage',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-pix_fmt', 'yuv420p',
        '-t', targetSeconds.toString(),
        '-shortest',
        outputPath
    ];

    try {
        console.log(`   ⏳ FFmpeg 렌더링 진행 중...`);
        execFileSync(ffmpegPath, args, { stdio: 'pipe' });
        console.log(`✅ [성공] Nature Zen 영상 렌더링 완료: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error(`❌ [오류] Nature Zen 영상 렌더링 실패:`, error.message);
        throw error;
    }
}

module.exports = {
    renderNatureVideo
};
