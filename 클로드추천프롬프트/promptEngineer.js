'use strict';

const fs   = require('fs-extra');
const path = require('path');
const { fetchYouTubeTrends } = require('./youtubeAnalyzer');

// ─────────────────────────────────────────────
// lessons_learned.json 로드
// ─────────────────────────────────────────────
const LESSONS_PATH = path.join(__dirname, 'memory', 'lessons_learned.json');

function loadLessons() {
    try {
        if (fs.existsSync(LESSONS_PATH)) {
            return JSON.parse(fs.readFileSync(LESSONS_PATH, 'utf8'));
        }
    } catch (e) {
        console.error('[OZ Error] Failed to read lessons_learned.json', e);
    }
    return {
        successful_genres:    [],
        technical_issues:     [],
        external_trends:      [],
        performance_history:  [],
        last_youtube_trends:  null,
        last_analyzed:        null
    };
}

let lessons_learned = loadLessons();

// ─────────────────────────────────────────────
// PromptEngineer 클래스
// ─────────────────────────────────────────────
class PromptEngineer {

    constructor() {
        this.reload();
        this._initData();
    }

    // ── 데이터 초기화 ──────────────────────────
    _initData() {

        this.trends = {
            genres:      ["Lofi Jazz House", "Organic Ambient", "Classical Performance", "Euro Synthwave", "Afro House"],
            moods:       ["Cozy", "Healing", "Elegant", "Viral", "Hypnotic"],
            instruments: ["Grand Piano", "Soft Strings", "Vintage Synths", "Nature Sounds", "Sub Bass"],
            vocals:      ["Instrumental Only", "Ambient Whispers", "Ethereal Hum"],
            themes: [
                "OZ CAFE", "Nature/ASMR Sanctuary", "Classical Performance",
                "Euro Synth Night", "Midnight Solstice Afro", "Spring Blossom Walk",
                "Lofi Study Room", "Tokyo City Pop", "Midnight Chill",
                "Cinematic Orchestral", "Seoul Rainy Day", "Aura Brazilian Bounce",
                "Cozy Acoustic Evening", "Deep Sleep Therapy", "Neo Soul Groove",
                "Funk Groove Session", "Berlin Minimal", "Winter Christmas Jazz",
                "Autumn Nostalgic Walk"
            ]
        };

        // ── 기본 weight 테이블 (baseScore) ──────
        this.baseWeightTable = [
            { theme: "OZ CAFE",                genreMatch: "Jazz",        baseScore: 60 },
            { theme: "Lofi Study Room",        genreMatch: "Lofi",        baseScore: 65 },
            { theme: "Nature/ASMR Sanctuary",  genreMatch: "Ambient",     baseScore: 55 },
            { theme: "Classical Performance",  genreMatch: "Classical",   baseScore: 52 },
            { theme: "Tokyo City Pop",         genreMatch: "City Pop",    baseScore: 58 },
            { theme: "Cinematic Orchestral",   genreMatch: "Cinematic",   baseScore: 55 },
            { theme: "Euro Synth Night",       genreMatch: "Synthwave",   baseScore: 50 },
            { theme: "Spring Blossom Walk",    genreMatch: "Acoustic",    baseScore: 45 },
            { theme: "Midnight Chill",         genreMatch: "Downtempo",   baseScore: 50 },
            { theme: "Seoul Rainy Day",        genreMatch: "K-Indie",     baseScore: 50 },
            { theme: "Neo Soul Groove",        genreMatch: "Neo Soul",    baseScore: 48 },
            { theme: "Midnight Solstice Afro", genreMatch: "Afro House",  baseScore: 40 },
            { theme: "Aura Brazilian Bounce",  genreMatch: "Phonk",       baseScore: 40 },
            { theme: "Cozy Acoustic Evening",  genreMatch: "Folk",        baseScore: 44 },
            { theme: "Deep Sleep Therapy",     genreMatch: "Sleep",       baseScore: 50 },
            { theme: "Funk Groove Session",    genreMatch: "Funk",        baseScore: 42 },
            { theme: "Berlin Minimal",         genreMatch: "Minimal",     baseScore: 38 },
            { theme: "Winter Christmas Jazz",  genreMatch: "Christmas",   baseScore: 35 },
            { theme: "Autumn Nostalgic Walk",  genreMatch: "Autumn",      baseScore: 42 }
        ];

        // ── 레퍼런스 아티스트 (프롬프트 내부 전용 — 외부 노출 금지) ──
        this.referenceArtists = {
            "OZ CAFE":                { internal: ["Miles Davis", "Bill Evans", "Chet Baker"] },
            "Nature/ASMR Sanctuary":  { internal: ["Brian Eno", "Harold Budd"] },
            "Classical Performance":  { internal: ["Yiruma", "Ludovico Einaudi", "Max Richter"] },
            "Euro Synth Night":       { internal: ["Kavinsky", "Perturbator", "FM-84"] },
            "Spring Blossom Walk":    { internal: ["Jack Johnson", "Ben Harper"] },
            "Lofi Study Room":        { internal: ["Nujabes", "J Dilla", "Idealism"] },
            "Tokyo City Pop":         { internal: ["Tatsuro Yamashita", "Mariya Takeuchi", "Anri"] },
            "Midnight Chill":         { internal: ["Bonobo", "Tycho", "Thievery Corporation"] },
            "Cinematic Orchestral":   { internal: ["Hans Zimmer", "Ennio Morricone"] },
            "Seoul Rainy Day":        { internal: ["Standing Egg", "Hyukoh", "10cm"] },
            "Neo Soul Groove":        { internal: ["D'Angelo", "Erykah Badu", "Hiatus Kaiyote"] },
            "Midnight Solstice Afro": { internal: ["Black Coffee", "Themba", "Enoo Napa"] },
            "Aura Brazilian Bounce":  { internal: ["Anitta", "Tropkillaz"] },
            "Cozy Acoustic Evening":  { internal: ["Nick Drake", "José González"] },
            "Deep Sleep Therapy":     { internal: ["Marconi Union", "Steven Halpern"] },
            "Funk Groove Session":    { internal: ["Herbie Hancock", "Chick Corea"] },
            "Berlin Minimal":         { internal: ["Aphex Twin", "Burial", "Four Tet"] },
            "Winter Christmas Jazz":  { internal: ["Vince Guaraldi", "Frank Sinatra"] },
            "Autumn Nostalgic Walk":  { internal: ["Norah Jones", "Paolo Nutini"] }
        };

        // ── 음악 이론 정보 (BPM / Key / Feel) ──
        this.musicTheory = {
            "OZ CAFE":                { bpm: "72-88",   key: "F major / Bb major", timeSignature: "4/4", feel: "Laid-back swing" },
            "Lofi Study Room":        { bpm: "75-90",   key: "C minor / Eb major", timeSignature: "4/4", feel: "Dusty boom-bap" },
            "Nature/ASMR Sanctuary":  { bpm: "60-70",   key: "Any modal",          timeSignature: "Free", feel: "Breathlike ebb" },
            "Classical Performance":  { bpm: "60-80",   key: "C minor / E minor",  timeSignature: "3/4 or 4/4", feel: "Rubato" },
            "Tokyo City Pop":         { bpm: "100-118", key: "F# major / A major", timeSignature: "4/4", feel: "Groovy disco-funk" },
            "Euro Synth Night":       { bpm: "120-128", key: "D minor",            timeSignature: "4/4", feel: "Driving pulse" },
            "Spring Blossom Walk":    { bpm: "90-104",  key: "G major",            timeSignature: "4/4", feel: "Light strum" },
            "Midnight Chill":         { bpm: "85-100",  key: "Bb minor",           timeSignature: "4/4", feel: "Deep headnod" },
            "Seoul Rainy Day":        { bpm: "76-88",   key: "D major / B minor",  timeSignature: "4/4", feel: "Emotional folk strum" },
            "Cinematic Orchestral":   { bpm: "60-90",   key: "D minor / F major",  timeSignature: "4/4", feel: "Sweeping cinematic" },
            "Neo Soul Groove":        { bpm: "88-98",   key: "Eb major",           timeSignature: "4/4", feel: "Soulful laidback" },
            "Midnight Solstice Afro": { bpm: "122-128", key: "A minor",            timeSignature: "4/4", feel: "Hypnotic tribal loop" },
            "Aura Brazilian Bounce":  { bpm: "130-140", key: "F minor",            timeSignature: "4/4", feel: "Aggressive phonk drop" },
            "Cozy Acoustic Evening":  { bpm: "70-85",   key: "C major / G major",  timeSignature: "4/4", feel: "Fingerpicked warm" },
            "Deep Sleep Therapy":     { bpm: "50-65",   key: "Any",                timeSignature: "Free", feel: "Delta-wave drift" },
            "Funk Groove Session":    { bpm: "100-115", key: "E minor / G major",  timeSignature: "4/4", feel: "Snappy pocket groove" },
            "Berlin Minimal":         { bpm: "128-132", key: "Atonal",             timeSignature: "4/4", feel: "Cold mechanical pulse" },
            "Winter Christmas Jazz":  { bpm: "80-95",   key: "G major / C major",  timeSignature: "4/4", feel: "Warm festive swing" },
            "Autumn Nostalgic Walk":  { bpm: "78-92",   key: "A major / F# minor", timeSignature: "4/4", feel: "Melancholic warmth" }
        };

        // ── 곡 구조 ──────────────────────────────
        this.songStructure = {
            longMix:   "Intro (soft, 30s) → Groove builds → Peak energy (mid) → Cool down → Outro (fade 30s)",
            shortTrack:"Intro → Verse → Chorus → Bridge → Outro",
            ambient:   "Seamless loop-friendly, no hard transitions, evolving textures"
        };

        // ── 썸네일 컨셉 ──────────────────────────
        this.thumbnailConcepts = {
            "OZ CAFE":                { style: "Cinematic warm amber cafe bokeh", text: "COZY JAZZ • STUDY & RELAX",     colorPalette: ["#2C1A0E", "#D4A55A", "#F5ECD7"] },
            "Lofi Study Room":        { style: "Anime girl at desk with rain window", text: "LOFI HIP HOP • STUDY BEATS", colorPalette: ["#1A1A2E", "#E94560", "#F5A623"] },
            "Nature/ASMR Sanctuary":  { style: "Misty forest with soft light rays", text: "HEALING ASMR • NATURE SOUNDS", colorPalette: ["#1B4332", "#52B788", "#D8F3DC"] },
            "Classical Performance":  { style: "Grand piano in candlelit hall",     text: "CLASSICAL PIANO • FOCUS",      colorPalette: ["#1A1A1A", "#C9A84C", "#F0EAD6"] },
            "Tokyo City Pop":         { style: "80s anime Tokyo neon street at night", text: "CITY POP TOKYO • NIGHT DRIVE", colorPalette: ["#0D0221", "#FF6B9D", "#FFE66D"] },
            "Euro Synth Night":       { style: "Neon cyberpunk rain-wet streets",   text: "NIGHT DRIVE • SYNTHWAVE",      colorPalette: ["#0D0D1A", "#FF2D78", "#00F0FF"] },
            "Spring Blossom Walk":    { style: "Cherry blossom path soft sunlight", text: "SPRING WALK • ACOUSTIC FOLK",  colorPalette: ["#FFF0F5", "#FFB7C5", "#8DB48E"] },
            "Cinematic Orchestral":   { style: "Epic mountain vista dramatic clouds", text: "EPIC CINEMATIC • ORCHESTRA",  colorPalette: ["#0A0A0A", "#8B0000", "#D4AF37"] },
            "Seoul Rainy Day":        { style: "Korean cafe window rain bokeh",     text: "RAINY DAY • KOREAN INDIE",    colorPalette: ["#2D2D2D", "#5B8DB8", "#E8E8E8"] },
            "Midnight Chill":         { style: "Dark lounge neon blue haze",        text: "MIDNIGHT CHILL • DOWNTEMPO",  colorPalette: ["#0A0A1A", "#1E3A5F", "#00D4FF"] },
            "Midnight Solstice Afro": { style: "African tribal fire night sky",     text: "AFRO HOUSE • MIDNIGHT",       colorPalette: ["#1A0A00", "#FF6B00", "#FFD700"] }
        };

        // ── 가사 템플릿 (Rhyme: ABAB / AABB 명시, 감정 아크 포함) ──
        this.lyricTemplates = {

            // Rhyme: ABAB | Arc: warm → nostalgic → resolved
            "OZ CAFE":
`(Verse 1) [Rhyme: ABAB | Mood: warm, intimate]
Steam rises from the porcelain cup (A)
Raindrops racing, never giving up (B)
Cozy corner, world is far away (A)
In this cafe, I think I'll stay (B)

(Chorus) [Energy: lift, hopeful]
Just the jazz and me tonight
Soft piano makes it right
Time slows down in amber light
Everything feels alright

(Verse 2) [Rhyme: ABAB | Mood: deepening nostalgia]
The trumpet sings a smoky lullaby (A)
Old vinyl spinning, years gone by (B)
A stranger smiles across the room (A)
This jazz will chase away the gloom (B)

(Bridge) [Emotional break — slower tempo, sparse instrumentation]
Maybe time was never meant to rush
Maybe all we need is this soft hush
One more cup, one more song
In this cafe, I belong

(Outro) [Fade: gentle, resolved]
Steam rises... let it go...`,

            // Instrumental only
            "Nature/ASMR Sanctuary":
`Instrumental. [Arc: silence → organic layer build → gentle peak → dissolve]
(Focus on: rain drops, wind through leaves, distant stream, bird calls, soft piano undertone)
(No lyrics. Let nature speak.)`,

            // Instrumental only
            "Classical Performance":
`Instrumental. [Arc: quiet tension → full orchestral climax → emotional resolution]
(No lyrics. Convey emotion through orchestration alone.)
(Dynamics: pp → ff → pp)`,

            // Rhyme: AABB | Arc: cold energy → euphoric peak → driving close
            "Euro Synth Night":
`(Verse 1) [Rhyme: AABB | Mood: driving, electric]
Neon pulse under the European sky (A)
Analog dreams as the city lights fly (A)
Velocity rising through the electric night (B)
Synthwave horizon, chasing the light (B)

(Chorus) [Energy: peak, euphoric]
We are the signal, we are the wave
Racing through circuits, born to be brave
The night is alive and so are we
Burning like neon, wild and free

(Verse 2) [Rhyme: AABB | Mood: faster, more urgent]
Dashboard is glowing, the engine ignites (A)
Cutting through darkness, chasing the lights (A)
Chrome and velocity, city below (B)
Synth in my bloodstream, nowhere to go (B)

(Bridge) [Emotional break — brief melodic synth solo, no vocals]
(Instrumental break: arpeggiated synth rise, 8 bars)

(Outro) [Driving, fading into distance]
Into the grid we disappear...`,

            // Rhyme: ABAB | Arc: gentle → joyful → tender → warm close
            "Spring Blossom Walk":
`(Verse 1) [Rhyme: ABAB | Mood: warm, romantic]
Pink petals falling softly on my skin (A)
Warm breeze blowing, let the walk begin (B)
Acoustic melodies, a harmonica's tune (A)
Under the dazzling sky of a spring afternoon (B)

(Chorus) [Energy: bright, joyful]
Holding hands beneath the cherry blossom tree
Walking at our pace, just you and me
A spring-time melody drifting on the air
A piece of this moment, a love we share

(Verse 2) [Rhyme: ABAB | Mood: tender, present]
Sunlight dancing through the petals white (A)
Your laughter echoes in the open air (B)
I want to hold this afternoon so tight (A)
A memory too beautiful to bear (B)

(Bridge) [Emotional break — slower, acoustic guitar only]
If I could stop the clock right here
I'd keep this walk, this sky, this year
No need for words, no need for more
This is what I've been waiting for

(Outro) [Gentle, warm fade]
Cherry blossoms falling... just you and me...`,

            // Instrumental with texture guide
            "Lofi Study Room":
`Instrumental. [Arc: warm static open → steady groove → subtle shifts → unchanged close]
(No lyrics. Dusty vinyl warmth, lo-fi textures, focus-friendly loop)
(Texture layers: vinyl crackle → soft piano → lazy drum loop → distant rain)`,

            // Rhyme: AABB | Arc: nostalgic → romantic → wistful close
            "Tokyo City Pop":
`(Verse 1) [Rhyme: AABB | Mood: groovy, nostalgic]
Cruising down the neon boulevard (A)
City lights reflecting every star (A)
You and I in a summer groove (B)
Nothing left to prove (B)

(Chorus) [Energy: bright, carefree]
Tokyo nights and city pop dreams
Nothing is ever as hard as it seems
You take my hand on the Yamanote line
Everything glows and everything's fine

(Verse 2) [Rhyme: AABB | Mood: warm, cinematic]
Shibuya crossing, ten thousand souls (A)
Summer is calling, the city it rolls (A)
Saxophone drifting from somewhere unseen (B)
The most beautiful night there has ever been (B)

(Bridge) [Emotional break — Rhodes piano solo, dreamy]
(8-bar instrumental break — soft Rhodes, chorus guitar shimmer)

(Outro) [Wistful, fade to city ambience]
The city hums... we keep on walking...`,

            // Rhyme: ABAB | Arc: rainy longing → acceptance → quiet peace
            "Seoul Rainy Day":
`(Verse 1) [Rhyme: ABAB | Mood: melancholic, intimate — Korean]
빗소리가 창문을 두드리고 (A)
따뜻한 커피 한 잔 앞에 앉아 (B)
너를 생각하는 이 시간이 (A)
그렇게 아프지는 않아 (B)

(Chorus) [Energy: emotional swell]
비가 내리면 늘 네가 생각나
이 노래처럼 조용히 흘러가
괜찮아, 오늘은 그래도 돼
빗속에 혼자여도 괜찮아

(Verse 2) [Rhyme: ABAB | Mood: reflective, softer]
창밖의 골목길 물이 고이고 (A)
지나간 계절이 스쳐 지나가 (B)
너의 웃음이 떠오를 때마다 (A)
괜히 따뜻해지는 나야 (B)

(Bridge) [Emotional break — piano only, slower]
그때 우리가 걷던 그 길
지금도 비가 내리고 있을까
그리워도 괜찮아
비는 언제나 그쳤으니까

(Outro) [Quiet, resolved]
빗소리만 남아...`,

            // Rhyme: ABAB | Arc: tribal call → euphoric peak → spiritual close
            "Midnight Solstice Afro":
`(Verse 1) [Rhyme: ABAB | Mood: hypnotic, ritualistic]
Under the moon, the rhythm breathes (A)
Ancestral echoes through the leaves (B)
The dancefloor calls, the spirits rise (A)
African soul beneath the skies (B)

(Chorus) [Energy: tribal peak, communal]
Move with the pulse of the ancient drum
Feel the vibration of where we come from
Midnight is sacred, the circle is whole
Let the rhythm heal every broken soul

(Verse 2) [Rhyme: ABAB | Mood: deeper trance]
The fire burns low, the dancers sway (A)
Solstice arrives at the break of day (B)
The bass line carries what words cannot say (A)
We surrender and the darkness fades away (B)

(Bridge) [Emotional break — chant only, percussion drops out]
(Ancestral chant: wordless vocalization, sparse hand drum)
Heal... release... return...

(Outro) [Spiritual, dissolving]
The rhythm fades into the dawn...`,

            // Rhyme: AABB | Arc: nostalgic open → wistful peak → acceptance
            "Autumn Nostalgic Walk":
`(Verse 1) [Rhyme: AABB | Mood: melancholic, warm]
Leaves of amber line the empty street (A)
A familiar song beneath my feet (A)
The season changing, memory calls (B)
Somewhere between the rise and falls (B)

(Chorus) [Energy: emotional, open]
I keep on walking through the autumn rain
Some things you lose you can't regain
But in the falling leaves I find
A quiet peace inside my mind

(Verse 2) [Rhyme: AABB | Mood: reflective, resigned]
The coffee cools beside the windowpane (A)
October letters never sent in vain (A)
A photograph of someone long since gone (B)
The melody of autumn carries on (B)

(Bridge) [Emotional break — cello solo, minimal]
(Solo cello, 8 bars — melancholic, unhurried)
Let it go... let it go...

(Outro) [Acceptance, gentle fade]
The leaves keep falling... and so do I...`,

            // Rhyme: AABB | Arc: smooth intro → soulful peak → silky close
            "Neo Soul Groove":
`(Verse 1) [Rhyme: AABB | Mood: smooth, sensual]
Candlelight is low and the Rhodes is warm (A)
You and I together weathering every storm (A)
Fingers on the keys, fingers in my hair (B)
Soul music rising soft into the air (B)

(Chorus) [Energy: soulful lift]
This groove is all we need tonight
Neo soul burning amber light
Feel it in your chest, let it breathe
Everything you want, just believe

(Bridge) [Emotional break — vocal ad libs, sparse Rhodes]
(Ad lib: wordless vocal run over Rhodes chord — 4 bars)
Mmm... yeah... just like that...

(Outro) [Silky, intimate fade]
Let the music hold you... hold you...`,

            // Rhyme: ABAB | Arc: winter cozy → festive peak → warm close
            "Winter Christmas Jazz":
`(Verse 1) [Rhyme: ABAB | Mood: warm, festive]
Snow is falling on the cobblestone (A)
A trumpet plays a carol soft and low (B)
The fire crackles, you are not alone (A)
December glowing in the candleglow (B)

(Chorus) [Energy: festive, joyful swing]
Deck the halls with jazz tonight
Swing the sleigh bells, hold me tight
All I want beneath the tree
Is this music and you with me

(Verse 2) [Rhyme: ABAB | Mood: nostalgic, tender]
The piano swings like it did years before (A)
Your laughter fills the room with Christmas cheer (B)
I don't need presents, I don't need anything more (A)
Just this moment, just you here (B)

(Bridge) [Emotional break — muted trumpet solo]
(Muted trumpet: 8-bar warm ballad phrase)

(Outro) [Cozy fade]
Let it snow... let the music play...`,

            // Rhyme: AABB | Arc: intimate open → tender peak → quiet resolve
            "Cozy Acoustic Evening":
`(Verse 1) [Rhyme: AABB | Mood: intimate, introspective]
The porch light flickers in the evening air (A)
I pick a chord and leave it hanging there (A)
The day is done, the city settles down (B)
A single guitar sound without a sound (B)

(Chorus) [Energy: warm, understated]
This is enough, this quiet song
A place where I have always belonged
No stage, no lights, just open strings
And everything that evening brings

(Bridge) [Emotional break — fingerpicked guitar only]
(Solo fingerpick — 8 bars, no vocals, natural room tone)

(Outro) [Dissolving into silence]
One last chord... then let it go...`,

            // Rhyme: AABB | Arc: funky intro → groove peak → tight close
            "Funk Groove Session":
`(Verse 1) [Rhyme: AABB | Mood: energetic, confident]
The bass line hits before the lights come on (A)
The drummer locks the pocket, we are gone (A)
Brass section rises like a morning shout (B)
This is what the groove is all about (B)

(Chorus) [Energy: full band, punchy]
Get down, get low, feel the pocket groove
Everybody here has got something to prove
Snap, clap, lock it in tight
This funk session's burning through the night

(Bridge) [Break — drum and bass only, 4 bars]
(Drum and bass breakdown — tight and minimal)

(Outro) [Hard stop or fade]
One more time... and hit it...`,

            // Instrumental / ambient guide
            "Midnight Chill":
`Instrumental. [Arc: submerged open → subtle groove build → deepest point → slow dissolve]
(No lyrics. Deep sub bass, atmospheric pads, broken beat)
(Texture: darkness first, let the beat breathe)`,

            // Instrumental
            "Cinematic Orchestral":
`Instrumental. [Arc: sparse strings → brass entry → full orchestral climax → resolution]
(No lyrics. Emotion through orchestration only.)
(Key moments: solo violin at opening, full tutti at peak, solo piano at close)`,

            // Instrumental sleep guide
            "Deep Sleep Therapy":
`Instrumental. [Arc: near silence → gentle drift → delta plateau → unchanged to end]
(No lyrics. No rhythmic pulse. Smooth pad crossfades only.)
(Intent: guide listener to sleep within 10 minutes)`,

            // Instrumental / Phonk guide
            "Aura Brazilian Bounce":
`Instrumental (or minimal chant). [Arc: hard drop from 0:00 → maximum energy → breakdown → final drop]
(Vocal: aggressive ad libs or wordless chant only — no full lyrics)
(Energy: never slow down, never breathe)`,

            // Instrumental
            "Berlin Minimal":
`Instrumental. [Arc: single cold pulse → mechanical layer build → peak density → stripped close]
(No lyrics. Cold, industrial, hypnotic.)
(No warmth, no melody — pure rhythmic architecture)`,
        };

        // ── Shorts 훅 ────────────────────────────
        this.shortsHooks = {
            "OZ CAFE":                ["This coffee shop vibe will change your focus ☕", "The perfect jazz backdrop for deep work", "Ever felt like you're in a 1960s film? Now you can."],
            "Lofi Study Room":        ["This lofi beat will help you focus in 10 seconds 🎧", "Study smarter with the perfect lo-fi groove", "Turn on, tune in, lock in. 📚"],
            "Nature/ASMR Sanctuary":  ["Instantly calm your mind with healing sounds 🌿", "The ultimate sanctuary for a stressful day", "Close your eyes. Let nature take over."],
            "Classical Performance":  ["Feel raw emotion from a grand orchestra 🎹", "Timeless elegance for your quiet moments", "This masterpiece will touch your soul"],
            "Euro Synth Night":       ["Elevate your night drive with this synthwave pulse 🏎️", "Cyberpunk energy for late-night coding", "The beat that keeps the city alive"],
            "Midnight Solstice Afro": ["Get lost in the hypnotic pulse of Afro House 🌙", "Rhythmic healing for the midnight hours", "Connect with the tribal spirit"],
            "Spring Blossom Walk":    ["A beautiful walk under cherry blossoms 🌸", "Sweet male vocal for your spring afternoon", "The perfect spring BGM for couples 🎸"],
            "Tokyo City Pop":         ["80s Tokyo never sounded this good 🌆", "City pop is taking over YouTube again 🇯🇵", "Your aesthetic Japanese summer playlist"],
            "Seoul Rainy Day":        ["Korean indie + rainy day = perfect mood 🌧️", "This song sounds like a Korean film scene", "감성 충전 완료 🎶"],
            "Cinematic Orchestral":   ["This orchestral piece gives you chills 🎻", "The music your movie marathon deserves", "Instant epic mood in 5 seconds"],
            "Deep Sleep Therapy":     ["Fall asleep in under 10 minutes 😴", "The sleep music that actually works", "Your brain needs this tonight 🌙"],
            "Midnight Chill":         ["This beat hits different after midnight 🌙", "Your late-night soundtrack starts here", "Turn off the lights and let this play 🎧"],
            "Aura Brazilian Bounce":  ["This phonk beat is taking over the internet ⚡", "Your workout just got a serious upgrade", "Warning: this rhythm is dangerously addictive 🔥"],
            "Cozy Acoustic Evening":  ["The most calming guitar you'll hear today 🎸", "Perfect for your quiet evening wind-down", "Sit back, breathe, and let the strings do the rest 🌿"],
            "Neo Soul Groove":        ["Neo soul so smooth it should be illegal 🎵", "Your Friday night vibe just arrived", "This groove will stay in your head all day 🎷"],
            "Funk Groove Session":    ["This funk groove is pure serotonin ⚡", "You can't sit still during this one 🥁", "The pocket groove that never misses"],
            "Berlin Minimal":         ["The sound of 3AM in a Berlin warehouse 🏭", "Cold, hypnotic, and completely addictive", "Minimal beats. Maximum focus. 🎧"],
            "Winter Christmas Jazz":  ["The coziest Christmas jazz you've ever heard ☃️", "Deck the halls with this smooth jazz mix 🎄", "Your holiday season just found its soundtrack"],
            "Autumn Nostalgic Walk":  ["This autumn acoustic will make you feel everything 🍂", "A walk through falling leaves in sound form", "Nostalgia hits different with this one 🎸"]
        };

        // ── 트랙 서브 타이틀 DB ──────────────────
        this.trackSubTitles = {
            "OZ CAFE":                ["Midnight Espresso", "Velvet Piano Soul", "Rainy Window Rhythms", "The Hidden Booth", "Soulful Steam", "Vintage Vinyl Breeze", "Quiet Corner Reflections", "Smooth Roast Bebop", "Bossa in the Brewery", "The Last Passenger"],
            "Lofi Study Room":        ["Dusty Pages", "Bedroom at 2AM", "Pencil & Rain", "The Focus Zone", "Lo-fi Daydream", "Cassette Warmth", "Faded Memories", "Study Lamp Glow", "Analog Soul", "Coffee & Code"],
            "Nature/ASMR Sanctuary":  ["Ethereal Forest Mist", "Zen Garden Whispers", "Flowing Crystal Stream", "Deep Earth Resonance", "Cradle of Silence", "Starlight Canopy", "Ancient Tree Breathing", "Celestial Dewdrops", "Sacred Mountain Calm", "The Inner Sanctuary"],
            "Classical Performance":  ["Whispers of the Grand Hall", "Midnight Symphony", "The Ocean's Serenade", "Eternal Echoes", "Starlight Sonata", "Majestic Horizon", "Timeless Waltz", "Celestial Performance", "Gilded Memory", "Sorrow and Grace"],
            "Euro Synth Night":       ["Cyber City Pulse", "Neon Drive 2049", "Velocity Dream", "Analog Horizon", "Synthwave Sky", "Infinite Circuit", "Digital Sunset", "Electric Nostalgia", "Grid Runner", "The Last Signal"],
            "Tokyo City Pop":         ["Shibuya Crossing Dreams", "Summer in Shimokitazawa", "Neon Blossom Avenue", "Late Night Yamanote", "Harajuku Sunset", "Shinjuku After Rain", "Tokyo 1983", "City Lights Reflection", "Electric Youth", "Sunday Groove in Roppongi"],
            "Midnight Chill":         ["Floating at 3AM", "Blue Hour Drift", "Slow City Haze", "Neon Fog", "The Long Way Home", "Sleepless in Motion", "Underwater Calm", "Glitch in the Dark", "Hollow Streets", "Before the Sun"],
            "Cinematic Orchestral":   ["The Last Frontier", "Before the Storm", "Echoes of Eternity", "Rise of the Brave", "Tears of Orion", "The Wanderer's Oath", "Silent Colossus", "Wings of Destiny", "Beyond the Horizon", "Crimson Overture"],
            "Seoul Rainy Day":        ["창문 밖의 빗소리", "혼자인 밤", "따뜻한 아메리카노", "가을 골목길", "네가 떠난 자리", "빗속의 카페", "익숙한 슬픔", "그리움의 온도", "기억의 잔향", "우산 없는 날"],
            "Spring Blossom Walk":    ["Petals in the Wind", "Sunny Afternoon Path", "The First Bloom", "Morning Breeze Melody", "Love in the Air", "Cherish This Moment", "Garden of Dreams", "Spring Harmony", "Walking on Sunshine", "The Sweetest Bloom"],
            "Midnight Solstice Afro": ["Tribal Heartbeat", "Lunar Pulse", "Sahara Night Breeze", "Solstice Rhythm", "Nomadic Echoes", "Dusk to Dawn", "Ancestral Flow", "Rhythmic Trance", "Spirit of the Sands", "Obsidian Moon"],
            "Autumn Nostalgic Walk":  ["Amber Streets", "The Fallen Leaf", "October Letter", "Harvest Moon Walk", "End of September", "Last Warm Day", "Wooden Floors & Tea", "Foggy Morning Trail", "Goodbye Summer", "Between the Seasons"],
            "Aura Brazilian Bounce":  ["Favela Pulse", "Neon Carnival", "Phonk do Brasil", "Voltage Rush", "Bass Ritual", "Underground Heat", "Bounce Protocol", "Electric Baile", "The Drop Zone", "Savage Frequency"],
            "Cozy Acoustic Evening":  ["Porch at Dusk", "Soft String Confession", "The Last Light", "Fireplace Fingerpick", "Evening Prayer", "Gentle Unwind", "Old Wood & New Song", "Bare Strings", "Quiet Room", "Candlelight Session"],
            "Deep Sleep Therapy":     ["Into the Void", "Weightless Descent", "Delta Drift", "Oceanic Rest", "The Stillness Within", "Dream Threshold", "Slow Exhale", "Zero Gravity", "Healing Hour", "Infinite Calm"],
            "Neo Soul Groove":        ["Velvet Underground Soul", "Satin Feeling", "Golden Hour Groove", "Smooth as Silk", "Brown Sugar Rhythm", "Late Evening Confession", "Soulful Surrender", "Midnight Warmth", "Gentle Fire", "The Feeling"],
            "Funk Groove Session":    ["Pocket Rocket", "Clavinet Hustle", "Brass Attack", "The Downbeat", "Funky Drummer's Dream", "Electric Avenue Groove", "Snap & Pop", "One More Bar", "Soul Kitchen", "The Slap"],
            "Berlin Minimal":         ["Cold Grid", "Warehouse Protocol", "Modular Drift", "Concrete Pulse", "Sub Zero Signal", "The Machine Speaks", "Dark Matter Loop", "Sterile Rhythm", "Void Circuit", "Northern Frequency"],
            "Winter Christmas Jazz":  ["Chestnuts & Brushed Drums", "Snowfall Bebop", "The Warm Fireplace Set", "Jingle Swing", "December in Blue", "Muted Trumpet Carol", "Holy Night Session", "Velvet Winter", "Midnight Mass Jazz", "Festive Smoke"]
        };

        // ── 바이럴 타이틀 템플릿 ──────────────────
        this.viralTitleTemplates = [
            "THIS {Genre} will {Benefit} 🌿 | {Theme}",
            "{Situation} Music for {Target} | {Theme} {Genre} Mix",
            "Better than Coffee: {Mood} {Genre} to {Benefit}",
            "Immersive {Theme} Experience | {Genre} | 1 Hour Mix",
            "Relax your mind with {Theme} | {Genre} {Benefit}",
            "The Ultimate {Genre} for {Situation} | {Theme} Mix",
            "Stop Stress with this {Mood} {Genre} 🎧",
            "Late Night {Theme} | {Genre} for Deep {Situation}"
        ];
    }

