'use strict';

const https = require('https');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * YouTube search keyword mapping by theme
 * Composed focusing on genre and mood without artist names (to avoid copyright issues)
 */
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
    "Seoul Rainy Day":         ["korean indie rainy day music", "emotional rainy day cafe music"],
    "Midnight Solstice Afro":  ["afro house music 2026", "tribal house hypnotic mix"],
    "Aura Brazilian Bounce":   ["brazilian phonk 2026", "funk viral workout music"],
    "Cozy Acoustic Evening":   ["acoustic folk evening music 2026", "cozy guitar chill"],
    "Deep Sleep Therapy":      ["deep sleep music 2026", "sleep therapy ambient binaural"],
    "Neo Soul Groove":         ["neo soul groove music 2026", "smooth r&b chill beats"],
    "Funk Groove Session":     ["jazz funk groove 2026", "electric jazz fusion mix"],
    "Berlin Minimal":          ["minimal techno ambient 2026", "berlin electronic chill"],
    "Winter Christmas Jazz":   ["christmas jazz lounge 2026", "winter cafe jazz bgm"],
    "Autumn Nostalgic Walk":   ["autumn acoustic nostalgic 2026", "fall vibes chill music"],
    "Biophilic Cyberpunk Sanctuary": ["cyberpunk rain garden asmr", "biophilic lofi 2026", "futuristic interior garden sounds"]
};

/**
 * 3개월 전 ISO 날짜 반환
 */
function getThreeMonthsAgo() {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString();
}

/**
 * YouTube Search API 호출
 */
