const ffmpegPath = require('ffmpeg-static');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

async function compressVideo() {
    console.log(`\n============== [OZ VIDEO OPTIMIZER] ==============`);
    
    const runId = "loop_OZ_CAFE_inst";
    const baseDir = path.join(__dirname, '../../loops', runId);
    const inputPath = path.join(baseDir, "_Instrumental___OZ____Cafe___Study___-_Cozy_1960s_Slow_Jazz_Ballad____Compilation.mp4");
    const outputPath = path.join(baseDir, "OZ_CAFE_Session__1__Inst.__Optimized.mp4");

    if (!fs.existsSync(inputPath)) {
        console.error(`❌ 원본 파일을 찾을 수 없습니다: ${inputPath}`);
        return;
    }

    console.log(`🎬 원본 파일: ${inputPath} (${(fs.statSync(inputPath).size / 1024 / 1024 / 1024).toFixed(2)} GB)`);
    console.log(`⚙️ 최적화 전략: CRF 45, FPS 5, Audio 128k (목표 500MB 미만)`);

    if (fs.existsSync(outputPath)) fs.removeSync(outputPath);

    // [전략] 정지 화상 기반 루프이므로 비트레이트를 극도로 낮춰도 시각적 영향이 적음
    const args = [
        '-y',
        '-i', inputPath,
        '-r', '5',                // 프레임 레이트 5fps로 낮춤
        '-c:v', 'libx265', 
        '-crf', '45',            // 압축 강도 강화 (기존 35 -> 45)
        '-preset', 'faster',     // 빠른 인코딩
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', 
        '-b:a', '128k',          // 오디오 비트레이트 소폭 하향
        '-movflags', '+faststart',
        outputPath
    ];

    console.log(`🚀 압축 시작... (시간이 다소 소요될 수 있습니다)`);

    const child = execFile(ffmpegPath, args, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ 압축 실패:`, error.message);
            return;
        }
        
        const afterSize = fs.statSync(outputPath).size / 1024 / 1024;
        console.log(`\n✅ 압축 완료!`);
        console.log(`📊 최종 용량: ${afterSize.toFixed(1)} MB`);
        console.log(`🔗 저장 위치: ${outputPath}`);
    });

    // 진행 상황 모니터링 (선택 사항)
    child.stderr.on('data', (data) => {
        if (data.includes('frame=')) {
            process.stdout.write(`\r${data.split('\n')[0].trim()}`);
        }
    });
}

compressVideo().catch(console.error);
