'use strict';

/**
 * [V4 전략 준수] 필하모닉 오케스트라 3분 연속 정통 연주곡 제작 (Ultra-Seamless Masterpiece)
 *
 * 수정 사항:
 * 1. 드럼/비트 완전 제거: 프롬프트에 'NO DRUMS, NO PERCUSSION'을 강력히 명시
 * 2. 부자연스러운 연결 해결: 섹션 간 중첩 시간을 15초(초장거리 크로스페이드)로 늘려 이질감 0% 도전
 * 3. 사운드웨이브 가시성 확보: 1920x1080 전체를 활용하는 고해상도 웨이브 비주얼 라이저 적용
 * 4. 정통 클래식 편곡: 현대적 요소를 배제한 벨 에포크 시대의 풍부한 심포니 오케스트라 사운드
 */

require('dotenv').config();
const { spawnSync, execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs-extra');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'test_output/masterpiece');
const PYTHON_EXE = 'C:/Users/Ozpix/AppData/Local/Programs/Python/Python313/python.exe';
const PYTHON_SCRIPT = path.join(__dirname, 'src/core/generate_lyria_music.py');

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const FINAL_AUDIO = path.join(OUTPUT_DIR, `philharmonic_symphony_${TIMESTAMP}.mp3`);
const FINAL_VIDEO = path.join(OUTPUT_DIR, `philharmonic_v4_final_${TIMESTAMP}.mp4`);
const IMAGE_PATH = path.join(OUTPUT_DIR, `full_concert_hall_${TIMESTAMP}.png`);

// 정통 클래식 악기 전용 프롬프트 (드럼/비트 절대 금지 가이드 포함)
const PHILHARMONIC_STRATEGY = [
    { name: "Adagio", prompt: "Acoustic Classical: Berlin Philharmonic Orchestra, Adagio movement, deep cello resonance, weeping violins, ABSOLUTELY NO DRUMS, NO PERCUSSION." },
    { name: "Andante", prompt: "Acoustic Classical: Full symphony orchestra, woodwind ensemble, rich wooden textures, NO DRUMS, NO BEATS." },
    { name: "Allegro", prompt: "Acoustic Classical: Grand philharmonic symphony, soaring orchestral strings, powerful brass section, grand resonance, NO DRUMS, NO BEATS." },
    { name: "Crescendo", prompt: "Acoustic Classical: Epic symphonic crescendo with full string section, majestic concert hall echo, NO PERCUSSION, NO DRUMS." },
    { name: "Serenade", prompt: "Acoustic Classical: Romantic era philharmonic strings, lush harmonic movement, ABSOLUTELY NO BEATS OR DRUM KICKS." },
    { name: "Intermezzo", prompt: "Acoustic Classical: Traditional symphonic intermezzo, soft strings and harp, NO DRUMS, NO PERCUSSION, classical only." },
    { name: "Nocturne", prompt: "Acoustic Classical: Slower symphonic movement, midnight concert hall vibe, expressive solo cello, NO DRUMS, NO BEATS." },
    { name: "Rhapsody", prompt: "Acoustic Classical: Fluid symphonic rhapsody, grandiose orchestration, purely acoustic, NO PERCUSSION." },
    { name: "Majesty", prompt: "Acoustic Classical: Grand Philharmonic Majesty, final melodic surge, ABSOLUTELY NO MODERN ELEMENTS." },
    { name: "Finale", prompt: "Acoustic Classical: Triumphant orchestral finale, majestic symphonic resolution, NO DRUMS, NO BEATS." }
];

function log(msg) {
    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// ── STEP 1: 정통 클래식 섹션 생성 ──────────
async function generateSections() {
    log('🎵 [1/4] 팝 요소를 배제한 정통 필하모닉 섹션 생성 시작...');
    const paths = [];

    for (let i = 0; i < PHILHARMONIC_STRATEGY.length; i++) {
        const seg = PHILHARMONIC_STRATEGY[i];
        const outPath = path.join(OUTPUT_DIR, `phil_v4_${i}_${TIMESTAMP}.mp3`);
        log(`   🏃 섹션 ${i+1}/${PHILHARMONIC_STRATEGY.length} (${seg.name}) 제작 중...`);
        
        const result = spawnSync(PYTHON_EXE, [PYTHON_SCRIPT, seg.prompt, outPath], {
            encoding: 'utf-8', windowsHide: true,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            timeout: 300000,
        });

        if (result.status === 0 && fs.existsSync(outPath)) {
            paths.push(outPath);
        } else {
            throw new Error(`섹션 ${i+1} 생성 실패: ${result.stderr}`);
        }
    }
    return paths;
}

// ── STEP 2: 초장거리 15초 크로스페이드 병합 (끊김 현상 완벽 제거) ──────────
async function mergeSeamlessly(files) {
    log('✂️  [2/4] 15초 초장거리 크로스페이드 병합 중 (이질감 0% 도전)...');

    // [0][1]acrossfade=d=15 -> [a1][2]acrossfade=d=15 -> [a2]...
    let filter = `[0:a][1:a]acrossfade=d=15:c1=tri:c2=tri[a1];`;
    for (let i = 1; i < files.length - 1; i++) {
        filter += `[a${i}][${i+1}:a]acrossfade=d=15:c1=tri:c2=tri[a${i+1}];`;
    }
    const lastLabel = `[a${files.length - 1}]`;

    const args = ['-y'];
    files.forEach(f => args.push('-i', f));
    args.push('-filter_complex', filter.replace(/;$/, ''), '-map', lastLabel, '-c:a', 'libmp3lame', '-b:a', '320k', FINAL_AUDIO);

    return new Promise((resolve, reject) => {
        execFile(ffmpegPath, args, (err) => {
            if (err) return reject(err);
            log('✅ 연결성이 극대화된 3분 정통 대곡 완성');
            resolve();
        });
    });
}

// ── STEP 3: 콘서트홀 비주얼 ──────────────────
async function generateMasterVisual() {
    log('🎨 [3/4] 전체 화면 프리미엄 시각화 이미지 생성 중...');
    const { generateAIImage } = require('./src/core/make_thumb');
    await generateAIImage("16:9 cinematic grand Philharmonic concert stage, majestic lighting, rows of classical instruments, opulent gold architecture, 8k, masterpiece", IMAGE_PATH, false);
}

// ── STEP 4: 사운드웨이브 가시성 강화 영상 ──────────
async function createFinalVideo() {
    log('🎬 [4/4] 사운드웨이브 시각화 강화 및 최종 합성 (전체 화면)...');

    const args = [
        '-y', '-loop', '1', '-i', IMAGE_PATH, '-i', FINAL_AUDIO,
        '-filter_complex',
        '[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p[bg];' +
        // 진동이 눈에 띄도록 세로 방향으로 넓게 퍼지는 웨이브 (흰색 90% 불투명도)
        '[1:a]aformat=channel_layouts=mono,showwaves=s=1920x200:mode=p2p:colors=white@0.9:scale=sqrt:n=10[wave];' +
        '[bg][wave]overlay=x=0:y=H-300[vout]',
        '-map', '[vout]', '-map', '1:a',
        '-c:v', 'libx264', '-crf', '17', '-preset', 'medium',
        '-c:a', 'aac', '-b:a', '256k',
        '-shortest', '-t', '180',
        '-movflags', '+faststart',
        FINAL_VIDEO
    ];

    return new Promise((resolve, reject) => {
        execFile(ffmpegPath, args, { timeout: 600000 }, (err) => {
            if (err) return reject(err);
            log(`🎉 [COMPLETED] 필하모닉 마스터피스 완성: ${FINAL_VIDEO}`);
            resolve();
        });
    });
}

async function main() {
    await fs.ensureDir(OUTPUT_DIR);
    try {
        const files = await generateSections();
        await mergeSeamlessly(files);
        await generateMasterVisual();
        await createFinalVideo();
    } catch (e) {
        console.error('❌ 최종 복구 실패:', e.message);
    }
}

main();
