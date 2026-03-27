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
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
            '-c:v', 'libx264', '-tune', 'stillimage',
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
 * 오디오 파일의 길이를 초(second) 단위로 가져옵니다.
 * FFmpeg -i 명령의 출력(stderr)에서 Duration 정보를 파싱합니다.
 */
function getAudioDuration(audioPath) {
    return new Promise((resolve) => {
        const args = ['-i', audioPath];
        // ffmpeg -i는 출력 파일이 없으면 에러로 간주되므로 error 콜백에서도 stderr를 확인해야 함
        execFile(ffmpegPath, args, (error, stdout, stderr) => {
            const output = stderr || stdout;
            const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
            if (match) {
                const hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const seconds = parseInt(match[3]);
                const ms = parseInt(match[4]);
                const totalSeconds = (hours * 3600) + (minutes * 60) + seconds + (ms / 100);
                resolve(totalSeconds);
            } else {
                console.warn(`[주의] 오디오 길이를 감지하지 못했습니다. 기본값(180초)을 사용합니다.`);
                resolve(180);
            }
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
async function createSlideshowVideo(slideImages, audioPath, outputPath, slideDuration = 10) {
    if (!fs.existsSync(audioPath)) throw new Error(`오디오 파일을 찾을 수 없습니다: ${audioPath}`);

    // 오디오 길이를 동적으로 파악
    const audioSeconds = await getAudioDuration(audioPath);
    console.log(`\n[슬라이드쇼 엔진 가동] 다중 이미지 순환 비디오 제작 중...`);
    console.log(`  🎵 오디오 길이 감지: ${audioSeconds.toFixed(2)}초`);
    console.log(`  📸 슬라이드: ${slideImages.length}장 / ⏱️ 각 ${slideDuration}초 표시`);

    if (fs.existsSync(outputPath)) fs.removeSync(outputPath);

    // concat 목록 파일 생성 (FFmpeg concat demuxer 용)
    const concatFilePath = path.join(path.dirname(outputPath), `_slides_concat_${Date.now()}.txt`);
    
    // 오디오 길이를 정확히 커버하거나 약간 넘게 슬라이드를 배치
    const totalSlidesNeeded = Math.ceil(audioSeconds / slideDuration) + 1; 
    
    let concatContent = '';
    for (let i = 0; i < totalSlidesNeeded; i++) {
        const imgPath = slideImages[i % slideImages.length];
        const safePath = imgPath.replace(/\\/g, '/');
        concatContent += `file '${safePath}'\n`;
        concatContent += `duration ${slideDuration}\n`;
    }
    // concat demuxer 규칙: 마지막 이미지는 한 번 더 명시
    const lastImg = slideImages[(totalSlidesNeeded - 1) % slideImages.length].replace(/\\/g, '/');
    concatContent += `file '${lastImg}'\n`;
    
    fs.writeFileSync(concatFilePath, concatContent, 'utf8');

    const args = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFilePath,
        '-i', audioPath,
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=25,format=yuv420p',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest', // 오디오 길이에 맞춰 강제 단축
        '-movflags', '+faststart',
        outputPath
    ];

    console.log('  🎬 FFmpeg 슬라이드쇼 렌더링 시작...');

    return new Promise((resolve, reject) => {
        execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
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

/**
 * 유튜브 쇼츠용 세로형 비디오(9:16, 1080x1920)를 생성합니다.
 * @param {string} audioPath - 원본 오디오 파일 경로
 * @param {string} imagePath - 원본 이미지 파일 경로 (보통 16:9 이미지를 중앙 크롭/스케일링)
 * @param {string} outputPath - 출력 MP4 경로
 */
function createShortsVideo(audioPath, imagePath, outputPath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(audioPath)) return reject(new Error(`오디오 파일을 찾을 수 없습니다: ${audioPath}`));
        if (!fs.existsSync(imagePath)) return reject(new Error(`이미지 파일을 찾을 수 없습니다: ${imagePath}`));

        console.log('\n[쇼츠 생성 엔진 가동] 9:16 세로형 비디오 렌더링 중...');
        if (fs.existsSync(outputPath)) fs.removeSync(outputPath);

        // 이미지 비율을 9:16으로 맞추기 위해 중앙 크롭 및 스케일링 필터 적용
        // 1080:1920 규격에 맞게 조정
        const args = [
            '-y',
            '-loop', '1', '-i', imagePath,
            '-i', audioPath,
            '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p',
            '-c:v', 'libx264', '-tune', 'stillimage',
            '-shortest',
            outputPath
        ];

        execFile(ffmpegPath, args, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ 쇼츠 합성 중 오류 발생:`, error.message);
                return reject(error);
            }
            console.log(`✅ 쇼츠 비디오 완성이 완료되었습니다: ${outputPath}`);
            resolve(outputPath);
        });
    });
}

/**
 * 여러 오디오 파일을 하나로 합칩니다. (컴필레이션용)
 * @param {string[]} audioPaths - 합칠 오디오 파일 경로 배열
 * @param {string} outputPath - 결과 파일 경로
 */
function concatAudioFiles(audioPaths, outputPath) {
    return new Promise((resolve, reject) => {
        console.log(`\n[오디오 합성 엔진] ${audioPaths.length}개의 음원을 하나로 병합 중...`);
        if (fs.existsSync(outputPath)) fs.removeSync(outputPath);

        // FFmpeg concat demuxer용 목록 파일 생성
        const listFile = outputPath + '.list.txt';
        const content = audioPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(listFile, content, 'utf8');

        const args = [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', listFile,
            '-c', 'copy', // 재인코딩 없이 빠르게 병합
            outputPath
        ];

        execFile(ffmpegPath, args, (error, stdout, stderr) => {
            fs.removeSync(listFile);
            if (error) {
                console.error(`❌ 오디오 합병 중 오류 발생:`, error.message);
                return reject(error);
            }
            console.log(`✅ 오디오 합병 완료: ${outputPath}`);
            resolve(outputPath);
        });
    });
}

/**
 * 단일 오디오를 지정된 시간(초) 동안 반복하며 1시간 이상의 장편 비디오를 만듭니다. (초경제적 루프 모드)
 * @param {string} audioPath - 원본 오디오 파일 경로
 * @param {string} imagePath - 원본 이미지 파일 경로
 * @param {string} outputPath - 출력 MP4 경로
 * @param {number} targetDuration - 목표 길이 (초 단위, 기본 3600초 = 1시간)
 */
function createLoopVideo(audioPath, imagePath, outputPath, targetDuration = 3600) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(audioPath)) return reject(new Error(`오디오 파일을 찾을 수 없습니다: ${audioPath}`));
        if (!fs.existsSync(imagePath)) return reject(new Error(`이미지 파일을 찾을 수 없습니다: ${imagePath}`));

        console.log(`\n[초고효율 루프 엔진] 1시간(${targetDuration}초) 무한루프 비디오 제작 중...`);
        if (fs.existsSync(outputPath)) fs.removeSync(outputPath);

        // -stream_loop -1 을 사용하여 오디오를 무한 반복시키고, 
        // -t targetDuration 으로 최종 영상의 길이를 정확히 컷팅합니다.
        const args = [
            '-y',
            '-loop', '1', '-t', targetDuration.toString(), '-i', imagePath,
            '-stream_loop', '-1', '-i', audioPath,
            '-t', targetDuration.toString(),
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
            '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage',
            '-c:a', 'aac', '-b:a', '192k',
            outputPath
        ];

        execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ 루프 비디오 합성 중 오류 발생:`, error.message);
                return reject(error);
            }
            console.log(`✅ 1시간 무한루프 비디오 완성: ${outputPath}`);
            resolve(outputPath);
        });
    });
}

module.exports = { createVideo, createSlideshowVideo, createShortsVideo, concatAudioFiles, createLoopVideo };
