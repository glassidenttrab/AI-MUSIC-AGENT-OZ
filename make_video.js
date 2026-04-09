const ffmpegPath = require('ffmpeg-static');
const { execFile, spawn } = require('child_process');
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

        console.log(`  [FFmpeg CMD] ${ffmpegPath} ${args.join(' ')}`);

        execFile(ffmpegPath, args, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ 비디오 합성 중 오류 발생:`, error.message);
                console.error(`[FFmpeg STDERR]`, stderr);
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
        execFile(ffmpegPath, args, (error, stdout, stderr) => {
            const output = stderr || stdout;
            // 로케일 차이에도 대응할 수 있도록 'Duration: ' 문자열 검색 강화
            const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/i);
            if (match) {
                const hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const seconds = parseInt(match[3]);
                const ms = parseInt(match[4]);
                const totalSeconds = (hours * 3600) + (minutes * 60) + seconds + (ms / 100);
                resolve(totalSeconds);
            } else {
                console.warn(`[주의] 오디오 길이를 감지하지 못했습니다. (경로: ${audioPath})`);
                console.warn(`[FFmpeg 출력 전송]`, output.slice(0, 500));
                resolve(180); // 기본값 3분
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
/**
 * 여러 이미지를 순환하는 슬라이드쇼 비디오를 생성합니다. (페이드 전환 포함)
 * @param {string[]} slideImages - 슬라이드 이미지 경로 배열
 * @param {string} audioPath - 오디오 파일 경로
 * @param {string} outputPath - 출력 MP4 파일 경로
 * @param {number} slideDuration - 각 슬라이드 표시 시간 (초, 기본값: 10)
 * @param {Object[]} tracklistData - 곡 제목 및 시간 데이터 [{title, startTime, duration}]
 */
async function createSlideshowVideo(slideImages, audioPath, outputPath, slideDuration = 10, tracklistData = []) {
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
    const lastImg = slideImages[(totalSlidesNeeded - 1) % slideImages.length].replace(/\\/g, '/');
    concatContent += `file '${lastImg}'\n`;

    fs.writeFileSync(concatFilePath, concatContent, 'utf8');

    // [고도화] 텍스트 오버레이 필터 생성 (상단 중앙, 필기체)
    let textFilters = '';
    const FONT_PATH = 'C:/Windows/Fonts/arial.ttf'; // Gabriola 대신 안정적인 Arial 사용
    const fontExists = fs.existsSync(FONT_PATH);
    const finalFontPath = fontExists ? FONT_PATH : 'arial';

    tracklistData.forEach((track, idx) => {
        const start = track.startTime || 0;
        const end = start + (track.duration || 180);
        const safeTitle = (track.title || "").replace(/'/g, '').replace(/:/g, '\\:').replace(/\|/g, '\\|');

        textFilters += `,drawtext=fontfile='${finalFontPath.replace(/\\/g, '/').replace(/:/g, '\\:')}':text='${safeTitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=80:enable='between(t,${start},${end})':shadowcolor=black@0.5:shadowx=2:shadowy=2`;
    });

    // [개선] 프리미엄 와이드 사운드 웨이브 (Direct High-Res Rendering)
    const waveWidth = 1600;
    const waveHeight = 80;

    const waveFilter = 
        // 1. 고해상도에서 직접 미세 바 생성 (mode=cline, n=샘플 밀도)
        `[1:a]aformat=channel_layouts=mono,showwaves=s=${waveWidth}x${waveHeight}:mode=cline:colors=white@0.8:scale=sqrt:n=25[wave_raw];` +
        // 2. 약간의 부드러움을 위해 미세 블러 추가
        `[wave_raw]gblur=sigma=0.5[wave_smooth];` +
        // 3. 배경에 합성 (중앙 하단, 바닥에서 120px 띄움)
        `[bg][wave_smooth]overlay=x=(W-w)/2:y=H-120`;



    // [최적화] 윈도우 명령행 길이 제한을 피하기 위해 필터를 별도 파일로 저장
    const filterScriptPath = path.join(path.dirname(outputPath), `_filter_${Date.now()}.filter`);
    const filterContent = `[0:v]scale=1920:1080,zoompan=z=1:x=0:y=0:d=125:s=1920x1080,setsar=1[bg];${waveFilter}${textFilters}[out]`;








    fs.writeFileSync(filterScriptPath, filterContent, 'utf8');

    const args = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFilePath,
        '-i', audioPath,
        '-filter_complex_script', filterScriptPath, // 스크립트 파일 방식 사용
        '-map', '[out]',
        '-map', '1:a',
        '-r', '15',
        '-c:v', 'libx264',
        '-crf', '30',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        '-movflags', '+faststart',
        outputPath
    ];

    console.log('  🎬 FFmpeg 슬라이드쇼 렌더링 시작 (Batch File 모드)...');

    // [최적화] 모든 이스케이프 문제를 피하기 위해 배치 파일을 생성하여 실행
    const batPath = path.join(path.dirname(outputPath), `_render_${Date.now()}.bat`);
    const cmdForBat = `"${ffmpegPath}" ${args.map(arg => `"${arg.replace(/"/g, '""')}"`).join(' ')}`;
    fs.writeFileSync(batPath, `@echo off\n${cmdForBat}\nif %errorlevel% neq 0 exit /b %errorlevel%`, 'utf8');

    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(`"${batPath}"`, { maxBuffer: 1024 * 1024 * 500 }, (error, stdout, stderr) => {
            try { fs.removeSync(concatFilePath); } catch (e) { }
            try { fs.removeSync(filterScriptPath); } catch (e) { }
            try { fs.removeSync(batPath); } catch (e) { }

            if (error) {
                console.error(`❌ 비디오 합성 실패 (Code: ${error.code})`);
                if (stderr) console.error(`[FFmpeg Error Log]\n${stderr.slice(-1000)}`);
                return reject(error);
            }

            if (fs.existsSync(outputPath)) {
                const outputSize = fs.statSync(outputPath).size;
                console.log(`✅ 비디오 완성! (${(outputSize / 1024 / 1024).toFixed(1)}MB) -> ${outputPath}`);
                resolve(outputPath);
            } else {
                reject(new Error(`파일이 생성되지 않았습니다.`));
            }
        });
    });
}