function youtubeSearch(query, maxResults = 10) {
    return new Promise((resolve, reject) => {
        if (!YOUTUBE_API_KEY) {
            console.warn('⚠️  YOUTUBE_API_KEY가 설정되지 않았습니다. 기본 점수를 사용합니다.');
            return resolve({ items: [] });
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

/**
 * 검색 결과 점수화
 * - 결과 수에 비례 (최대 50점)
 * - 최근 1개월 영상 존재 시 가산점 (+20점)
 * - 충분한 시장 형성 시 가산점 (+15점)
 */
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

const fs = require('fs-extra');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '../../memory/trend_cache.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간 (밀리초)

const TREND_CACHE_PATH = path.join(__dirname, '../../memory/market_trends.json');
const TREND_EXPIRY = 7 * 24 * 60 * 60 * 1000; // AI 분석 데이터는 1주일간 유효

/**
 * 실시간 트렌드 분석 메인 함수 (AI Intelligence + YouTube API Hybrid)
 */
async function fetchYouTubeTrends() {
    console.log('\n🔍 [YouTube Analyzer] 지능형 트렌드 분석 시작...');

    // 1. [Intelligence Layer] NotebookLM 기반 시장 조사 데이터 확인
    if (fs.existsSync(TREND_CACHE_PATH)) {
        try {
            const aiTrends = fs.readJsonSync(TREND_CACHE_PATH);
            const now = Date.now();
            const aiTime = new Date(aiTrends.timestamp).getTime();

            if (now - aiTime < TREND_EXPIRY) {
                console.log(`✅ [Strategy Hit] 하이브리드(트렌드+스테디) 시장 조사 데이터를 발견했습니다.`);
                console.log('🚀 최신 유행과 검증된 클래식을 조화시킨 복합 제작 전략을 가동합니다.');
                
                const trendScores = {};
                
                // 1. 최신 트렌드 반영 (2026 Trends)
                if (aiTrends.top_trends_2026) {
                    aiTrends.top_trends_2026.forEach(t => {
                        let mappedKey = t.theme;
                        if (t.theme.includes("Sleep")) mappedKey = "Deep Sleep Therapy";
                        else if (t.theme.includes("Café")) mappedKey = "OZ CAFE";
                        else if (t.theme.includes("Nature")) mappedKey = "Nature/ASMR Sanctuary";
                        else if (t.theme.includes("Visual Triggers")) mappedKey = "Lofi Study Room";
                        else if (t.theme.includes("Cyberpunk") || t.theme.includes("Biophilic")) mappedKey = "Biophilic Cyberpunk Sanctuary";
                        trendScores[mappedKey] = (trendScores[mappedKey] || 0) + t.score;
                    });
                }

                // 2. 스테디셀러 반영 (Steady Sellers)
                if (aiTrends.steady_sellers) {
                    aiTrends.steady_sellers.forEach(s => {
                        let mappedKey = s.theme;
                        if (s.theme.includes("Deep Sleep")) mappedKey = "Deep Sleep Therapy";
                        else if (s.theme.includes("Midnight Drive")) mappedKey = "Midnight Chill";
                        else if (s.theme.includes("Bossa Nova")) mappedKey = "OZ CAFE";
                        
                        // 스테디셀러는 기본 점수에 가산점을 더해 안정성 확보
                        trendScores[mappedKey] = (trendScores[mappedKey] || 0) + (s.score * 0.8);
                    });
                }
                
                return trendScores;
            }
        } catch (e) {
            console.warn('⚠️  AI 트렌드 데이터 읽기 실패, 기본 분석 모드로 전환합니다.');
        }
    }

    // 2. [Fallback Layer] 기존 24시간 로컬 캐시 체크
    if (fs.existsSync(CACHE_PATH)) {
        try {
            const cache = fs.readJsonSync(CACHE_PATH);
            const now = Date.now();
            const cacheTime = new Date(cache.timestamp).getTime();

            if (now - cacheTime < CACHE_DURATION) {
                console.log(`✅ [Cache Hit] 24시간 이내의 API 분석 데이터를 발견했습니다. (생성일: ${cache.timestamp})`);
                return cache.data;
            }
        } catch (e) {
            console.warn('⚠️  로컬 캐시 읽기 실패, YouTube API 분석을 시작합니다.');
        }
    }

    console.log('📡 [API Mode] 유효한 전략 데이터가 없습니다. YouTube API를 통해 직접 분석을 시도합니다...');
    const trendScores = {};

    for (const [theme, keywords] of Object.entries(THEME_SEARCH_KEYWORDS)) {
        let totalScore = 0;
        let quotaExceeded = false;

        for (const keyword of keywords) {
            try {
                const result = await youtubeSearch(keyword);
                totalScore += calcScoreFromResults(result);
                await new Promise(r => setTimeout(r, 100)); // Rate limit 보호
            } catch (e) {
                console.warn(`  ⚠️  "${keyword}" 검색 실패: ${e.message}`);
                if (e.message.includes('quota') || e.message.includes('limit')) {
                    console.error('🛑 유튜브 API 할당량 초과 감지!');
                    quotaExceeded = true;
                    break;
                }
            }
        }

        if (quotaExceeded) break;
        trendScores[theme] = totalScore;
    }

    // 3. 점수 보강 로직 (데이터가 전무할 경우)
    const totalTrendScore = Object.values(trendScores).reduce((a, b) => a + b, 0);
    if (totalTrendScore === 0) {
        console.warn('⚠️  유튜브 트렌드 데이터를 가져올 수 없습니다. AI 추천 모드로 전환합니다.');
        trendScores["Winter Christmas Jazz"] = 100;
        trendScores["OZ CAFE"] = 80;
        trendScores["Midnight Chill"] = 60;
    }

    // 4. 분석 결과 캐싱 (다음 실행 시 재사용)
    try {
        fs.ensureDirSync(path.dirname(CACHE_PATH));
        fs.writeJsonSync(CACHE_PATH, {
            timestamp: new Date().toISOString(),
            data: trendScores
        }, { spaces: 2 });
    } catch (e) {
        console.error('⚠️  캐시 저장 실패:', e.message);
    }

    return trendScores;
}

module.exports = {
    fetchYouTubeTrends,
    THEME_SEARCH_KEYWORDS
};
