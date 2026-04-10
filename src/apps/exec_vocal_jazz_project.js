const { generateHybridContent } = require('./generate_1hour_loop');

async function startProject() {
    while (true) {
        console.log(`\n🚀 [OZ] VOCAL PROJECT 엔진 가동 중... (${new Date().toLocaleString()})`);
        try {
            // OZ CAFE 보컬(Vocal) 테마: 가사가 포함된 1시간 컴필레이션 생성
            // 매개변수: 테마, isInstrumental=false (보컬), 목표 분수(60), 곡 수(10)
            const result = await generateHybridContent("OZ CAFE", false, 60, 10);
            console.log("\n==================================================");
            console.log("🎊 [OZ] OZ CAFE VOCAL PROJECT COMPLETED!");
            console.log("👉 Video Path:", result.loop.path);
            console.log("==================================================\n");
            break; // 성공 시 루프 종료
        } catch (err) {
            console.error("\n❌ [OZ] VOCAL PROJECT FAILED:", err.message);
            console.log("⏱️ 60초 대기 후 자동으로 엔진을 재점화합니다...");
            await new Promise(r => setTimeout(r, 60000));
        }
    }
}

startProject();
