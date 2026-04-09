const path = require('path');
const fs = require('fs-extra');
const ffmpegPath = require('ffmpeg-static');

// Helper to get duration using a simple probe (using the local ffmpeg)
const { execSync } = require('child_process');
function getDuration(file) {
    try {
        const output = execSync(`"${ffmpegPath}" -i "${file}" 2>&1`).toString();
        const match = output.match(/Duration: (\d+):(\d+):(\d+.\d+)/);
        if (match) {
            return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
        }
    } catch (e) {}
    return 180;
}

async function prepare() {
    const outputDir = path.join(__dirname, 'loops', 'loop_Rainy_Day_Open-air_Cafe_inst');
    const masterAudioPath = path.join(outputDir, 'master_audio.mp3');
    const outputPath = path.join(outputDir, 'Rainy_Day_Open-air_Cafe_Compilation_v2.mp4');
    const backgroundImages = [
        path.join(outputDir, 'background_0.png'),
        path.join(outputDir, 'background_1.png'),
        path.join(outputDir, 'background_2.png')
    ];
    
    // 1. Concat File
    const concatPath = path.join(outputDir, '_slides.txt');
    let totalDuration = 0;
    const tracklist = [];
    for (let i = 0; i < 10; i++) {
        const trackPath = path.join(outputDir, `track_${i}.mp3`);
        if (fs.existsSync(trackPath)) {
            const d = getDuration(trackPath);
            tracklist.push({ title: `[OZ] Rainy Day Cafe Jazz - Pt ${i+1}`, start: totalDuration, duration: d });
            totalDuration += d;
        }
    }
    
    const slideDuration = totalDuration / backgroundImages.length;
    let concatContent = '';
    backgroundImages.forEach(img => {
        concatContent += `file '${img.replace(/\\/g, '/')}'\n`;
        concatContent += `duration ${slideDuration}\n`;
    });
    fs.writeFileSync(concatPath, concatContent, 'utf8');
    
    // 2. Filter Script
    const filterPath = path.join(outputDir, '_filters.filter');
    let textFilters = '';
    tracklist.forEach(t => {
        textFilters += `,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${t.title.replace(/:/g, '\\:')}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=80:enable='between(t,${t.start},${t.start+t.duration})':shadowcolor=black@0.5:shadowx=2:shadowy=2`;
    });
    const filterContent = `[0:v]scale=1920:1080,setsar=1${textFilters}[out]`;
    fs.writeFileSync(filterPath, filterContent, 'utf8');
    
    // 3. PS1 Script
    const ps1Path = path.join(__dirname, 'render_loop.ps1');
    const cmd = `& "${ffmpegPath}" -y -f concat -safe 0 -i "${concatPath}" -i "${masterAudioPath}" -filter_complex_script "${filterPath}" -map "[out]" -map 1:a -r 15 -c:v libx264 -crf 30 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart "${outputPath}"`;
    fs.writeFileSync(ps1Path, cmd, 'utf8');
    
    console.log(`✅ Prepared! Run: powershell -File render_loop.ps1`);
}

prepare();
