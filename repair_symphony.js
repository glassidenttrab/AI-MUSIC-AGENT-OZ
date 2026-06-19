'use strict';

// [복구] 생성된 세그먼트들을 사용하여 3분 대곡 완성
require('dotenv').config();
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs-extra');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'test_output');
// 생성된 파일 경로들 (하드코딩)
const TIMESTAMP = '2026-04-20T14-22-24';
const files = [0,1,2,3,4,5].map(i => path.join(OUTPUT_DIR, `seg_${i}_${TIMESTAMP}.mp3`));
const FINAL_AUDIO = path.join(OUTPUT_DIR, `symphony_3min_${TIMESTAMP}.mp3`);
const FINAL_VIDEO = path.join(OUTPUT_DIR, `symphony_3min_final_REPAIR_${TIMESTAMP}.mp4`);
const IMAGE_PATH = path.join(OUTPUT_DIR, `image_repair_${TIMESTAMP}.png`);

async function repair() {
    console.log('🚀 [Repair] 3분 대곡 병합 재시도...');
    
    // 수동 필터 생성
    const cascadeFilter = 
        '[0:a][1:a]acrossfade=d=2.5:c1=tri:c2=tri[a1];' +
        '[a1][2:a]acrossfade=d=2.5:c1=tri:c2=tri[a2];' +
        '[a2][3:a]acrossfade=d=2.5:c1=tri:c2=tri[a3];' +
        '[a3][4:a]acrossfade=d=2.5:c1=tri:c2=tri[a4];' +
        '[a4][5:a]acrossfade=d=2.5:c1=tri:c2=tri[outa]';

    const mergeArgs = ['-y'];
    files.forEach(f => mergeArgs.push('-i', f));
    mergeArgs.push('-filter_complex', cascadeFilter, '-map', '[outa]', '-c:a', 'libmp3lame', '-b:a', '256k', FINAL_AUDIO);

    await new Promise((res, rej) => {
        execFile(ffmpegPath, mergeArgs, (err) => {
            if (err) return rej(err);
            console.log('✅ 오디오 병합 성공');
            res();
        });
    });

    console.log('🎨 이미지 생성 중...');
    const { generateAIImage } = require('./src/core/make_thumb');
    await generateAIImage("16:9 cinematic grand orchestra performing in a heavenly forest, massive scale, detailed instruments, 8k", IMAGE_PATH, false);

    console.log('🎬 최종 영상 합성 중...');
    const videoArgs = [
        '-y', '-loop', '1', '-i', IMAGE_PATH, '-i', FINAL_AUDIO,
        '-filter_complex',
        '[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p[bg];' +
        '[1:a]aformat=channel_layouts=mono,showwaves=s=1200x120:mode=p2p:colors=white@0.6|cyan@0.4:scale=sqrt:n=20[wave_v];' +
        '[bg][wave_v]overlay=x=(W-w)/2:y=H-250[v]',
        '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-shortest', FINAL_VIDEO
    ];

    await new Promise((res, rej) => {
        execFile(ffmpegPath, videoArgs, (err) => {
            if (err) return rej(err);
            console.log(`🎉 [Repair Complete] 최종 파일: ${FINAL_VIDEO}`);
            res();
        });
    });
}

repair().catch(console.error);
