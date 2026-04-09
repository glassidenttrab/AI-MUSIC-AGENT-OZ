/**
 * [AI MUSIC AGENT OZ] 통합 퍼블리싱 러너
 * 콘텐츠 생성(Option A)과 유튜브 업로드 및 예약(Option B)을 한 번에 실행합니다.
 */
const { generateHybridContent } = require('./generate_1hour_loop');
const { authorize, uploadVideo } = require('./youtube_upload');
const path = require('path');
const fs = require('fs-extra');

async function runPublishTask(themeName, publishDate) {
    console.log(`\n======================================================`);
    console.log(`🚀 [OZ PUBLISH RUNNER] 통합 작업 시작`);
    console.log(`📅 예약 일시: ${publishDate}`);
    console.log(`🎭 선정 테마: ${themeName}`);
    console.log(`======================================================\n`);

    try {
        // 1. 유튜브 인증 클라이언트 준비
        const auth = await authorize();
        console.log('✅ 유튜브 API 인증 완료');

        // 2. 콘텐츠 생성 (음악, 이미지, 비디오, 쇼츠)
        // targetMinutes=60 으로 설정하여 1시간 루프 생성
        const result = await generateHybridContent(themeName, false, 60);
        console.log('✅ 콘텐츠 생성 완료 (Option A)');

        // 3. 메인 루프 비디오 업로드 및 예약
        console.log('\n📺 [메인 영상] 업로드 시작...');
        const loopVideoId = await uploadVideo(
            auth,
            result.loop.path,
            result.thumbnail,
            result.loop.title,
            result.loop.description,
            result.loop.tags,
            publishDate // 예약 시간 적용
        );

        if (loopVideoId) {
            console.log(`✅ 메인 영상 업로드 성공! ID: ${loopVideoId}`);
        }

        // 4. 쇼츠 영상 업로드 및 예약 (메인보다 10분 앞서 예약)
        const shortsDate = new Date(new Date(publishDate).getTime() - 10 * 60 * 1000).toISOString();
        console.log('\n📱 [쇼츠 영상] 업로드 시작...');
        const shortsVideoId = await uploadVideo(
            auth,
            result.shorts.path,
            null, // 쇼츠는 썸네일 자동 생성 권장
            result.shorts.title,
            result.shorts.description,
            result.shorts.tags,
            shortsDate
        );

        if (shortsVideoId) {
            console.log(`✅ 쇼츠 영상 업로드 성공! ID: ${shortsVideoId}`);
        }

        console.log(`\n======================================================`);
        console.log(`🎉 [미션 완료] 모든 콘텐츠가 유튜브에 예약되었습니다.`);
        console.log(`======================================================\n`);

    } catch (error) {
        console.error(`\n❌ 퍼블리싱 작업 중 치명적 오류 발생:`, error);
    }
}

// 오늘 오후 9시(KST)로 기본 예약 시간 설정
const defaultPublishTime = new Date();
defaultPublishTime.setHours(21, 0, 0, 0);

if (require.main === module) {
    const theme = process.argv[2] || "Rainy Urban Sanctuary";
    runPublishTask(theme, defaultPublishTime.toISOString());
}
