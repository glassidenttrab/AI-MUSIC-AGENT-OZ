const ffmpegPath = require('ffmpeg-static');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

/**
 * 단일 정지 이미지 + 오디오로 비디오를 생성합니다. (기존 방식)
 * @param {string} audioPath - 원본 오디오 파일 경로
 * @param {string} imagePath - 원본 이미지 파일 경로
 * @param {string} outputPath - 출력 MP4 경로
 */
function createVideo(audioPath, imagePath, outputPath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(audioPath)) return reject(new Error(`오디오 파일을 찾을 수 없습니다: ${audioPath}`));
        if (!fs.existsSync(imagePath)) return reject(new Error(`이미지 파일을 찾을 수 없습니다: ${imagePath}`));

        console.log('\n[비디오 합성 엔진 가동] 정지 이미지 + 오디오 병합 중...');
        if (fs.existsSync(outputPath)) fs.removeSync(outputPath);

        const args = [
            '-y',
            '-loop', '1', '-i', imagePath,
            '-i', audioPath,
            '-c:v', 'libx264', '-tune', 'stillimage',
            '-c:a', 'aac', '-b:a', '192k',
            '-pix_fmt', 'yuv420p',
            '-shortest',
            outputPath
        ];

        execFile(ffmpegPath, args, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ 비디오 합성 중 오류 발생:`, error.message);
                return reject(error);
            }
            console.log(`✅ 비디오 합성이 완료되었습니다. 저장 위치: ${outputPath}`);
            resolve(outputPath);
        });
    });
}

/**
 * 여러 이미지를 순환하는 슬라이드쇼 비디오를 생성합니다. (페이드 전환 포함)
 * @param {string[]} slideImages - 슬라이드 이미지 경로 배열
 * @param {string} audioPath - 오디오 파일 경로
 * @param {string} outputPath - 출력 MP4 파일 경로
 * @param {number} slideDuration - 각 슬라이드 표시 시간 (초, 기본값: 10)
 */
function createSlideshowVideo(slideImages, audioPath, outputPath, slideDuration = 10) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(audioPath)) return reject(new Error(`오디오 파일을 찾을 수 없습니다: ${audioPath}`));

        console.log('\n[슬라이드쇼 엔진 가동] 다중 이미지 순환 비디오 제작 중...');
        console.log(`  📸 슬라이드: ${slideImages.length}장 / ⏱️ 각 ${slideDuration}초 표시`);

        if (fs.existsSync(outputPath)) fs.removeSync(outputPath);

        // concat 목록 파일 생성 (FFmpeg concat demuxer 용)
        const concatFilePath = path.join(path.dirname(outputPath), '_slides_concat.txt');
        
        // 오디오 길이를 커버할 만큼 슬라이드를 반복 배치 (넉넉하게)
        const totalSlidesNeeded = Math.ceil(300 / slideDuration) + 2; // 최대 5분 커버
        
        let concatContent = '';
        for (let i = 0; i < totalSlidesNeeded; i++) {
            const imgPath = slideImages[i % slideImages.length];
            // Windows 경로의 백슬래시를 포워드슬래시로 변환하고 따옴표로 감싸기
            const safePath = imgPath.replace(/\\/g, '/');
            concatContent += `file '${safePath}'\n`;
            concatContent += `duration ${slideDuration}\n`;
        }
        // concat demuxer 규칙: 마지막 이미지는 duration 없이 한 번 더 명시
        const lastImg = slideImages[(totalSlidesNeeded) % slideImages.length].replace(/\\/g, '/');
        concatContent += `file '${lastImg}'\n`;
        
        fs.writeFileSync(concatFilePath, concatContent, 'utf8');

        const args = [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concatFilePath,
            '-i', audioPath,
            '-vf', 'fps=25,format=yuv420p',
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            '-movflags', '+faststart',
            outputPath
        ];

        console.log('  🎬 FFmpeg 슬라이드쇼 렌더링 시작...');

        const proc = execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            // 임시 concat 파일 정리
            try { fs.removeSync(concatFilePath); } catch (e) {}

            if (error) {
                console.error(`❌ 슬라이드쇼 비디오 합성 중 오류:`, error.message);
                return reject(error);
            }

            const outputSize = fs.statSync(outputPath).size;
            console.log(`✅ 슬라이드쇼 비디오 완성! (${(outputSize / 1024 / 1024).toFixed(1)}MB) -> ${outputPath}`);
            resolve(outputPath);
        });
    });
}

module.exports = { createVideo, createSlideshowVideo };
