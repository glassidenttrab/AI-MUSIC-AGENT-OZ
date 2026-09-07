/**
 * K-트롯 라이프 전용 가사 작사 및 Suno 음악 프롬프트 엔지니어링 모듈
 */

const TROT_GENRES = {
    DANCE: {
        id: 'DANCE',
        name: '신바람 댄스 트로트',
        bpm: 135,
        sunoTags: 'Korean trot, high energy dance trot, vibrant brass section, upbeat synth, accordion riff, rhythmic electronic disco drums, festive, male/female vocal, 135 bpm',
        moodKeywords: ['신바람', '고속도로', '흥겨운', '스트레스 해소', '대박', '청춘']
    },
    EMOTIONAL: {
        id: 'EMOTIONAL',
        name: '애절한 정통/감성 트로트',
        bpm: 78,
        sunoTags: 'Korean traditional trot, emotional, melancholic, acoustic accordion, weeping haegeum, soulful guitar, deep vibrato vocal, heartfelt ballad trot, 78 bpm',
        moodKeywords: ['인생', '고향', '어머니', '세월', '사랑', '눈물', '그리움']
    },
    DISCO: {
        id: 'DISCO',
        name: '디스코 뽕짝 메들리',
        bpm: 140,
        sunoTags: 'Korean disco trot, retro 80s 90s synth brass, bouncy euro-disco beat, exciting guitar solo, party trot, energetic vocal, 140 bpm',
        moodKeywords: ['디스코', '메들리', '달려라', '관광버스', '추억']
    }
};

// 트로트 작사 템플릿 라이브러리
const LYRIC_TEMPLATES = {
    DANCE: [
        {
            theme: "인생 대박 & 청춘 파이팅",
            lyrics: `[Verse 1]
월화수목금토일 땀 흘려 달려왔네
세상살이 힘들어도 웃으면서 살자꾸나
어깨 쫙 펴고 가슴 활짝 열고
오늘도 멋지게 달려보자 (아싸!)

[Pre-Chorus]
인생이란 한 번뿐인 소풍 같은 것
근심 걱정 모두 털어버려요!

[Chorus]
대박이 터진다 내 인생 대박 터져!
쨍하고 해 뜰 날이 바로 오늘이다
쿵짝쿵짝 리듬에 맞춰 춤을 춰봐요
신바람 나게 한번 살아보자! (얼씨구 좋다!)

[Verse 2]
지나간 어제 일은 미련 두지 마라
다가올 내일 향해 힘차게 달려가자
쨍하고 쨍하고 해가 뜬다
웃는 자에게 복이 온다네!

[Chorus]
대박이 터진다 내 인생 대박 터져!
쨍하고 해 뜰 날이 바로 오늘이다
쿵짝쿵짝 리듬에 맞춰 춤을 춰봐요
신바람 나게 한번 살아보자!

[Outro]
자 신나게 달려보자!
내 인생 최고다! (아싸!)`
        },
        {
            theme: "사랑의 고속도로",
            lyrics: `[Verse 1]
부릉부릉 시동 걸고 바람을 가르며
그대 향해 달려가는 사랑의 고속도로
막힘없이 뻥 뚫린 이 길처럼
내 마음도 그대에게 직진이다!

[Chorus]
달려라 달려 사랑을 싣고 달려!
너와 나의 행복을 향해 엑셀을 밟아라
라라라 라라라 노래를 부르며
우리 사랑 영원히 직진이다! (좋다!)`
        }
    ],
    EMOTIONAL: [
        {
            theme: "세월의 강 & 어머니",
            lyrics: `[Verse 1]
굽이굽이 흘러가는 세월의 강물 따라
거칠어진 어머니의 손등을 봅니다
자식 위해 한평생을 바치신 그 세월
가슴속에 눈물로 남았습니다

[Chorus]
어머니 나의 어머니 고마운 내 어머니
불러도 불러도 목이 메는 그 이름
남은 생은 부디 아프지 마시고
꽃길만 걸으소서 나의 어머니`
        }
    ]
};

/**
 * 트로트 프롬프트 및 가사 생성기
 * @param {string} [subGenre='DANCE'] - 'DANCE' | 'EMOTIONAL' | 'DISCO'
 * @param {string} [customTheme] - 사용자 맞춤 테마
 */
function generateTrotPrompt(subGenre = 'DANCE', customTheme = null) {
    const genreKey = (subGenre || 'DANCE').toUpperCase();
    const genreInfo = TROT_GENRES[genreKey] || TROT_GENRES.DANCE;

    // 가사 선정
    const templates = LYRIC_TEMPLATES[genreKey] || LYRIC_TEMPLATES.DANCE;
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    const titlePrefix = genreInfo.name.includes('댄스') ? '신바람 대박' : '인생 연가';
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const title = `[K-트롯] ${titlePrefix} - ${randomTemplate.theme}`;

    return {
        genre: genreInfo.name,
        bpm: genreInfo.bpm,
        sunoPrompt: genreInfo.sunoTags,
        lyrics: randomTemplate.lyrics,
        title: title,
        recommendedHashtags: ['#트로트', '#신바람트로트', '#고속도로메들리', '#K트롯', '#트로트연속듣기', '#성인가요']
    };
}

module.exports = {
    TROT_GENRES,
    generateTrotPrompt
};
