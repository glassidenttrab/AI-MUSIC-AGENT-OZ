const { generateMusic } = require('./generate_music');

async function runTest() {
    console.log("=== 테스트 3분 트랙 생성 시작 ===");
    try {
        const promptText = "vintage 1960s jazz blues, instrumental, slow tempo, saxophone, piano, double bass";
        const filename = `test_jazz_3min_${Date.now()}.mp3`;
        
        // duration=180 (3분), 가사=null, 카테고리="Test"
        const outputPath = await generateMusic(promptText, filename, 180, null, "Test");
        
        console.log(`\n🎉 요약: 테스트 음악이 성공적으로 생성되었습니다.`);
        console.log(`경로: ${outputPath}`);
    } catch (err) {
        console.error("테스트 실패:", err);
    }
}

runTest();
