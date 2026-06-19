const fs = require('fs-extra');
const path = require('path');

const __projectRoot = 'f:\\ProJectHome\\AI MUSIC AGENT OZ';
const candidatesDir = path.join(__projectRoot, 'memory', 'weekly_best_candidates');
const metaPath = path.join(candidatesDir, 'candidates_meta.json');
const musicDir = path.join(__projectRoot, 'music');

async function reconstruct() {
    console.log('🎷 [복구] 주간 메타데이터 지능형 재건 작전 개시...');
    await fs.ensureDir(candidatesDir);
    
    const candidatesMeta = [];
    const subDirs = await fs.readdir(musicDir);

    for (const dirName of subDirs) {
        const themePath = path.join(musicDir, dirName);
        const stats = await fs.stat(themePath);
        
        if (stats.isDirectory()) {
            const files = await fs.readdir(themePath);
            const mp3 = files.find(f => f.endsWith('.mp3'));
            const jpg = files.find(f => f.endsWith('.jpg') || f.endsWith('.png'));
            
            if (mp3 && jpg) {
                // 수정 시간 기준으로 날짜 태그 생성
                const mtime = stats.mtime;
                const dateTag = mtime.toISOString().split('T')[0].replace(/-/g, '');
                
                // 이번 주(최근 7일) 데이터만 필터링 (선택 사항, 여기서는 모든 발견된 테마 허용)
                const targetMp3 = `${dateTag}_${dirName.replace(/\s/g, '_')}_best.mp3`;
                const targetJpg = `${dateTag}_${dirName.replace(/\s/g, '_')}_best.jpg`;
                
                await fs.copy(path.join(themePath, mp3), path.join(candidatesDir, targetMp3));
                await fs.copy(path.join(themePath, jpg), path.join(candidatesDir, targetJpg));
                
                candidatesMeta.push({
                    date: dateTag,
                    theme: dirName,
                    title: `${dirName} - Gold Selection`,
                    audio: targetMp3,
                    image: targetJpg,
                    metadata: {
                        theme: dirName,
                        tracks: [{ title: `${dirName} Best` }]
                    }
                });
                console.log(`✅ [발견] ${dirName} (날짜: ${dateTag})`);
                
                if (candidatesMeta.length >= 7) break; // 7개 찾으면 중단
            }
        }
    }

    if (candidatesMeta.length > 0) {
        await fs.writeJson(metaPath, candidatesMeta, { spaces: 2 });
        console.log(`🎉 [완료] 총 ${candidatesMeta.length}개의 트랙이 결산을 위해 집결되었습니다!`);
    } else {
        console.log('❌ [실패] 복구된 데이터가 없습니다.');
    }
}

reconstruct().catch(console.error);
