const { authorize, getOrCreatePlaylist } = require('../youtube_upload');
const path = require('path');
const fs = require('fs-extra');

async function main() {
    try {
        console.log('--- [OZ] 유튜브 신규 재생목록 생성 작업 시작 ---');
        const auth = await authorize();

        const playlists = [
            {
                title: '[OZ] | Cafe & Study | - Cozy Lofi House & Jazz 🎧',
                description: '카페, 집중, 학습에 최적화된 차분하고 따뜻한 무드의 AI 생성 음악 모음입니다.'
            },
            {
                title: '[OZ] | Gym & Workout | - High-Energy Phonk & Bass House 🔥',
                description: '고강도 운동, 동기 부여, 한계 돌파를 위한 에너제틱한 비트의 AI 생성 음악 모음입니다.'
            },
            {
                title: '[OZ] | Lounge & Bar | - Sophisticated Deep House & Chill 🍸',
                description: '레스토랑, 라운지, 세련된 공간을 위한 그루비하고 세련된 AI 생성 음악 모음입니다.'
            }
        ];

        const results = [];
        for (const p of playlists) {
            console.log(`\n작업 중: ${p.title}`);
            const playlistId = await getOrCreatePlaylist(auth, p.title);
            if (playlistId) {
                console.log(`✅ 생성 완료/확인됨. ID: ${playlistId}`);
                results.push({ title: p.title, id: playlistId });
            } else {
                console.log(`❌ 생성 실패: ${p.title}`);
            }
        }

        const fs = require('fs-extra');
        await fs.writeJson(path.join(__dirname, 'playlists_ids.json'), results, { spaces: 4 });
        console.log('\n--- 모든 작업이 완료되었습니다. 결과가 playlists_ids.json에 저장되었습니다. ---');
    } catch (error) {
        console.error('❌ 실행 중 치명적 오류 발생:', error);
    }
}

main();