    // ── lessons_learned 리로드 ──────────────────
    reload() {
        lessons_learned = loadLessons();
    }

    // ── lessons_learned 저장 ───────────────────
    saveLessons(newData) {
        try {
            const merged = { ...lessons_learned, ...newData, last_updated: new Date().toISOString() };
            fs.ensureDirSync(path.dirname(LESSONS_PATH));
            fs.writeFileSync(LESSONS_PATH, JSON.stringify(merged, null, 2));
            lessons_learned = merged;
            console.log('💾 [Memory] lessons_learned.json 저장 완료');
        } catch (e) {
            console.error('[OZ Error] Failed to save lessons_learned.json', e);
        }
    }

    // ── 채널 성과 기록 ─────────────────────────
    recordSuccess(theme, genre, viewCount) {
        const history = lessons_learned.performance_history || [];
        history.push({ theme, genre, viewCount, date: new Date().toISOString() });

        // successful_genres 갱신 (조회수 1000 이상만)
        const successfulGenres = lessons_learned.successful_genres || [];
        if (viewCount >= 1000 && !successfulGenres.includes(genre)) {
            successfulGenres.push(genre);
        }

        this.saveLessons({ performance_history: history, successful_genres: successfulGenres });
        console.log(`📈 [Record] ${theme} / ${genre} → ${viewCount} views 기록 완료`);
    }

