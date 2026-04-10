'use strict';

const https = require('https');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ─────────────────────────────────────────────
// 테마별 YouTube 검색 키워드 매핑
// 주의: 아티스트명은 절대 포함하지 않음 (저작권 이슈)
// ─────────────────────────────────────────────
const THEME_SEARCH_KEYWORDS = {
    "OZ CAFE":                 ["jazz cafe study music 2026", "lounge jazz coffee shop bgm"],
    "Nature/ASMR Sanctuary":   ["nature asmr healing music 2026", "forest ambient relaxing sound"],
    "Classical Performance":   ["classical piano relaxing 2026", "orchestral study music"],
    "Euro Synth Night":        ["synthwave night drive 2026", "retrowave music mix"],
    "Spring Blossom Walk":     ["spring acoustic music 2026", "cherry blossom bgm folk"],
    "Lofi Study Room":         ["lofi hip hop study 2026", "chill beats focus music"],
    "Tokyo City Pop":          ["city pop japanese 2026", "tokyo night drive music"],
    "Midnight Chill":          ["downtempo chill music 2026", "midnight relax electronic mix"],
    "Cinematic Orchestral":    ["cinematic orchestral music 2026", "epic soundtrack study mix"],
    "Seoul Rainy Day":         ["korean indie rainy day music", "감성 비오는날 카페음악"],
    "Midnight Solstice Afro":  ["afro house music 2026", "tribal house hypnotic mix"],
    "Aura Brazilian Bounce":   ["brazilian phonk 2026", "funk viral workout music"],
    "Cozy Acoustic Evening":   ["acoustic folk evening music 2026", "cozy guitar chill"],
    "Deep Sleep Therapy":      ["deep sleep music 2026", "sleep therapy ambient binaural"],
    "Neo Soul Groove":         ["neo soul groove music 2026", "smooth r&b chill beats"],
    "Funk Groove Session":     ["jazz funk groove 2026", "electric jazz fusion mix"],
    "Berlin Minimal":          ["minimal techno ambient 2026", "berlin electronic chill"],
    "Winter Christmas Jazz":   ["christmas jazz lounge 2026", "winter cafe jazz bgm"],
    "Autumn Nostalgic Walk":   ["autumn acoustic nostalgic 2026", "fall vibes chill music"]
};

// ─────────────────────────────────────────────
// 유틸: 3개월 전 ISO 날짜
// ─────────────────────────────────────────────
function getThreeMonthsAgo() {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString();
}

// ─────────────────────────────────────────────
// YouTube Search API 호출
// ─────────────────────────────────────────────
function youtubeSearch(query, maxResults = 10) {
    return new Promise((resolve, reject) => {
        if (!YOUTUBE_API_KEY) {
            return reject(new Error('YOUTUBE_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.'));
        }

        const encoded = encodeURIComponent(query);
        const url = [
            'https://www.googleapis.com/youtube/v3/search',
            `?part=snippet`,
            `&q=${encoded}`,
            `&type=video`,
            `&order=viewCount`,
            `&publishedAfter=${getThreeMonthsAgo()}`,
            `&maxResults=${maxResults}`,
            `&key=${YOUTUBE_API_KEY}`
        ].join('');

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        reject(new Error(`YouTube API Error: ${parsed.error.message}`));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// ─────────────────────────────────────────────
// 검색 결과 → score 계산
//   영상 수 (0~10)  → × 5점
//   최근 1개월 영상 존재 → +20점
//   영상 수 8개 이상 (수요 확인) → +15점
// ─────────────────────────────────────────────
function calcScoreFromResults(results) {
    if (!results || !results.items || results.items.length === 0) return 0;

    const itemCount = results.items.length;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const hasRecent = results.items.some(item => {
        const published = new Date(item.snippet?.publishedAt);
        return published > oneMonthAgo;
    });

    let score = itemCount * 5;
    if (hasRecent) score += 20;
    if (itemCount >= 8) score += 15;

    return score;
}

// ─────────────────────────────────────────────
// 메인: 모든 테마의 YouTube 트렌드 score 반환
// ─────────────────────────────────────────────
async function fetchYouTubeTrends() {
    console.log('\n🔍 [YouTube Analyzer] 실시간 트렌드 분석 시작...');
    const trendScores = {};

    for (const [theme, keywords] of Object.entries(THEME_SEARCH_KEYWORDS)) {
        let totalScore = 0;

        for (const keyword of keywords) {
            try {
                console.log(`  📡 Searching: "${keyword}"`);
                const result = await youtubeSearch(keyword);
                totalScore += calcScoreFromResults(result);

                // API 쿼터 보호: 0.5초 딜레이
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.warn(`  ⚠️  Search failed for "${keyword}": ${e.message}`);
            }
        }

        trendScores[theme] = totalScore;
        console.log(`  ✅ [${theme}] YouTube Trend Score: ${totalScore}`);
    }

    console.log('\n📊 [YouTube Analyzer] 분석 완료!');
    return trendScores;
}

module.exports = { fetchYouTubeTrends, THEME_SEARCH_KEYWORDS };
