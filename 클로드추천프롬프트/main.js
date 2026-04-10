'use strict';

require('dotenv').config();
const promptEngineer = require('./promptEngineer');

// ─────────────────────────────────────────────
// 실행 모드 파싱
// node main.js [mode] [options]
//   mode: generate | record | status
//   예) node main.js generate --rank 0 --count 3
//   예) node main.js record --theme "OZ CAFE" --genre "Cool Jazz" --views 1500
//   예) node main.js status
// ─────────────────────────────────────────────
const args = process.argv.slice(2);
const mode = args[0] || 'generate';

function getArg(flag, defaultVal = null) {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : defaultVal;
}

// ── generate 모드 ────────────────────────────
async function runGenerate() {
    const rank  = parseInt(getArg('--rank', '0'), 10);
    const count = parseInt(getArg('--count', '1'), 10);
    const forceTheme = getArg('--theme', null);

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║         OZ Music Engine — Generate       ║');
    console.log('╚══════════════════════════════════════════╝');

    // 테마 선택 (YouTube 트렌드 반영)
    const selectedTheme = forceTheme || await promptEngineer.selectOptimalTheme(rank);

    console.log(`\n🎵 [Generator] 테마: ${selectedTheme} | 생성 수: ${count}`);
    console.log('─'.repeat(46));

    for (let i = 0; i < count; i++) {
        const result = promptEngineer.generateStructuredPrompt(i, false, selectedTheme);

        console.log(`\n【Track ${i + 1}/${count}】`);
        console.log(`\n📌 Title:\n   ${result.storytellingTitle}`);
        console.log(`\n🎬 Lyria 3 Prompt:\n   ${result.fullPrompt}`);

        if (result.lyrics) {
            console.log(`\n📝 Lyrics:\n${result.lyrics}`);
        }

        if (result.thumbnailPrompt) {
            console.log(`\n🖼️  Thumbnail Prompt:\n   ${result.thumbnailPrompt}`);
        }

        console.log(`\n📱 Shorts Hook:\n   ${result.shortsHook}`);
        console.log(`\n💬 Engagement:\n   ${result.engagementQuestion}`);
        console.log(`\n🏷️  SEO Tags:\n   ${result.seoTags.join(', ')}`);
        console.log('\n' + '═'.repeat(46));
    }
}

// ── record 모드 ──────────────────────────────
async function runRecord() {
    const theme    = getArg('--theme');
    const genre    = getArg('--genre');
    const views    = parseInt(getArg('--views', '0'), 10);

    if (!theme || !genre) {
        console.error('❌ Usage: node main.js record --theme "OZ CAFE" --genre "Cool Jazz" --views 1500');
        process.exit(1);
    }

    promptEngineer.recordSuccess(theme, genre, views);
    console.log(`✅ 기록 완료: [${theme}] / ${genre} → ${views} views`);
}

// ── status 모드 ──────────────────────────────
async function runStatus() {
    const lessons = require('./memory/lessons_learned.json');

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║         OZ Memory Status                 ║');
    console.log('╚══════════════════════════════════════════╝');

    const lastAnalyzed = lessons.last_analyzed
        ? `${((Date.now() - new Date(lessons.last_analyzed)) / (1000 * 60 * 60 * 24)).toFixed(1)}일 전`
        : '없음';

    console.log(`\n📅 YouTube 트렌드 마지막 분석: ${lastAnalyzed}`);
    console.log(`✅ 성공 장르: ${(lessons.successful_genres || []).join(', ') || '없음'}`);
    console.log(`⚠️  기술 이슈: ${(lessons.technical_issues || []).join(', ') || '없음'}`);
    console.log(`📈 성과 기록 수: ${(lessons.performance_history || []).length}건`);

    if (lessons.last_youtube_trends) {
        console.log('\n🔍 YouTube Trend Scores (캐시):');
        const sorted = Object.entries(lessons.last_youtube_trends).sort((a, b) => b[1] - a[1]);
        sorted.forEach(([theme, score]) => {
            const bar = '█'.repeat(Math.min(Math.floor(score / 5), 20));
            console.log(`  ${theme.padEnd(28)}: ${String(score).padStart(3)}점 ${bar}`);
        });
    }
}

// ── 진입점 ───────────────────────────────────
(async () => {
    try {
        if      (mode === 'generate') await runGenerate();
        else if (mode === 'record')   await runRecord();
        else if (mode === 'status')   await runStatus();
        else {
            console.error(`❌ 알 수 없는 모드: ${mode}`);
            console.log('사용법: node main.js [generate|record|status] [options]');
            process.exit(1);
        }
    } catch (e) {
        console.error('\n❌ [Fatal Error]', e.message);
        process.exit(1);
    }
})();