    // ── YouTube 트렌드 캐시 관리 (7일 주기) ────
    async fetchYouTubeTrendsWithCache() {
        const cache       = lessons_learned.last_youtube_trends;
        const lastAnalyzed = lessons_learned.last_analyzed;

        if (cache && lastAnalyzed) {
            const daysSince = (Date.now() - new Date(lastAnalyzed)) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) {
                console.log(`\n📦 [Cache Hit] YouTube 트렌드 캐시 사용 (${daysSince.toFixed(1)}일 전 데이터)`);
                return cache;
            }
        }

        console.log('\n🔄 [Cache Miss] 7일 경과 → YouTube 실시간 재분석 시작');
        const fresh = await fetchYouTubeTrends();
        this.saveLessons({ last_youtube_trends: fresh, last_analyzed: new Date().toISOString() });
        return fresh;
    }

    // ── 최적 테마 선택 (메인 전략 엔진) ────────
    async selectOptimalTheme(rank = 0) {
        console.log('\n╔══════════════════════════════════════════╗');
        console.log('║   OZ Strategy Engine — Theme Selector    ║');
        console.log('╚══════════════════════════════════════════╝');

        // ① YouTube 트렌드 score (캐시 우선)
        const youtubeTrends = await this.fetchYouTubeTrendsWithCache();

        // ② baseScore + YouTube score 합산
        let weightTable = this.baseWeightTable.map(item => {
            const ytScore   = youtubeTrends?.[item.theme] || 0;
            const finalScore = item.baseScore + ytScore;
            console.log(`  📊 ${item.theme.padEnd(26)}: base(${String(item.baseScore).padStart(2)}) + yt(${String(ytScore).padStart(3)}) = ${finalScore}`);
            return { ...item, score: finalScore };
        });

        // ③ 70:20:10 전략 모드
        const rand = Math.random();
        let mode;

        if (rand < 0.1) {
            // 🎲 탐색 (10%)
            mode = 'Exploration';
            weightTable = weightTable.map(item => ({ ...item, score: Math.random() * 100 }));
            console.log('\n📡 [Exploration] 10% — 완전 랜덤 탐색 모드');

        } else if (rand < 0.3) {
            // 📡 시장 정렬 (20%)
            mode = 'Market Alignment';
            console.log('\n📡 [Market Alignment] 20% — lessons_learned external_trends 반영');
            const extTrends = lessons_learned.external_trends || [];
            if (extTrends.length > 0) {
                weightTable = weightTable.map(item => {
                    const matchCount = extTrends.filter(t =>
                        t.found_title?.toLowerCase().includes(item.genreMatch.toLowerCase()) ||
                        t.query?.toLowerCase().includes(item.genreMatch.toLowerCase())
                    ).length;
                    if (matchCount > 0) {
                        console.log(`  🔥 [Market Hit] ${item.genreMatch}: +${matchCount * 25}점`);
                        item.score += matchCount * 25;
                    }
                    return item;
                });
            }

        } else {
            // ✨ 성공 강화 (70%)
            mode = 'Exploitation';
            console.log('\n✨ [Exploitation] 70% — 채널 성공 데이터 기반 강화');
            const successfulGenres = lessons_learned.successful_genres || [];
            if (successfulGenres.length > 0) {
                weightTable = weightTable.map(item => {
                    const hit = successfulGenres.some(sg =>
                        sg.toLowerCase().includes(item.genreMatch.toLowerCase())
                    );
                    if (hit) {
                        console.log(`  ✅ [Reward] ${item.genreMatch}: +50점`);
                        item.score += 50;
                    }
                    return item;
                });
            }
        }

        // ④ 기술적 결함 패널티
        const issues = lessons_learned.technical_issues || [];
        if (issues.length > 0) {
            const badStr = issues.join(' ').toLowerCase();
            weightTable.forEach(item => {
                if (badStr.includes(item.genreMatch.toLowerCase())) {
                    console.log(`  ⚠️  [Penalty] ${item.genreMatch}: -30점 (기술 결함)`);
                    item.score -= 30;
                }
            });
        }

        // ⑤ 성과 히스토리 기반 보정
        const history = lessons_learned.performance_history || [];
        if (history.length > 0) {
            weightTable = weightTable.map(item => {
                const totalViews = history
                    .filter(h => h.theme === item.theme)
                    .reduce((sum, h) => sum + (h.viewCount || 0), 0);
                const bonus = Math.floor(totalViews / 200);
                if (bonus > 0) {
                    console.log(`  📈 [History Bonus] ${item.theme}: +${bonus}점 (누적 조회수 기반)`);
                    item.score += bonus;
                }
                return item;
            });
        }

        // ⑥ 계절 가중치 (현재 월 기준 자동 적용)
        console.log('\n🌿 [Season Weight] 계절 가중치 적용 중...');
        const currentMonth = new Date().getMonth() + 1;
        const seasonBonus = {
            // 봄 (3~5월)
            3: { 'Spring Blossom Walk': 25, 'Seoul Rainy Day': 15, 'OZ CAFE': 10, 'Nature/ASMR Sanctuary': 10 },
            4: { 'Spring Blossom Walk': 25, 'Seoul Rainy Day': 15, 'OZ CAFE': 10, 'Nature/ASMR Sanctuary': 10 },
            5: { 'Spring Blossom Walk': 20, 'Neo Soul Groove': 10, 'Tokyo City Pop': 10 },
            // 여름 (6~8월)
            6: { 'Tokyo City Pop': 25, 'Aura Brazilian Bounce': 20, 'Euro Synth Night': 15 },
            7: { 'Tokyo City Pop': 25, 'Aura Brazilian Bounce': 20, 'Midnight Solstice Afro': 15 },
            8: { 'Tokyo City Pop': 20, 'Midnight Chill': 15, 'Aura Brazilian Bounce': 15 },
            // 가을 (9~11월)
            9:  { 'Autumn Nostalgic Walk': 25, 'Seoul Rainy Day': 20, 'Cozy Acoustic Evening': 15 },
            10: { 'Autumn Nostalgic Walk': 25, 'OZ CAFE': 15, 'Classical Performance': 15 },
            11: { 'Autumn Nostalgic Walk': 20, 'Deep Sleep Therapy': 15, 'Berlin Minimal': 10 },
            // 겨울 (12~2월)
            12: { 'Winter Christmas Jazz': 30, 'OZ CAFE': 20, 'Deep Sleep Therapy': 15 },
            1:  { 'Winter Christmas Jazz': 15, 'Deep Sleep Therapy': 20, 'Lofi Study Room': 15 },
            2:  { 'Lofi Study Room': 20, 'Classical Performance': 15, 'Berlin Minimal': 10 },
        };
        const thisMonthBonus = seasonBonus[currentMonth] || {};
        weightTable = weightTable.map(item => {
            const bonus = thisMonthBonus[item.theme] || 0;
            if (bonus > 0) {
                console.log(`  🌸 [Season Bonus] ${item.theme}: +${bonus}점`);
                item.score += bonus;
            }
            return item;
        });

        // ⑦ 시간대 가중치 (업로드 시각 기준)
        console.log('\n🕐 [Hour Weight] 시간대 가중치 적용 중...');
        const currentHour = new Date().getHours(); // 0~23 (KST 기준)
        const hourBonus = (() => {
            if (currentHour >= 0  && currentHour < 5)  {
                // 심야 (0~4시)
                return { 'Midnight Solstice Afro': 20, 'Midnight Chill': 20, 'Berlin Minimal': 15, 'Deep Sleep Therapy': 15 };
            } else if (currentHour >= 5 && currentHour < 9) {
                // 새벽/아침 (5~8시)
                return { 'Nature/ASMR Sanctuary': 20, 'Lofi Study Room': 15, 'Classical Performance': 10 };
            } else if (currentHour >= 9 && currentHour < 13) {
                // 오전 (9~12시)
                return { 'OZ CAFE': 20, 'Lofi Study Room': 15, 'Classical Performance': 10 };
            } else if (currentHour >= 13 && currentHour < 18) {
                // 오후 (13~17시)
                return { 'Lofi Study Room': 20, 'OZ CAFE': 15, 'Tokyo City Pop': 10 };
            } else if (currentHour >= 18 && currentHour < 22) {
                // 저녁 (18~21시)
                return { 'Neo Soul Groove': 20, 'Euro Synth Night': 15, 'Tokyo City Pop': 15, 'Seoul Rainy Day': 10 };
            } else {
                // 밤 (22~23시)
                return { 'Midnight Chill': 20, 'Midnight Solstice Afro': 15, 'Euro Synth Night': 10 };
            }
        })();
        weightTable = weightTable.map(item => {
            const bonus = hourBonus[item.theme] || 0;
            if (bonus > 0) {
                console.log(`  🕐 [Hour Bonus] ${item.theme}: +${bonus}점 (${currentHour}시)`);
                item.score += bonus;
            }
            return item;
        });

        // ⑧ 최근 사용 페널티 (연속 중복 방지)
        const recentThemes = lessons_learned.recent_themes || [];
        if (recentThemes.length > 0) {
            console.log('\n🔁 [Recent Penalty] 최근 사용 테마 페널티 적용...');
            weightTable = weightTable.map(item => {
                const usedIdx = recentThemes.indexOf(item.theme);
                if (usedIdx === 0) {
                    // 바로 직전 사용 → -40점
                    console.log(`  🔴 [Recent -40] ${item.theme}: 직전 사용됨`);
                    item.score -= 40;
                } else if (usedIdx === 1) {
                    // 2회 전 사용 → -20점
                    console.log(`  🟡 [Recent -20] ${item.theme}: 2회 전 사용됨`);
                    item.score -= 20;
                } else if (usedIdx === 2) {
                    // 3회 전 사용 → -10점
                    item.score -= 10;
                }
                return item;
            });
        }

        // ⑨ 최종 정렬 및 선택
        const sorted  = weightTable.sort((a, b) => b.score - a.score);
        const optimal = sorted[Math.min(rank, sorted.length - 1)];

        // 최근 사용 테마 기록 (최대 5개 유지)
        const updatedRecent = [optimal.theme, ...recentThemes].slice(0, 5);
        this.saveLessons({ recent_themes: updatedRecent });

        console.log(`\n✅ [Final Decision] Mode: ${mode}`);
        console.log(`   → Theme : ${optimal.theme}`);
        console.log(`   → Score : ${optimal.score.toFixed(1)}`);
        console.log(`   → Hour  : ${currentHour}시 | Month: ${currentMonth}월`);
        console.log('─'.repeat(46));

        return optimal.theme;
    }

    // ── 구조화된 프롬프트 생성 ─────────────────
    generateStructuredPrompt(index = 0, isInstrumental = false, overrideTheme = null) {
        let theme = overrideTheme || this.trends.themes[index % this.trends.themes.length];
        let genre, mood, instrument, vocal;
        const originalThemeName = theme;

        // 테마별 세부 설정
        if (theme === 'OZ CAFE') {
            const styles = [
                { genre: 'Slow Jazz Ballad',  mood: 'Smoky & Nostalgic',       instrument: 'Muted Trumpet, soft Piano, double Bass, brush Drums' },
                { genre: 'Fast Bebop Jazz',   mood: 'Energetic & Intellectual', instrument: 'Virtuosic Bebop Piano, Trumpet flares, Saxophone, walking Bass' },
                { genre: 'Cool Jazz',          mood: 'Relaxed & Sophisticated', instrument: 'Vibraphone, soft Saxophone, Piano, brushed Drums' },
                { genre: 'Bossa Nova Jazz',    mood: 'Breezy & Romantic',       instrument: 'Nylon Guitar, Flute, light Percussion, Upright Bass' },
                { genre: 'Smooth Soul Jazz',   mood: 'Warm & Groovy',           instrument: 'Rhodes Piano, Electric Guitar, Jazz Drum loop' },
                { genre: 'Hard Bop',           mood: 'Dynamic & Soulful',       instrument: 'Hard-hitting Drums, aggressive Saxophone, Driving Bass' },
                { genre: 'Gypsy Jazz',         mood: 'Vibrant & Acoustic',      instrument: 'Acoustic Gypsy Guitar, Violin, double Bass' },
                { genre: 'Modal Jazz',         mood: 'Atmospheric & Meditative', instrument: 'Sustained Piano chords, improvisational Saxophone' },
                { genre: 'Swing Jazz',         mood: 'Classic & Upbeat',        instrument: 'Big Band horns, rhythmic Piano, swinging Drums' },
                { genre: 'Latin Jazz',         mood: 'Rhythmic & Spicy',        instrument: 'Congas, Piano montunos, Trumpet, intense Bass' }
            ];
            const style = styles[index % styles.length];
            genre      = `1960s ${style.genre}`;
            mood       = style.mood;
            instrument = style.instrument;
            theme      = `1960s ${style.genre} style`;

        } else if (theme === 'Lofi Study Room') {
            genre      = 'Lo-Fi Hip Hop / Chillhop';
            mood       = 'Dusty, Warm, Focus-friendly';
            instrument = 'Sampled Piano, Lo-Fi Drums, Vinyl crackle, Soft Bass';
            isInstrumental = true;

        } else if (theme === 'Nature/ASMR Sanctuary') {
            genre      = 'Organic Healing Ambient';
            mood       = 'Deep Relaxing & Meditative';
            instrument = 'Soft Piano & Nature Soundscapes (rain, wind, water)';
            isInstrumental = true;

        } else if (theme === 'Classical Performance') {
            genre      = 'Classical Grand Orchestra';
            mood       = 'Majestic & Emotional';
            instrument = 'Symphony Orchestra, Grand Piano, Cinematic Strings, Woodwinds';
            isInstrumental = true;

        } else if (theme === 'Tokyo City Pop') {
            genre      = 'Japanese City Pop / Funk';
            mood       = 'Groovy, Nostalgic, Summery';
            instrument = 'Fender Rhodes, Slap Bass, Disco Strings, Saxophone, Chorus Guitar';
            vocal      = 'Smooth Japanese-style Vocal or Instrumental';

        } else if (theme === 'Euro Synth Night') {
            genre      = 'Modern Euro Synthwave';
            mood       = 'Driving & Energetic';
            instrument = 'Vintage Analogue Synths, Punchy Drum Machine, Arpeggiated Bass';

        } else if (theme === 'Spring Blossom Walk') {
            genre      = 'Spring Mid-tempo Acoustic Pop / Folk';
            mood       = 'Warm, Romantic, Joyful, Breezy';
            instrument = 'Warm Acoustic Guitar, Grand Piano, Harmonica solos, soft Percussion';
            vocal      = 'Deep, Warm, Sweet Male Vocal';

        } else if (theme === 'Midnight Chill') {
            genre      = 'Downtempo / Chillout Electronic';
            mood       = 'Deep, Hazy, Late-night';
            instrument = 'Deep Sub Bass, Atmospheric Pads, Broken Beat Drums, Electric Piano';
            isInstrumental = true;

        } else if (theme === 'Seoul Rainy Day') {
            genre      = 'Korean Indie / Acoustic Folk';
            mood       = 'Emotional, Rainy, Nostalgic';
            instrument = 'Acoustic Guitar, Soft Piano, light Drum brushes, occasional Strings';
            vocal      = 'Warm Korean Male or Female Vocal';

        } else if (theme === 'Cinematic Orchestral') {
            genre      = 'Epic Cinematic Orchestra';
            mood       = 'Majestic, Sweeping, Emotional';
            instrument = 'Full Orchestral Strings, Brass, Choir, Timpani, Grand Piano';
            isInstrumental = true;

        } else if (theme === 'Neo Soul Groove') {
            genre      = 'Neo Soul / Contemporary R&B';
            mood       = 'Soulful, Smooth, Sensual';
            instrument = 'Rhodes Piano, Warm Bass Guitar, Live Drums, Lush Strings';

        } else if (theme === 'Deep Sleep Therapy') {
            genre      = 'Sleep / Delta Wave Ambient';
            mood       = 'Ultra-calm, Drifting, Weightless';
            instrument = 'Gentle Drones, Soft Pads, Binaural textures, Wind chimes';
            isInstrumental = true;

        } else if (theme === 'Midnight Solstice Afro') {
            genre      = 'Afro House / Tribal Electronic';
            mood       = 'Hypnotic, Ritualistic, Deep';
            instrument = 'Tribal Percussion, Hypnotic Synths, Deep Bass, African Chants';

        } else if (theme === 'Aura Brazilian Bounce') {
            genre      = 'Brazilian Phonk / Funk';
            mood       = 'Viral, Aggressive, High Energy';
            instrument = 'Distorted 808 Bass, Aggressive Trap Drums, Whistle synth';

        } else if (theme === 'Cozy Acoustic Evening') {
            genre      = 'Acoustic Folk / Singer-Songwriter';
            mood       = 'Intimate, Warm, Introspective';
            instrument = 'Fingerpicked Acoustic Guitar, soft Cello, gentle Brush Drums';

        } else if (theme === 'Funk Groove Session') {
            genre      = 'Jazz Funk / Electric Fusion';
            mood       = 'Energetic, Soulful, Rhythmic';
            instrument = 'Fender Bass, Clavinet, Brass Section, Funky Drums';

        } else if (theme === 'Berlin Minimal') {
            genre      = 'Minimal Techno / Dark Ambient';
            mood       = 'Cold, Hypnotic, Industrial';
            instrument = 'Modular Synths, Cold Drum Machine, Sub Bass Drone';
            isInstrumental = true;

        } else if (theme === 'Winter Christmas Jazz') {
            genre      = 'Christmas Jazz Lounge';
            mood       = 'Warm, Festive, Cozy';
            instrument = 'Upright Bass, Brushed Drums, Muted Trumpet, Warm Piano';

        } else if (theme === 'Autumn Nostalgic Walk') {
            genre      = 'Acoustic Indie Folk';
            mood       = 'Melancholic, Warm, Nostalgic';
            instrument = 'Acoustic Guitar, Cello, Soft Piano, light Brush Percussion';
            vocal      = 'Warm Male Vocal with emotional depth';

        } else {
            genre      = this.trends.genres[index % this.trends.genres.length];
            mood       = this.trends.moods[index % this.trends.moods.length];
            instrument = this.trends.instruments[index % this.trends.instruments.length];
        }

        vocal = vocal || (isInstrumental
            ? 'Instrumental Only'
            : this.trends.vocals[index % (this.trends.vocals.length - 1)]);

        // 음악 이론 정보
        const theory = this.musicTheory[originalThemeName] || {};

        // 레퍼런스 아티스트 (내부 전용)
        const artists = this.referenceArtists[originalThemeName]?.internal || [];
        const artistRef = artists.length > 0
            ? `Inspired by the sonic era of ${artists.slice(0, 2).join(' and ')}`
            : '';

        // 곡 구조
        const structure = isInstrumental ? this.songStructure.ambient : this.songStructure.longMix;

        // 에너지 커브 (테마별)
        const energyCurves = {
            "OZ CAFE":                "Start warm and intimate, gradually deepen groove by 2:00, maintain steady cozy energy, soft fade after 5:00.",
            "Lofi Study Room":        "Keep energy consistently low and hypnotic throughout. No sudden peaks. Subtle texture shifts every 2 minutes.",
            "Nature/ASMR Sanctuary":  "Begin with silence and single texture, layer organically, peak softness at midpoint, dissolve gently to end.",
            "Classical Performance":  "Open with quiet tension, build dramatically to full orchestral peak at 3:30, resolve with emotional outro.",
            "Tokyo City Pop":         "Funky intro groove by 0:30, full band energy at 1:00, saxophone solo peak at 2:30, smooth outro.",
            "Euro Synth Night":       "Cold open, synth arpeggio builds from 0:00 to 1:00, full driving energy 1:00–4:00, cool descent to end.",
            "Spring Blossom Walk":    "Gentle acoustic intro, vocal enters at 0:45, warm chorus peak at 1:30, harmonica bridge at 3:00, soft close.",
            "Midnight Chill":         "Submerged and dark from the start, subtle beat drops at 1:30, deepest groove at 3:00, slow dissolve.",
            "Seoul Rainy Day":        "Rain texture intro, gentle vocal from 0:30, emotional peak at 2:30, reflective outro with piano only.",
            "Cinematic Orchestral":   "Sparse strings open, brass enters at 1:00, full cinematic peak at 3:30 with choir, resolution and fade.",
            "Midnight Solstice Afro": "Tribal drum call opens, hypnotic layer builds to 2:00, peak ritual energy at 3:30, trance descent to close.",
            "Aura Brazilian Bounce":  "Hard drop from 0:00, maximum energy 0:30–3:00, brief breakdown at 2:00, final drop and hard stop.",
            "Deep Sleep Therapy":     "Begin at near silence, deepen slowly over 5 minutes, maintain still plateau, never increase energy.",
            "Neo Soul Groove":        "Warm intro with Rhodes, vocal groove settles at 0:45, peak soulful expression at 2:30, silky outro.",
            "Funk Groove Session":    "Tight drum intro, full band pocket groove at 0:15, brass peak at 2:00, breakdown and final hit.",
            "Berlin Minimal":         "Single pulse opens, cold layers add every 90 seconds, peak mechanical density at 4:00, stripped close.",
            "Cozy Acoustic Evening":  "Single guitar opens, second instrument joins at 1:00, full warmth at 2:00, fingerpicked fade to silence.",
            "Winter Christmas Jazz":  "Festive intro brush drums, piano melody at 0:20, full warm band at 1:00, joyful swing peak at 2:30.",
            "Autumn Nostalgic Walk":  "Lone guitar opens with melancholy, vocal enters at 0:40, emotional peak at 2:00, quiet nostalgic close."
        };

        // 공간감/믹싱 지시 (테마별)
        const mixingDirectives = {
            "OZ CAFE":                "Warm analog mixing, slight room reverb suggesting intimate cafe space, vinyl warmth on highs, upright bass centered.",
            "Lofi Study Room":        "Lo-fi tape saturation, vinyl crackle layer, slightly muffled highs, mono-leaning drum samples, cozy bedroom acoustics.",
            "Nature/ASMR Sanctuary":  "Wide binaural stereo field, natural room decay, ASMR-quality detail on textures, zero compression on transients.",
            "Classical Performance":  "Concert hall reverb (2.5s decay), wide orchestral stereo spread, dynamic range fully preserved, cinema-quality mastering.",
            "Tokyo City Pop":         "Warm 80s analog board mix, chorus on guitars, lush stereo reverb on vocals, punchy disco-era compression.",
            "Euro Synth Night":       "Wide stereo synth layers, gated reverb on snare, pumping sidechain compression, crisp high-end, deep sub bass.",
            "Spring Blossom Walk":    "Open outdoor acoustics, natural reverb suggesting a park, breathy vocal presence, bright acoustic guitar air.",
            "Midnight Chill":         "Deep sub bass centered, atmospheric pads wide-panned, sparse midrange, dark EQ with rolled-off highs.",
            "Seoul Rainy Day":        "Intimate close-mic vocal, soft room reverb, rain texture layered subtly in background, warm analog mastering.",
            "Cinematic Orchestral":   "Epic stage reverb, dynamic LUFS mastering for dramatic impact, wide strings, centered brass and timpani.",
            "Midnight Solstice Afro": "Deep sub centered, tribal percussion panned wide, hypnotic synth reverb tails, club-ready mastering.",
            "Aura Brazilian Bounce":  "Punching 808 sub, distorted mid-range texture, bright whistles hard-panned, loud mastering for streaming.",
            "Deep Sleep Therapy":     "Ultra-wide stereo, extremely soft mastering (-20 LUFS), zero transients, smooth pad crossfades only.",
            "Neo Soul Groove":        "Warm analog console sound, close Rhodes presence, lush string reverb, silky vocal compression.",
            "Funk Groove Session":    "Punchy room sound, tight drum transients, bright brass presence, slap bass centered, ensemble width.",
            "Berlin Minimal":         "Dry industrial acoustics, minimal reverb, cold clinical EQ, sub bass dominant, sterile precision mastering.",
            "Cozy Acoustic Evening":  "Small room natural reverb, intimate mic placement feel, warm low-mid presence, gentle mastering.",
            "Winter Christmas Jazz":  "Warm studio reverb, slightly ambient room, festive brightness on bells, vintage analog warmth.",
            "Autumn Nostalgic Walk":  "Soft room reverb, natural acoustic space, melancholic low-mid warmth, gentle tape saturation."
        };

        // Negative prompt (공통 + 테마별 추가)
        const negativeBase = "Avoid: abrupt endings, clipping, distortion, out-of-key notes, tempo inconsistency, muddy low-end, harsh digital artifacts, sudden silence.";
        const negativeExtra = {
            "Deep Sleep Therapy":     "Avoid: any sudden loud sounds, percussive transients, tempo changes, or anything that could cause waking.",
            "Berlin Minimal":         "Avoid: melodic warmth, organic instruments, major key progressions, or any emotional uplift.",
            "Aura Brazilian Bounce":  "Avoid: slow sections, melodic softness, or any reduction in energy.",
            "Classical Performance":  "Avoid: electronic elements, modern production techniques, or synthetic sounds of any kind.",
            "Nature/ASMR Sanctuary":  "Avoid: any synthetic sounds, electronic beats, or artificial reverb artifacts."
        };
        const negativePrompt = negativeExtra[originalThemeName]
            ? `${negativeBase} ${negativeExtra[originalThemeName]}`
            : negativeBase;

        const energyCurve    = energyCurves[originalThemeName]    || "Build gradually, maintain steady energy, fade smoothly at the end.";
        const mixingDirective = mixingDirectives[originalThemeName] || "Wide stereo field, room ambience, cinema-quality mastering.";

        // 최종 Lyria 3 프롬프트
        const fullPrompt = [
            `As the world's best and most versatile music composer, create a masterpiece using Lyria 3:`,
            `Genre: ${genre}.`,
            `Mood: ${mood}.`,
            `Instruments: ${instrument}.`,
            `Vocal: ${vocal}.`,
            theory.bpm ? `BPM: ${theory.bpm}, Key: ${theory.key}, Time Signature: ${theory.timeSignature}, Feel: ${theory.feel}.` : '',
            `Structure: ${structure}.`,
            `Energy Curve: ${energyCurve}`,
            `Mixing & Space: ${mixingDirective}`,
            artistRef ? `${artistRef}.` : '',
            `Theme: ${theme}.`,
            `${negativePrompt}`,
            `High fidelity, professional studio quality, streaming-ready master.`
        ].filter(Boolean).join(' ');

        const lyrics           = isInstrumental ? null : (this.lyricTemplates[originalThemeName] || 'Instrumental.');
        const storytellingTitle = isInstrumental
            ? `[Instrumental] ${this.generateStorytellingTitle({ genre, mood, theme: originalThemeName, index })}`
            : this.generateStorytellingTitle({ genre, mood, theme: originalThemeName, index });
        const shortsHook       = this.generateShortsHook(originalThemeName, index);
        const seoTags          = this.generateSEOTags(originalThemeName, genre, mood);
        const thumbnailPrompt  = this.generateThumbnailPrompt(originalThemeName);
        const engagementQ      = this.generateEngagementQuestion(originalThemeName);

        return {
            fullPrompt,
            lyrics,
            storytellingTitle,
            shortsHook,
            seoTags,
            thumbnailPrompt,
            engagementQuestion: engagementQ,
            components: { genre, mood, instrument, vocal, theme: originalThemeName, isInstrumental }
        };
    }

    // ── 스토리텔링 타이틀 ─────────────────────
    generateStorytellingTitle({ genre, mood, theme, index = 0 }) {
        const subTitles = this.trackSubTitles[theme] || [];
        const uniqueSub = subTitles.length > 0 ? subTitles[index % subTitles.length] : `${genre} Mood`;

        const scenarios = {
            "OZ CAFE":                `[OZ] | Cafe & Study | - Cozy ${uniqueSub} 🎧`,
            "Lofi Study Room":        `[OZ] | Lofi Study | - ${uniqueSub} 📚`,
            "Nature/ASMR Sanctuary":  `[OZ] | Healing ASMR | - ${uniqueSub} 🌿`,
            "Classical Performance":  `[OZ] | Classical | - ${uniqueSub} 🎹`,
            "Tokyo City Pop":         `[OZ] | City Pop | - ${uniqueSub} 🌆`,
            "Euro Synth Night":       `[OZ] | Night Drive | - ${uniqueSub} 🏎️`,
            "Spring Blossom Walk":    `[OZ] | Spring | - ${uniqueSub} 🌸`,
            "Midnight Chill":         `[OZ] | Midnight | - ${uniqueSub} 🌙`,
            "Seoul Rainy Day":        `[OZ] | 감성 | - ${uniqueSub} 🌧️`,
            "Cinematic Orchestral":   `[OZ] | Cinematic | - ${uniqueSub} 🎻`,
            "Midnight Solstice Afro": `[OZ] | Solstice | - ${uniqueSub} 🌙`,
            "Aura Brazilian Bounce":  `[OZ] | Aura | - ${uniqueSub} ⚡`,
            "Deep Sleep Therapy":     `[OZ] | Sleep | - ${uniqueSub} 😴`,
            "Autumn Nostalgic Walk":  `[OZ] | Autumn | - ${uniqueSub} 🍂`
        };

        return scenarios[theme] || `[OZ] ${theme} - ${uniqueSub}`;
    }

    // ── 바이럴 타이틀 ─────────────────────────
    generateViralTitle(components) {
        const { genre, mood, theme, isInstrumental } = components;

        // ── 테마별 변수맵 ─────────────────────────
        const themeVarMap = {
            "OZ CAFE":                { situation: 'Deep Study',        benefit: 'Boost Your Focus',     target: 'Students & Remote Workers' },
            "Lofi Study Room":        { situation: 'Study Session',      benefit: 'Enter Flow State',     target: 'Students & Creators' },
            "Nature/ASMR Sanctuary":  { situation: 'Stress Relief',      benefit: 'Heal Your Soul',       target: 'Tired Minds' },
            "Classical Performance":  { situation: 'Deep Focus',         benefit: 'Sharpen Your Mind',    target: 'Thinkers & Readers' },
            "Tokyo City Pop":         { situation: 'Night Drive',        benefit: 'Time Travel to Tokyo', target: 'City Pop Lovers' },
            "Euro Synth Night":       { situation: 'Late Night Coding',  benefit: 'Feel the Energy',      target: 'Night Owls & Coders' },
            "Spring Blossom Walk":    { situation: 'Spring Walk',        benefit: 'Feel the Season',      target: 'Dreamers & Couples' },
            "Midnight Chill":         { situation: 'Late Night Session', benefit: 'Calm Your Mind',       target: 'Night Owls' },
            "Seoul Rainy Day":        { situation: 'Rainy Day',          benefit: 'Feel Every Emotion',   target: 'K-Indie Lovers' },
            "Cinematic Orchestral":   { situation: 'Epic Focus',         benefit: 'Think in Widescreen',  target: 'Visionaries & Readers' },
            "Midnight Solstice Afro": { situation: 'Late Night Dance',   benefit: 'Connect Your Soul',    target: 'Afro House Lovers' },
            "Aura Brazilian Bounce":  { situation: 'Workout Session',    benefit: 'Unlock Max Energy',    target: 'Gym & Hustle Culture' },
            "Deep Sleep Therapy":     { situation: 'Sleep Time',         benefit: 'Fall Asleep Fast',     target: 'Insomnia Sufferers' },
            "Neo Soul Groove":        { situation: 'Friday Night',       benefit: 'Feel the Soul',        target: 'R&B & Soul Lovers' },
            "Funk Groove Session":    { situation: 'Groove Session',     benefit: 'Get in the Pocket',    target: 'Funk & Jazz Lovers' },
            "Berlin Minimal":         { situation: 'Deep Work',          benefit: 'Hyper Focus',          target: 'Coders & Designers' },
            "Cozy Acoustic Evening":  { situation: 'Evening Wind-Down',  benefit: 'Find Your Peace',      target: 'Homebodies & Readers' },
            "Winter Christmas Jazz":  { situation: 'Holiday Season',     benefit: 'Feel the Warmth',      target: 'Christmas Lovers' },
            "Autumn Nostalgic Walk":  { situation: 'Autumn Walk',        benefit: 'Embrace the Nostalgia','target': 'Reflective Souls' },
        };

        const vars = themeVarMap[theme] || {
            situation: 'Relaxation', benefit: 'Relieve Stress', target: 'Work & Study'
        };

        // ── CTR 피드백 — lessons_learned 기반 가중 템플릿 선택 ──
        const ctrHistory = lessons_learned.ctr_history || {};
        let templateIdx;

        if (Object.keys(ctrHistory).length > 0) {
            // 성과 기록 있으면 가중 선택
            const weights = this.viralTitleTemplates.map((_, i) => {
                const key = `template_${i}`;
                return (ctrHistory[key] || 0) + 1; // 최소 1 보장
            });
            const total = weights.reduce((a, b) => a + b, 0);
            let rand = Math.random() * total;
            templateIdx = 0;
            for (let i = 0; i < weights.length; i++) {
                rand -= weights[i];
                if (rand <= 0) { templateIdx = i; break; }
            }
        } else {
            templateIdx = Math.floor(Math.random() * this.viralTitleTemplates.length);
        }

        const template = this.viralTitleTemplates[templateIdx];

        // ── 변수 치환 ─────────────────────────────
        const map = {
            '{Genre}':     genre.replace(/1960s /g, ''),
            '{Theme}':     theme.replace(/ style/g, ''),
            '{Mood}':      mood.split(',')[0].trim(),
            '{Situation}': vars.situation,
            '{Benefit}':   vars.benefit,
            '{Target}':    vars.target,
        };

        let title = template;
        for (const [key, val] of Object.entries(map)) {
            title = title.replace(key, val);
        }

        // ── 이모지 A/B 테스트 ─────────────────────
        // 짝수 index → 이모지 포함 / 홀수 index → 이모지 제거
        const useEmoji = (templateIdx % 2 === 0);
        if (!useEmoji) {
            title = title.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
        }

        if (isInstrumental && !title.includes('Instrumental')) {
            title += ' [Instrumental]';
        }

        // templateIdx를 반환값에 포함해 CTR 기록에 활용
        const finalTitle = title.substring(0, 100);

        return { title: finalTitle, templateIdx, hasEmoji: useEmoji };
    }

    // ── CTR 성과 기록 (어떤 템플릿이 성과 좋았는지) ─
    recordCTR(templateIdx, clickThroughRate) {
        const ctrHistory = lessons_learned.ctr_history || {};
        const key = `template_${templateIdx}`;
        // 누적 평균 업데이트
        const prev = ctrHistory[key] || 0;
        ctrHistory[key] = Math.round(((prev + clickThroughRate) / 2) * 100) / 100;
        this.saveLessons({ ctr_history: ctrHistory });
        console.log(`📊 [CTR] template_${templateIdx} → 누적 CTR: ${ctrHistory[key]}%`);
    }

    // ── Shorts 훅 ─────────────────────────────
    generateShortsHook(theme, index) {
        const hooks = this.shortsHooks[theme] || ['Experience the evolution of sound with OZ 🎧'];
        return hooks[index % hooks.length];
    }

    // ── SEO 태그 ──────────────────────────────
    generateSEOTags(theme, genre, mood) {
        const now  = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1~12

        // ── 1. 계절/월 태그 ───────────────────────
        const seasonMap = {
            12: { season: 'Winter', months: ['December', 'Winter'] },
            1:  { season: 'Winter', months: ['January',  'Winter'] },
            2:  { season: 'Winter', months: ['February', 'Winter'] },
            3:  { season: 'Spring', months: ['March',    'Spring'] },
            4:  { season: 'Spring', months: ['April',    'Spring'] },
            5:  { season: 'Spring', months: ['May',      'Spring'] },
            6:  { season: 'Summer', months: ['June',     'Summer'] },
            7:  { season: 'Summer', months: ['July',     'Summer'] },
            8:  { season: 'Summer', months: ['August',   'Summer'] },
            9:  { season: 'Autumn', months: ['September','Autumn'] },
            10: { season: 'Autumn', months: ['October',  'Autumn'] },
            11: { season: 'Autumn', months: ['November', 'Autumn'] },
        };
        const { season, months } = seasonMap[month];
        const seasonTags = [
            `${season} music ${year}`,
            `${months[0]} BGM`,
            `${season} ${genre}`,
        ];

        // ── 2. 언어별 태그 (테마 기반 자동 선택) ──
        const localTagMap = {
            "Seoul Rainy Day":        ['집중음악', '작업음악', '카페음악', '감성음악', '공부음악', 'BGM', '비오는날음악'],
            "OZ CAFE":                ['카페음악', '공부음악', '작업음악', 'BGM', '집중음악'],
            "Lofi Study Room":        ['공부음악', '집중음악', '로파이', 'BGM', '작업음악'],
            "Tokyo City Pop":         ['シティポップ', '作業用BGM', '勉強用BGM', 'リラックス音楽', 'Tokyo BGM'],
            "Nature/ASMR Sanctuary":  ['힐링음악', '자연의소리', 'ASMR음악', '명상음악', '수면음악'],
            "Deep Sleep Therapy":     ['수면음악', '숙면음악', '불면증음악', '명상음악', '힐링사운드'],
            "Classical Performance":  ['클래식음악', '피아노음악', '오케스트라', '집중음악', '작업음악'],
            "Spring Blossom Walk":    ['봄노래', '벚꽃음악', '산책음악', '감성음악', 'BGM'],
        };
        const localTags = localTagMap[theme] || [];

        // ── 3. 경쟁 채널 벤치마크 키워드 (테마별) ─
        const benchmarkTagMap = {
            "Lofi Study Room":        ['lofi girl', 'chillhop music', 'study with me', 'lofi hip hop', 'beats to study'],
            "OZ CAFE":                ['cafe music', 'jazz cafe', 'coffee shop music', 'study jazz', 'work from cafe'],
            "Nature/ASMR Sanctuary":  ['white noise', 'nature sounds', 'healing frequency', 'sleep sounds', 'asmr nature'],
            "Classical Performance":  ['classical music study', 'piano relaxing', 'orchestral focus', 'classical concentration'],
            "Tokyo City Pop":         ['city pop playlist', 'japanese city pop', 'aesthetic music', 'vaporwave', 'tokyo vibes'],
            "Euro Synth Night":       ['synthwave music', 'retrowave', 'outrun music', 'night drive music', 'cyberpunk music'],
            "Midnight Solstice Afro": ['afro house mix', 'tribal house', 'deep afro', 'afrobeats chill'],
            "Deep Sleep Therapy":     ['sleep music', 'insomnia relief', 'delta waves', 'sleep fast music', 'calm music sleep'],
            "Cinematic Orchestral":   ['epic music', 'cinematic music', 'film score', 'trailer music', 'hans zimmer style'],
            "Aura Brazilian Bounce":  ['phonk music', 'brazilian phonk', 'drift phonk', 'gym phonk', 'aggressive phonk'],
            "Berlin Minimal":         ['minimal techno', 'dark ambient', 'techno focus', 'industrial ambient'],
            "Seoul Rainy Day":        ['korean indie', 'k-indie music', 'korean aesthetic', 'korean cafe music', 'rainy day music'],
            "Neo Soul Groove":        ['neo soul music', 'smooth r&b', 'soul music chill', 'r&b study music'],
            "Spring Blossom Walk":    ['spring music', 'acoustic folk', 'cherry blossom music', 'nature walk music'],
            "Midnight Chill":         ['midnight music', 'late night music', 'chill electronic', 'downtempo music'],
            "Autumn Nostalgic Walk":  ['autumn music', 'fall vibes', 'melancholic music', 'nostalgic acoustic'],
            "Winter Christmas Jazz":  ['christmas jazz', 'holiday music', 'winter cafe music', 'christmas lounge'],
            "Cozy Acoustic Evening":  ['acoustic evening', 'cozy music', 'folk music relax', 'fireplace music'],
            "Funk Groove Session":    ['funk music', 'jazz funk', 'groove music', 'electric funk'],
        };
        const benchmarkTags = benchmarkTagMap[theme] || ['background music', 'focus music', 'relaxing music'];

        // ── 4. lessons_learned 성공 태그 연동 ──────
        const successTags = [];
        const successGenres = lessons_learned.successful_genres || [];
        successGenres.forEach(sg => {
            if (!successTags.includes(`${sg} music`)) {
                successTags.push(`${sg} music`);
            }
        });

        // ── 5. 기본 + 의도 태그 ───────────────────
        const baseTags = [
            'AI Music',
            'Oz AI Artist',
            `${year} Music`,
            'No Copyright AI Music',
        ];
        const intentTags = [
            `${genre} for study`,
            `Relaxing ${genre} music`,
            `${mood} vibes`,
            'Background Music',
            'Study Music',
            'Focus Music',
        ];

        // ── 6. 전체 합산 + 중복 제거 + 20개 제한 ──
        const allTags = [
            ...baseTags,
            ...intentTags,
            ...seasonTags,
            ...localTags,
            ...benchmarkTags,
            ...successTags,
        ];

        const unique = [...new Set(allTags)];
        return unique.slice(0, 20);
    }

    // ── 썸네일 프롬프트 ───────────────────────
    generateThumbnailPrompt(theme) {
        const concept = this.thumbnailConcepts[theme];
        if (!concept) return null;
        return [
            `Cinematic YouTube thumbnail:`,
            `${concept.style}.`,
            `Bold text overlay: "${concept.text}".`,
            `Color palette: ${concept.colorPalette.join(', ')}.`,
            `16:9 ratio, 1280x720px, ultra high quality.`
        ].join(' ');
    }

    // ── 참여 유도 질문 (테마별 맞춤) ───────────
    generateEngagementQuestion(theme = null) {
        const themed = {
            "OZ CAFE": [
                '☕ What\'s your go-to cafe drink while working? Tell me below!',
                '💬 If you could work from any cafe in the world, where would it be?',
                '🎷 Do you prefer jazz with or without vocals while studying?',
                '📖 What are you reading or studying today in your virtual cafe?'
            ],
            "Lofi Study Room": [
                '📚 What subject are you studying today? Drop it below!',
                '🌧️ Do you study better with rain sounds or pure lo-fi beats?',
                '⏰ How many hours do you study per day? Let\'s compare!',
                '💡 What\'s your best study tip? Share it with everyone!'
            ],
            "Nature/ASMR Sanctuary": [
                '🌿 Which nature sound relaxes you the most — rain, forest, or ocean?',
                '😌 What stress are you healing from today? You don\'t have to answer.',
                '🌱 Where is your personal sanctuary in real life?',
                '🦋 What animal sound would make this mix even more perfect?'
            ],
            "Classical Performance": [
                '🎹 Do you play any instruments? Which one?',
                '🎻 Who is your all-time favorite classical composer?',
                '✨ What emotion does this piece bring up for you?',
                '🎼 Classical for focus, or do you prefer silence?'
            ],
            "Tokyo City Pop": [
                '🇯🇵 Have you ever been to Tokyo? Dream destination?',
                '🌆 What does this music make you picture in your mind?',
                '🍜 Best Japanese food you\'ve ever had? Or want to try?',
                '📼 80s or 90s — which era had the better music vibe?'
            ],
            "Euro Synth Night": [
                '🏎️ Night drive or city walk — how do you enjoy this music?',
                '🌃 Which city has the best nighttime vibe in your opinion?',
                '🎮 Late-night gaming or late-night coding? Which team are you?',
                '🔌 Synthwave or Future Bass — which is your favorite?'
            ],
            "Spring Blossom Walk": [
                '🌸 What does spring mean to you? One word or one sentence.',
                '💑 Who would you take on a cherry blossom walk?',
                '🌼 Favorite season and why? I\'m team spring — you?',
                '🎸 Acoustic guitar or piano — which touches your heart more?'
            ],
            "Seoul Rainy Day": [
                '🌧️ 비 오는 날 가장 생각나는 사람이 있나요?',
                '☕ 비 오는 날 당신의 루틴은 뭔가요? 커피? 영화?',
                '🎵 이 음악을 들으면 어떤 장면이 떠오르나요?',
                '📍 지금 어디서 듣고 계세요? 도시를 알려주세요!'
            ],
            "Midnight Chill": [
                '🌙 What keeps you up past midnight? Work, music, or thoughts?',
                '🎧 Headphones or speakers for late-night listening?',
                '💭 What\'s on your mind at 3AM? No judgment here.',
                '🌌 Night owl or early bird — be honest!'
            ],
            "Cinematic Orchestral": [
                '🎬 If this were a movie score, what scene would it play in?',
                '🎻 What\'s your favorite film soundtrack of all time?',
                '🌍 Which landscape does this music paint in your imagination?',
                '🏆 Does music make you more productive or more emotional?'
            ],
            "Midnight Solstice Afro": [
                '🌍 Where in Africa would you love to visit someday?',
                '🥁 Do you feel the tribal rhythm in your body right now?',
                '🌙 What does the midnight hour mean to you — energy or peace?',
                '💃 Dance floor or headphone listener — which one are you?'
            ],
            "Deep Sleep Therapy": [
                '😴 What time do you usually fall asleep? Any sleep tips?',
                '🌙 Do you listen to music while falling asleep?',
                '💤 What\'s your sleep routine? Share your best tip!',
                '🧠 Do you dream more vividly with sleep music on?'
            ]
        };

        // 테마별 질문 있으면 사용, 없으면 공통 풀
        const pool = themed[theme] || [
            '💬 Question of the Day: What mood are you in right now?',
            '🌍 Where are you listening from today? Drop your city below!',
            '☕ What\'s your favorite drink while listening to this mix?',
            '✨ If this music was a place, where would it be?',
            '🎧 How did you find this channel? Algorithm or a friend?',
            '🌙 What are you working on while this plays in the background?',
            '🎵 Which part of this mix is your favorite so far?',
            '📚 Tell me what you\'re studying today — I\'m curious!',
            '🌿 What does this music make you feel? Drop a word below.',
            '🔁 Do you loop music when you work? Or do you need silence?'
        ];

        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ── 챕터 마커 생성 (1시간 루프 기준) ────────
    generateChapterMarkers(theme, totalMinutes = 60) {
        // 테마별 챕터 구조 정의
        const structures = {
            "OZ CAFE": [
                { label: '☕ Opening — First Sip',        duration: 4 },
                { label: '🎷 Morning Jazz — Warm Up',     duration: 8 },
                { label: '📖 Deep Focus — Groove In',     duration: 10 },
                { label: '🎹 Piano Solo Interlude',        duration: 6 },
                { label: '🌧️ Rainy Window — Mid Session', duration: 10 },
                { label: '🎺 Trumpet & Bass — Energy Up', duration: 8 },
                { label: '📚 Final Focus — Last Push',    duration: 10 },
                { label: '🌙 Closing Time — Last Cup',    duration: 4 }
            ],
            "Lofi Study Room": [
                { label: '📖 Boot Up — Setting the Mood', duration: 5 },
                { label: '✏️ Focus Mode On',              duration: 10 },
                { label: '🎧 Deep Zone — Flow State',     duration: 12 },
                { label: '💤 Soft Break — Breathe',       duration: 5 },
                { label: '📚 Back to Study — Final Push', duration: 12 },
                { label: '🌙 Wind Down — Pack Up',        duration: 8 },
                { label: '⭐ Outro — See You Tomorrow',   duration: 8 }
            ],
            "Nature/ASMR Sanctuary": [
                { label: '🌱 Awakening — Forest at Dawn', duration: 6 },
                { label: '💧 Stream Flow — Gentle Waters',duration: 10 },
                { label: '🌬️ Wind Through Leaves',        duration: 8 },
                { label: '🦜 Bird Song Interlude',         duration: 6 },
                { label: '🌿 Deep Forest — Full Immersion',duration: 12 },
                { label: '🌧️ Rain Arrives — ASMR Peak',  duration: 10 },
                { label: '🌅 Sunset — Return to Silence', duration: 8 }
            ],
            "Classical Performance": [
                { label: '🎼 Overture — Grand Opening',   duration: 5 },
                { label: '🎹 Piano Movement I — Allegro', duration: 10 },
                { label: '🎻 Strings Movement II — Adagio',duration: 12 },
                { label: '🎺 Brass Interlude — Forte',    duration: 6 },
                { label: '🎶 Movement III — Scherzo',     duration: 10 },
                { label: '🌊 Finale — Grand Crescendo',   duration: 12 },
                { label: '🎭 Curtain Call — Outro',        duration: 5 }
            ],
            "Euro Synth Night": [
                { label: '🌆 Ignition — City Lights On',  duration: 4 },
                { label: '🏎️ Night Drive — Full Speed',   duration: 10 },
                { label: '🌃 Neon Boulevard — Groove',    duration: 10 },
                { label: '⚡ Synth Solo — Drop',           duration: 6 },
                { label: '🔊 Peak Hour — Max Energy',     duration: 12 },
                { label: '🌙 After Dark — Cool Down',     duration: 10 },
                { label: '🌅 Dawn Signal — Outro',        duration: 8 }
            ],
            "Tokyo City Pop": [
                { label: '🌸 Shibuya Morning — Intro',   duration: 4 },
                { label: '🚃 Yamanote Line — Groove',    duration: 10 },
                { label: '🌆 Neon Afternoon — Peak',     duration: 10 },
                { label: '🎷 City Jazz Break',            duration: 6 },
                { label: '🌃 Shinjuku Night — Deep',     duration: 12 },
                { label: '🎶 Late Night Cruise',          duration: 10 },
                { label: '🌅 Tokyo Dawn — Outro',        duration: 8 }
            ],
            "Seoul Rainy Day": [
                { label: '🌧️ 비가 내리기 시작해 — Intro', duration: 5 },
                { label: '☕ 따뜻한 아메리카노 — Theme A', duration: 10 },
                { label: '🎵 창밖을 바라보며 — Deep',     duration: 12 },
                { label: '🎹 피아노 인터루드',             duration: 6 },
                { label: '💭 그리움의 시간 — Emotional',  duration: 12 },
                { label: '🌈 빗속의 위로 — Resolution',   duration: 10 },
                { label: '🌙 빗소리만 남아 — Outro',      duration: 5 }
            ],
            "Midnight Solstice Afro": [
                { label: '🌙 Tribal Call — Summoning',   duration: 4 },
                { label: '🥁 Drum Circle — Awakening',   duration: 8 },
                { label: '🌍 Ancestral Groove — Rise',   duration: 12 },
                { label: '✨ Solstice Peak — Hypnosis',  duration: 10 },
                { label: '🔥 Ritual Dance — Full Fire',  duration: 12 },
                { label: '🌊 Trance Descent — Fade',     duration: 8 },
                { label: '🌅 Dawn Ritual — Outro',       duration: 6 }
            ],
            "Deep Sleep Therapy": [
                { label: '😌 Settling In — Body Relax',  duration: 8 },
                { label: '🌙 Drift Begin — Mind Slow',   duration: 10 },
                { label: '💤 Delta Wave — Deep Theta',   duration: 15 },
                { label: '🌊 Ocean of Sleep — Core',     duration: 15 },
                { label: '⭐ REM Support — Dreaming',    duration: 12 }
            ]
        };

        // 기본 구조 (테마 없을 경우)
        const defaultStructure = [
            { label: '🎵 Intro — Setting the Mood',    duration: 5 },
            { label: '🎶 Theme A — Main Groove',        duration: 12 },
            { label: '🎸 Development — Building Up',    duration: 10 },
            { label: '✨ Interlude — Soft Break',        duration: 6 },
            { label: '🔊 Theme B — Peak Energy',        duration: 12 },
            { label: '🌙 Cool Down — Winding Back',     duration: 10 },
            { label: '🎼 Outro — Fade to Silence',      duration: 5 }
        ];

        const chapters = structures[theme] || defaultStructure;

        // 총 시간에 맞게 duration 비율 조정
        const totalDefined = chapters.reduce((s, c) => s + c.duration, 0);
        const scale = totalMinutes / totalDefined;

        let currentSeconds = 0;
        const markers = chapters.map(chapter => {
            const mm = Math.floor(currentSeconds / 60);
            const ss = String(currentSeconds % 60).padStart(2, '0');
            const timestamp = `${mm}:${ss}`;
            currentSeconds += Math.round(chapter.duration * scale * 60);
            return `${timestamp} ${chapter.label}`;
        });

        return markers;
    }

    // ── 유튜브 본문 설명 자동 생성 ───────────────
    generateVideoDescription({ theme, genre, mood, storytellingTitle, seoTags, chapterMarkers, isInstrumental }) {
        const year = new Date().getFullYear();

        // 테마별 오프닝 문구
        const openings = {
            "OZ CAFE":
                `Welcome to OZ CAFE — your virtual jazz cafe for deep focus and creative work. ☕\nStep inside, grab your favorite drink, and let the music carry you.`,
            "Lofi Study Room":
                `🎧 Welcome to the OZ Lofi Study Room.\nPut on your headphones, open your books, and let the beats do the rest.`,
            "Nature/ASMR Sanctuary":
                `🌿 Step away from the noise. This is your Nature Sanctuary — a healing space crafted with organic soundscapes and gentle ambient music.`,
            "Classical Performance":
                `🎹 Welcome to a world of timeless elegance.\nSit back, close your eyes, and let the orchestra take you somewhere beyond words.`,
            "Tokyo City Pop":
                `🌆 Close your eyes. You're in Tokyo, 1983.\nNeon lights, warm nights, and a groove that never gets old. Welcome to OZ City Pop.`,
            "Euro Synth Night":
                `🏎️ The city never sleeps — and neither does this beat.\nCrank up the volume and hit the neon highway with OZ Synthwave.`,
            "Seoul Rainy Day":
                `🌧️ 오늘 비가 내리는 날, 당신 곁에 함께 하고 싶었어요.\n따뜻한 음료 한 잔 들고 창밖을 바라보세요.`,
            "Midnight Solstice Afro":
                `🌙 The drums call. The ancestors answer.\nLet the hypnotic pulse of Afro House carry you into the midnight ritual.`,
            "Cinematic Orchestral":
                `🎻 Some music doesn't just play — it paints.\nThis orchestral journey was built for those who think in widescreen.`,
            "Spring Blossom Walk":
                `🌸 Take a slow walk under the cherry blossoms.\nThis acoustic folk mix is dedicated to every quiet, beautiful spring afternoon.`,
            "Deep Sleep Therapy":
                `😴 Designed for deep, restorative sleep.\nLet the delta-wave tones guide your mind into stillness. Sweet dreams.`,
            "Midnight Chill":
                `🌙 For the ones still awake past midnight — this one's for you.\nNo rush. No noise. Just the vibe.`
        };

        const opening = openings[theme] || `🎵 Welcome to another OZ Music experience.\nSit back, relax, and enjoy the journey.`;

        // 챕터 마커 섹션
        const chaptersSection = chapterMarkers && chapterMarkers.length > 0
            ? `\n━━━━━━━━━━━━━━━━━━━━━━━━\n🕐 CHAPTERS\n━━━━━━━━━━━━━━━━━━━━━━━━\n${chapterMarkers.join('\n')}`
            : '';

        // 음악 정보 섹션
        const theory = this.musicTheory[theme] || {};
        const musicInfo = [
            `🎵 Genre   : ${genre}`,
            `🎭 Mood    : ${mood}`,
            theory.bpm ? `🥁 BPM     : ${theory.bpm}` : null,
            theory.key ? `🎼 Key     : ${theory.key}` : null,
            `🎤 Vocal   : ${isInstrumental ? 'Instrumental Only' : 'Vocal Included'}`
        ].filter(Boolean).join('\n');

        // 태그 섹션 (# 형식)
        const hashTags = seoTags
            .map(t => '#' + t.replace(/\s+/g, '').replace(/&/g, 'and'))
            .join(' ');

        // 구독 유도 CTA
        const cta = [
            `━━━━━━━━━━━━━━━━━━━━━━━━`,
            `🔔 SUBSCRIBE for weekly mixes → @OzMusicChannel`,
            `👍 If this mix helped you focus or relax, leave a LIKE — it means the world!`,
            `💬 Drop a comment below — we read every single one.`,
            `━━━━━━━━━━━━━━━━━━━━━━━━`
        ].join('\n');

        // 저작권 고지
        const copyright = [
            `© ${year} OZ Music — All compositions generated by AI (Lyria 3).`,
            `✅ Free to use for personal, non-commercial listening.`,
            `❌ Re-upload or re-monetization without permission is prohibited.`
        ].join('\n');

        // 최종 조립
        const description = [
            opening,
            `\n━━━━━━━━━━━━━━━━━━━━━━━━`,
            `🎶 NOW PLAYING: ${storytellingTitle}`,
            `━━━━━━━━━━━━━━━━━━━━━━━━`,
            chaptersSection,
            `\n━━━━━━━━━━━━━━━━━━━━━━━━`,
            `🎛️  MUSIC INFO`,
            `━━━━━━━━━━━━━━━━━━━━━━━━`,
            musicInfo,
            `\n${cta}`,
            `\n${hashTags}`,
            `\n${copyright}`
        ].join('\n');

        return description;
    }
}

module.exports = new PromptEngineer();