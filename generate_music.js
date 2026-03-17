const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

// fluent-ffmpeg가 사용할 ffmpeg 경로 설정
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Lyria (Google Gemini RealTime API)를 사용하여 음악 클립을 생성하고 MP3로 저장합니다.
 * 모든 출력물은 프로젝트 루트의 'MUSIC' 폴더에 저장됩니다.
 * @param {string} promptText - 음악 생성에 사용할 키워드 또는 프롬프트
 * @param {string} filename - 저장될 파일 이름 (예: "vocal_test.mp3")
 * @param {number} durationSeconds - 생성할 음악의 시간(초)
 */
async function generateMusic(promptText, filename, durationSeconds = 30) {
    const musicDir = path.join(__dirname, 'MUSIC');
    await fs.ensureDir(musicDir); // MUSIC 폴더가 없으면 생성

    const outputPath = path.join(musicDir, filename);

    return new Promise(async (resolve, reject) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("\n❌ [Lyria RealTime] 에러: GEMINI_API_KEY 환경 변수가 설정되어야 합니다.");
            console.error("터미널에서 'set GEMINI_API_KEY=당신의_API_키' 를 먼저 실행해 주세요.");
            return reject(new Error("Missing GEMINI_API_KEY"));
        }

        const client = new GoogleGenAI({ apiKey: apiKey, apiVersion: "v1alpha" });

        // Lyria RealTime 설정값 (공식 사양: 48kHz, 2ch, 16bit)
        const sampleRate = 48000;
        const channels = 2; // stereo
        const bytesPerSample = 2; // 16-bit PCM
        const targetBytes = durationSeconds * sampleRate * channels * bytesPerSample;
        let receivedBytes = 0;

        const tempPcmPath = outputPath.replace('.mp3', '.pcm'); // 임시 처리용 파일 지정

        console.log(`\n[AI Composer Lyria] 음악을 실시간으로 작곡하고 있습니다. "${promptText}" (${durationSeconds}초 분량)`);

        let pcmStream;
        let session;

        try {
            pcmStream = fs.createWriteStream(tempPcmPath);

            session = await client.live.music.connect({
                model: "models/lyria-realtime-exp",
                callbacks: {
                    onmessage: (message) => {
                        if (message.serverContent && message.serverContent.audioChunks) {
                            for (const chunk of message.serverContent.audioChunks) {
                                const audioBuffer = Buffer.from(chunk.data, "base64");
                                pcmStream.write(audioBuffer);
                                receivedBytes += audioBuffer.length;

                                const progress = Math.min((receivedBytes / targetBytes) * 100, 100);
                                if (process.stdout.isTTY && typeof process.stdout.clearLine === 'function') {
                                    process.stdout.clearLine(0);
                                    process.stdout.cursorTo(0);
                                    process.stdout.write(`🎵 Lyria 실시간 생성 중... ${Math.round(progress)}% 완료`);
                                } else {
                                    // if it's running in background or file output
                                }

                                // 설정한 오디오 길이 분량을 모두 받았으면 즉각 세션 강제 종료 (중복 실행 방지)
                                if (receivedBytes >= targetBytes && session) {
                                    const currentSession = session;
                                    session = null; // 중복 이벤트 트리거 방지
                                    currentSession.stop();
                                    pcmStream.end();
                                    console.log(`\n✅ Lyria 원본 소스 작곡 완료.`);

                                    // 2. 받은 pcm 소스를 mp3로 변환 (ffmpeg 이용)
                                    convertPcmToMp3(tempPcmPath, outputPath)
                                        .then(() => resolve(outputPath))
                                        .catch(reject);
                                }
                            }
                        }
                    },
                    onerror: (error) => {
                        console.error("\n[Lyria RealTime Error]:", error);
                        reject(error);
                    },
                    onclose: (event) => {
                        console.log("\n[Lyria RealTime] 웹소켓 연결 종료. 코드:", event?.code, "이유:", event?.reason);
                        if (receivedBytes < targetBytes) {
                            reject(new Error("스트리밍 완료 전 연결 종료됨"));
                        }
                    },
                },
            });

            // 1) 작곡 모드, 템포(BPM) 등 구성 설정
            await session.setMusicGenerationConfig({
                musicGenerationConfig: {
                    bpm: 100
                },
            });

            // 2) 원하는 음악 스타일/프롬프트 입력
            await session.setWeightedPrompts({
                weightedPrompts: [
                    { text: promptText, weight: 1.0 },
                ],
            });

            // 3) 실시간 스트리밍 생성 개시
            await session.play();

        } catch (err) {
            if (pcmStream) pcmStream.end();
            reject(err);
        }
    });
}

function convertPcmToMp3(pcmPath, mp3Path) {
    return new Promise((resolve, reject) => {
        console.log(`[FFmpeg] 16bit PCM 스트림을 MP3 포맷으로 후반 마스터링 중...`);
        ffmpeg()
            .input(pcmPath)
            .inputOptions([
                '-f s16le',       // signed 16-bit little-endian
                '-ar 48000',      // sample rate (Hz) - Lyria 기본 사양
                '-ac 2'           // stereo
            ])
            .audioCodec('libmp3lame')
            .audioBitrate('192k')
            .save(mp3Path)
            .on('end', () => {
                console.log(`✅ 생성된 최종 음악 저장 및 인코딩 마스터링 통과: ${mp3Path}`);
                fs.removeSync(pcmPath); // 임시 파일 청소
                resolve(mp3Path);
            })
            .on('error', (err) => {
                console.error(`❌ 변환 중 오류 발생:`, err.message);
                reject(err);
            });
    });
}

module.exports = { generateMusic };

