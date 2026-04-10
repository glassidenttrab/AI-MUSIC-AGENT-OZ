const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
// ffprobe 경로는 보통 ffmpeg과 같은 폴더에 있거나, fluent-ffmpeg이 ffmpegPath를 바탕으로 추측함. 
// 윈도우에서는 ffmpeg.exe와 ffprobe.exe가 보통 같은 패키지에 포함됨.
const path = require('path');

function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration);
        });
    });
}

async function check() {
    const audioPath = path.join(__dirname, 'music', 'lyrics_test_run_1774541987489.mp3');
    const videoPath = path.join(__dirname, 'lyric_test_video.mp4');

    try {
        const audioDuration = await getDuration(audioPath);
        const videoDuration = await getDuration(videoPath);

        console.log(`🎵 오디오 길이: ${audioDuration}초 (${(audioDuration / 60).toFixed(2)}분)`);
        console.log(`🎬 비디오 길이: ${videoDuration}초 (${(videoDuration / 60).toFixed(2)}분)`);
    } catch (e) {
        console.error('오류 발생:', e.message);
    }
}

check();
