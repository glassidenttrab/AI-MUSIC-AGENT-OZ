const path = require('path');
const fs = require('fs-extra');

/**
 * OZ RETROFIT UTILITY
 * 기존 프로젝트 폴더들을 분석하여 metadata.json을 자동 생성합니다.
 */
async function retrofit() {
    const loopsDir = path.join(__dirname, 'loops');
    const folders = await fs.readdir(loopsDir);
    let count = 0;

    console.log(`\n🔎 [OZ Retrofit] Scan loops/ folder...`);

    for (const folder of folders) {
        const fullPath = path.join(loopsDir, folder);
        const metaPath = path.join(fullPath, 'metadata.json');

        if (fs.existsSync(metaPath)) continue; 

        // 파일명에서 테마 추측 (예: Cyberpunk_Deep_Loop_1Hour_Loop.mp4)
        const files = await fs.readdir(fullPath);
        const videoFile = files.find(f => f.endsWith('.mp4'));

        if (videoFile) {
            const guessedTheme = videoFile.replace(/_1Hour_Loop.mp4|_Compilation.mp4/i, '').replace(/_/g, ' ');
            const timestamp = folder.match(/\d{10,}/) ? new Date(parseInt(folder.match(/\d{10,}/)[0])).toISOString() : new Date().toISOString();

            const metadata = {
                runId: folder,
                theme: guessedTheme,
                genre: "Legacy/Unknown", // 정확한 장르는 알 수 없지만 이름으로 유추 가능성
                mood: "Mixed",
                timestamp: timestamp,
                retrofit: true
            };

            await fs.writeJson(metaPath, metadata, { spaces: 4 });
            console.log(`✅ Retrofitted: ${folder} -> ${guessedTheme}`);
            count++;
        }
    }

    console.log(`\n🎉 Retrofit 완료! 총 ${count}개의 프로젝트 정보가 복구되었습니다.`);
}

if (require.main === module) {
    retrofit().catch(console.error);
}

module.exports = { retrofit };
