const { authorize, uploadVideo } = require('../src/core/youtube_upload');
const fs = require('fs-extra');
const path = require('path');

async function uploadSleep() {
    console.log('🎷 [업로드] Deep Sleep Therapy 누락분 업로드 개시...');
    const oauth2Client = await authorize();

    const videoPathLong = 'f:\\ProJectHome\\AI MUSIC AGENT OZ\\videos\\long_1775991665798.mp4';
    const videoPathShorts = 'f:\\ProJectHome\\AI MUSIC AGENT OZ\\videos\\shorts_1775991665798.mp4';
    const coverPath = 'f:\\ProJectHome\\AI MUSIC AGENT OZ\\images\\temp_bg_1775991665798.png';
    
    // 1. Shorts 업로드
    console.log('📤 [Shorts] 업로드 중...');
    // signature: (auth, videoFilePath, coverFilePath, title, description, tags, publishAt, options)
    const shortsVideoId = await uploadVideo(
        oauth2Client, 
        videoPathShorts, 
        coverPath, 
        'Deep Sleep Therapy | 1-Min Relaxation #Shorts #Sleep', 
        'Instant anxiety relief and deep sleep therapy music.',
        ['Sleep', 'Meditation', 'Shorts'],
        null,
        { isShorts: true }
    );
    console.log(`✅ [Shorts] 업로드 완료: https://youtu.be/${shortsVideoId}`);

    // 2. Longform 업로드
    console.log('📤 [Longform] 업로드 중...');
    const loopVideoId = await uploadVideo(
        oauth2Client, 
        videoPathLong, 
        coverPath, 
        '1-Hour Deep Sleep Therapy | Delta Waves for Anxiety Relief', 
        'Experience deep, restorative sleep with this 1-hour immersive audio loop.',
        ['Deep Sleep', 'Delta Waves', 'Healing Music'],
        null,
        {}
    );
    console.log(`✅ [Longform] 업로드 완료: https://youtu.be/${loopVideoId}`);
    
    // History 기록
    const historyPath = 'f:\\ProJectHome\\AI MUSIC AGENT OZ\\memory\\upload_history.json';
    const history = await fs.readJson(historyPath);
    history.push({
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        video_id: loopVideoId,
        type: 'Longform',
        title: 'Deep Sleep Therapy',
        status: 'published'
    });
    await fs.writeJson(historyPath, history, { spaces: 2 });
    console.log('📝 [기록] 업로드 이력이 저장되었습니다.');
}

uploadSleep().catch(console.error);
