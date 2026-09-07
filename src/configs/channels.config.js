const path = require('path');

/**
 * 3대 멀티채널 통합 설정 파일
 * - OZ: AI MUSIC AGENT OZ (글로벌 라운지/재즈/신스)
 * - TROT: K-트롯 라이프 (신바람/감성 트로트)
 * - NATURE: Nature & Zen Sanctuary (자연의 소리 & 수면 명상)
 */
const CHANNELS = {
    OZ: {
        id: 'OZ',
        name: 'AI MUSIC AGENT OZ',
        description: 'The Future of Sound, Composed by AI Agent OZ',
        targetLanguage: 'en',
        tokenFile: 'token_oz.json', // configs/token_oz.json (fallback: token.json)
        musicCategory: 'OZ_AGENT',
        musicEngine: 'suno', // suno or lyria
        defaultGenres: [
            '1960s Smoky Jazz', 
            'Cyberpunk Synthwave', 
            'Grand Symphony Orchestra',
            'Brazilian Phonk'
        ],
        visualStyle: {
            renderer: 'visualizer', // 이퀄라이저 파형 오버레이
            aspectRatio: '16:9',
            fontStyle: 'modern'
        },
        uploadSchedule: ['Monday', 'Thursday', 'Saturday']
    },
    TROT: {
        id: 'TROT',
        name: 'K-트롯 라이프',
        description: '가슴을 울리는 인생 가요 & 신나는 고속도로 트로트 메들리',
        targetLanguage: 'ko',
        tokenFile: 'token_trot.json', // configs/token_trot.json
        musicCategory: 'TROT_KOREA',
        musicEngine: 'suno',
        defaultGenres: [
            '신바람 댄스 트로트',
            '애절한 정통 트로트',
            '디스코 뽕짝 메들리',
            '감성 세미 트로트'
        ],
        visualStyle: {
            renderer: 'lyrics_overlay', // 가사 자막 오버레이
            aspectRatio: '16:9',
            fontStyle: 'bold_gold'
        },
        uploadSchedule: ['Tuesday', 'Friday', 'Sunday']
    },
    NATURE: {
        id: 'NATURE',
        name: 'Nature & Zen Sanctuary',
        description: 'Deep Sleep, Meditation & Peace of Mind with 4K Nature ASMR',
        targetLanguage: 'en',
        tokenFile: 'token_nature.json', // configs/token_nature.json
        musicCategory: 'NATURE_ZEN',
        musicEngine: 'nature_ambient', // ASMR + Solfeggio 432Hz/528Hz
        defaultGenres: [
            'Rain on Window (빗소리)',
            'Forest Birds & Stream (숲속 시냇물)',
            'Ocean Waves & 432Hz (파도와 치유 주파수)',
            'Crackling Fireplace (모닥불 ASMR)'
        ],
        visualStyle: {
            renderer: 'seamless_loop', // 고화질 자연 시네마틱 루프
            aspectRatio: '16:9',
            fontStyle: 'zen_minimal'
        },
        uploadSchedule: ['Wednesday', 'Saturday']
    }
};

/**
 * 채널 키로 설정을 조회하며, 없으면 기본 OZ 채널 반환
 * @param {string} channelKey - 'OZ' | 'TROT' | 'NATURE'
 */
function getChannelConfig(channelKey = 'OZ') {
    const key = (channelKey || 'OZ').toUpperCase();
    if (!CHANNELS[key]) {
        console.warn(`[ChannelConfig] 알 수 없는 채널 '${channelKey}', 기본 'OZ' 채널로 대체합니다.`);
        return CHANNELS.OZ;
    }
    return CHANNELS[key];
}

module.exports = {
    CHANNELS,
    getChannelConfig
};