/**
 * 유튜브 쇼츠용 세로형 비디오(9:16, 1080x1920)를 생성합니다.
 * @param {string} audioPath - 원본 오디오 파일 경로
 * @param {string} imagePath - 원본 이미지 파일 경로 (보통 16:9 이미지를 중앙 크롭/스케일링)
 * @param {string} outputPath - 출력 MP4 경로
 * @param {number} maxDuration - 최대 길이 (초 단위, 기본값: 60)
 * @param {string} hookText - 상단에 오버레이할 후킹 문구 (선택 사항)
 */
function createShortsVideo(audioPath, imagePath, outputPath, maxDuration = 60, hookText = "") {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(audioPath)) return reject(new Error(`오디오 파일을 찾을 수 없습니다: ${audioPath}`));
        if (!fs.existsSync(imagePath)) return reject(new Error(`이미지 파일을 찾을 수 없습니다: ${imagePath}`));

        console.log(`\n[쇼츠 생성 엔진 가동] 9:16 세로형 비디오 렌더링 중... (Hook: ${hookText || 'None'})`);
        if (fs.existsSync(outputPath)) fs.removeSync(outputPath);

        const FONT_PATH = 'C:/Windows/Fonts/arial.ttf';
        const finalFontPath = fs.existsSync(FONT_PATH) ? FONT_PATH : 'arial';

        // 텍스트 오버레이 필터 정의 (상단 중앙, 배경 포함)
        let videoFilter = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p';
        if (hookText) {
            const escapedHook = hookText.replace(/'/g, '').replace(/:/g, '\\:');
            videoFilter += `,drawtext=fontfile='${finalFontPath.replace(/\\/g, '/').replace(/:/g, '\\:')}':text='${escapedHook}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=200:box=1:boxcolor=black@0.4:boxborderw=20`;
        }

        const args = [
            '-y',
            '-loop', '1', '-i', imagePath,
            '-i', audioPath,
            '-vf', videoFilter,
            '-c:v', 'libx264', '-tune', 'stillimage',
            '-shortest',
            '-t', maxDuration.toString(),
            outputPath
        ];

        console.log(`  [FFmpeg Shorts CMD] ${ffmpegPath} ${args.join(' ')}`);

        execFile(ffmpegPath, args, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ 쇼츠 합성 중 오류 발생:`, error.message);
                console.error(`[FFmpeg STDERR]`, stderr);
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

        console.log(`  [FFmpeg Loop CMD] ${ffmpegPath} ${args.join(' ')}`);

        execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ 루프 비디오 합성 중 오류 발생:`, error.message);
                console.error(`[FFmpeg STDERR]`, stderr);
                return reject(error);
            }
            console.log(`✅ 1시간 무한루프 비디오 완성: ${outputPath}`);
            resolve(outputPath);
        });
    });
}

module.exports = { createVideo, createSlideshowVideo, createShortsVideo, concatAudioFiles, createLoopVideo, getAudioDuration };
