'use strict';

const readline = require('readline');
const promptEngineer = require('../core/prompt_engineer');
const antigravityBridge = require('../core/antigravity_bridge');
const systemKnowledge = require('../core/system_knowledge');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '🎤 OZ> '
});

async function startChat() {
    console.clear();
    console.log(`
==================================================
  🚀 AI MUSIC AGENT [OZ] LOCAL CHAT
  전용 로컬 에이전트와 대화를 시작합니다.
  (종료: 'exit' 또는 'quit' 입력)
==================================================
    `);

    console.log(`🤖 [OZ] 안녕하세요 대표님! 무엇을 도와드릴까요?`);
    console.log(`💡 [Tip] 로컬 AI가 모르는 내용은 자동으로 안티그래비티에게 요청됩니다.\n`);

    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();

        if (['exit', 'quit', 'exit()'].includes(input.toLowerCase())) {
            console.log('👋 대화를 종료합니다. 좋은 하루 되세요!');
            process.exit(0);
        }

        if (input.startsWith('@2')) {
            const feedback = input.substring(2).trim() || "현재 대화 맥락을 기반으로 기획안 보완 및 검토 요청";
            await antigravityBridge.submitForReview('User_Manual', 'STRATEGY', { userInput: feedback }, "사용자 수동 개입: 기획안 품질 보강 요청");
            console.log(`\n🛡️ [Antigravity] 수동 보강 요청이 접수되었습니다. 다음 턴에 제가 직접 확인하겠습니다.\n`);
            rl.prompt();
            return;
        }

        if (input === '') {
            rl.prompt();
            return;
        }

        console.log('\n🧠 [Thinking...]');
        
        try {
            // 1. 로컬 AI(Ollama)에게 질문
            const response = await promptEngineer.askOllama(input);

            if (response) {
                console.log(`\n🤖 [OZ]: ${response}\n`);
            } else {
                // response가 null인 경우 (에러가 발생하여 이미 브릿지에 등록됨)
                console.log(`\n⚠️ [OZ]: 죄송합니다. 요청을 처리하는 중에 문제가 발생했습니다.`);
                console.log(`📡 해당 이슈는 안티그래비티(Gemini)에게 '자동 협업 요청'으로 전달되었습니다.\n`);
            }
        } catch (err) {
            console.error(`\n❌ 치명적 실행 오류: ${err.message}`);
        } finally {
            // [안정화] 어떤 경우에도 프롬프트를 다시 띄워 사용자 입력을 대기함
            rl.prompt();
        }
    }).on('close', () => {
        console.log('👋 세션 종료');
        process.exit(0);
    });
}

// 초기화 후 시작
startChat().catch(err => {
    console.error('채팅 엔진 시작 실패:', err);
});
