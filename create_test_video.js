const { createSlideshowVideo } = require('./make_video');
const path = require('path');
const fs = require('fs-extra');

async function createTestVideo() {
    console.log('====== [AI MUSIC AGENT OZ] 테스트 영상 합성 시작 ======');

    // 1. 소스 경로 설정
    const audioPath = path.join(__dirname, 'music', 'lyrics_test_run_1774541987489.mp3');
    const imagesDir = path.join(__dirname, 'images', 'lyrics');
    const outputPath = path.join(__dirname, 'lyric_test_video.mp4');

    // 2. 이미지 파일 목록 가져오기
    const slideImages = [
        path.join(imagesDir, 'lyric_scene_1.png'),
        path.join(imagesDir, 'lyric_scene_2.png'),
        path.join(imagesDir, 'lyric_scene_3.png')
    ];

    try {
        console.log(`\n[데이터 확인시작]`);
        console.log(`🎵 오디오: ${audioPath}`);
        console.log(`🖼️ 이미지: ${slideImages.length}장`);

        // 3. 비디오 합성 (각 슬라이드 15초씩)
        const result = await createSlideshowVideo(slideImages, audioPath, outputPath, 15);

        console.log(`\n✅ 비디오 합성 성공!`);
        console.log(`📍 출력 파일: ${result}`);

    } catch (error) {
        console.error(`\n❌ 비디오 합성 실패:`, error.message);
    }
}

createTestVideo();
