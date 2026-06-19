'use strict';

/**
 * [필하모닉 오케스트라 명반] 3분 연속 정통 클래식 대곡 생성 (Philharmonic Masterpiece)
 *
 * 개선 전략:
 * 1. 정통 클래식 선율: 팝 요소를 배제한 '빈/베를린 필하모닉' 스타일의 엄격한 프롬프트 적용
 * 2. 완벽한 연결성: 10초 이상의 긴 크로스페이드를 적용하여 곡의 흐름이 단절 없이 이어지도록 설계
 * 3. 가시적인 사운드웨이브: 불투명도를 높이고 세련된 디자인의 사운드웨이브 시각화 (중앙 배치)
 * 4. 전체 화면: 16:9 비율을 꽉 채우는 프리미엄 시네마틱 비주얼
 */

require('dotenv').config();
const { spawnSync, execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs-extra');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'test_output');
const PYTHON_EXE = 'C:/Users/Ozpix/AppData/Local/Programs/Python/Python313/python.exe';
const PYTHON_SCRIPT = path.join(__dirname, 'src/core/generate_lyria_music.py');

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const FINAL_AUDIO = path.join(OUTPUT_DIR, `philharmonic_3min_${TIMESTAMP}.mp3`);
const FINAL_VIDEO = path.join(OUTPUT_DIR, `philharmonic_final_${TIMESTAMP}.mp4`);
const IMAGE_PATH = path.join(OUTPUT_DIR, `philharmonic_image_${TIMESTAMP}.png`);

// 정통 필하모닉 오케스트라 프롬프트 (기승전결)
const PHILHARMONIC_PROMPTS = [
    "Strictly Classical: Vienna Philharmonic Orchestra, grand symphonic opening, rich triple-meter strings, traditional woodwind echoes, no modern beats, live hall acoustics.",
    "Philharmonic Movement 2: Developing string staccatos and expressive horn calls, majestic classical progression, purely acoustic instruments, no pop elements.",
    "Philharmonic Climax: Full symphonic explosion, powerful brass choir, traditional orchestral percussion (timpani/cymbals), soaring melodic violins, grand classical finale style.",
    "Philharmonic Interlude: Emotional cello solo with gentle oboe accompaniment, romantic era symphonic texture, soft wooden resonance, no electronic sounds.",
    "Philharmonic Grand Finale: Triumphant orchestral return, complex counterpoint, Berlin Philharmonic style majestic ending, rich symphonic density.",
    "Philharmonic Postlude: Fading symphonic strings, resonant concert hall silence, gentle flute exit, final classical resolution."
];

function log(msg) {
    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// ── STEP 1: 정통 클래식 음원 섹션 생성 ──────────
async function generatePhilharmonicSegments() {
    log('🎵 STEP 1: 정통 필하모닉 3분 대곡 섹션 생성 시작...');
    const segments = [];
    
    for (let i = 0; i < PHILHARMONIC_PROMPTS.length; i++) {
        const outPath = path.join(OUTPUT_DIR, `phil_seg_${i}_${TIMESTAMP}.mp3`);
        log(`   [섹션 ${i+1}/6] 생성 중... (${PHILHARMONIC_PROMPTS[i].substring(0, 40)}...)`);
        
        const result = spawnSync(PYTHON_EXE, [PYTHON_SCRIPT, PHILHARMONIC_PROMPTS[i], outPath], {
            encoding: 'utf-8',
            windowsHide: true,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            timeout: 300000,
        });

        if (result.status === 0 && fs.existsSync(outPath)) {
            segments.push(outPath);
        } else {
            throw new Error(`필하모닉 섹션 ${i+1} 생성 실패`);
        }
    }
    return segments;
}

// ── STEP 2: 깊이감 있는 병합 (10초 크로스페이드) ──────────
async function mergePhilharmonic(files) {
    log('✂️  STEP 2: 10초 정밀 크로스페이드를 통한 심포니 연결 중...');

    // 파일별 소요시간(Fade overlap)을 고려한 커스텀 필터 체인
    // [0][1]acrossfade -> [a1][2]acrossfade -> [a2]...
    // 10초 중첩은 곡의 분위기를 완전히 섞어주어 단절감을 없앱니다.
    let filter = `[0:a][1:a]acrossfade=d=10:c1=tri:c2=tri[a1];`;
    for (let i = 1; i < files.length - 1; i++) {
        filter += `[a${i}][${i+1}:a]acrossfade=d=10:c1=tri:c2=tri[a${i+1}];`;
    }
    const lastLabel = `[a${files.length - 1}]`;

    const args = ['-y'];
    files.forEach(f => args.push('-i', f));
    args.push('-filter_complex', filter.replace(/;$/, ''), '-map', lastLabel, '-c:a', 'libmp3lame', '-b:a', '320k', FINAL_AUDIO);

    return new Promise((resolve, reject) => {
        execFile(ffmpegPath, args, (err) => {
            if (err) return reject(err);
            log('✅ 정통 필하모닉 3분 대곡 완성');
            resolve();
        });
    });
}

// ── STEP 3: 최상위 시네마틱 비주얼 생성 ──────────
async function generateMasterImage() {
    log('🎨 STEP 3: 시네마틱 클래식 콘서트홀 비주얼 생성 중...');
    const { generateAIImage } = require('./src/core/make_thumb');
    const prompt = "16:9 cinematic grand concert hall, gold and velvet architecture, Berlin Philharmonic stage, warm dramatic lighting, hyper-realistic, 8k resolution, majestic symphonic atmosphere";
    await generateAIImage(prompt, IMAGE_PATH, false);
}

// ── STEP 4: 프리미엄 영상 합성 (고가시성 사운드웨이브) ──────────
async function createMasterVideo() {
    log('🎬 STEP 4: 프리미엄 필하모닉 영상 합성 중 (사운드웨이브 강화)...');
    
    const args = [
        '-y', '-loop', '1', '-i', IMAGE_PATH, '-i', FINAL_AUDIO,
        '-filter_complex',
        // 1. 전체 화면 꽉 채우기
        '[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p[vbg];' +
        // 2. 사운드웨이브 가시성 극대화 (화이트 선명하게, 중앙 하단 배치)
        '[1:a]aformat=channel_layouts=mono,showwaves=s=1400x160:mode=cline:colors=white@0.9:scale=sqrt:n=10[wave];' +
        '[vbg][wave]overlay=x=(W-w)/2:y=H-300[vout]',
        '-map', '[vout]', '-map', '1:a',
        '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
        '-c:a', 'aac', '-b:a', '256k',
        '-shortest', '-t', '180', // 정확히 3분 컷
        '-movflags', '+faststart',
        FINAL_VIDEO
    ];

    return new Promise((resolve, reject) => {
        execFile(ffmpegPath, args, { timeout: 600000 }, (err) => {
            if (err) return reject(err);
            log(`✅ [PHILHARMONIC MASTER] 완성! -> ${FINAL_VIDEO}`);
            resolve();
        });
    });
}

async function main() {
    console.log('\n========================================');
    console.log('   🏛️  PHILHARMONIC ORCHESTRA MASTER');
    console.log('   (Strict Classical / 10s Seamless Merge)');
    console.log('========================================\n');

    await fs.ensureDir(OUTPUT_DIR);
    try {
        const segments = await generatePhilharmonicSegments();
        await mergePhilharmonic(segments);
        await generateMasterImage();
        await createMasterVideo();
        console.log(`\n🏆 대표님, 정통 필하모닉 3분 대곡이 완성되었습니다: ${FINAL_VIDEO}`);
    } catch (e) {
        console.error('❌ 실패:', e.message);
    } finally {
        // 하단에 중간 파일 정리 (필요시 주석 처리)
        // [IMAGE_PATH, FINAL_AUDIO].forEach(f => { if(fs.existsSync(f)) try { fs.removeSync(f); } catch(e){} });
    }
}

main();
