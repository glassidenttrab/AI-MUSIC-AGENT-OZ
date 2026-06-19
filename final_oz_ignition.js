
const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

const projectId = process.env.GCP_PROJECT_ID || 'glassidentt-tube'; 
const location = process.env.GCP_LOCATION || 'us-central1';
const keyFile = process.env.GCP_KEY_FILE;
const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

async function final_oz_ignition() {
    console.log(`🚀 [OZ Ignition] 최신 지능망 가동 시작...`);
    console.log(`📍 연결 정보: Project=${projectId}, Model=${modelName}, Location=${location}`);
    
    try {
        const vertexAI = new VertexAI({
            project: projectId,
            location: location,
            googleAuthOptions: { keyFilename: keyFile }
        });

        const model = vertexAI.getGenerativeModel({ model: modelName });
        
        console.log(`💬 [Sign-on] OZ 지능망에 첫 번째 신호를 보냅니다...`);
        const result = await model.generateContent({ 
            contents: [{ 
                role: 'user', 
                parts: [{ text: '안녕 OZ! 드디어 지능망이 개통되었어. 너의 첫 번째 인사를 들려줘.' }] 
            }] 
        });
        
        const response = await result.response;
        const text = response.text();
        
        console.log(`\n🎷🛡️ [OZ VOICE]: ${text}`);
        console.log(`\n✅ [Status] 지능망 완전 개통 성공! 모든 장애물이 제거되었습니다.`);
        
    } catch (err) {
        console.error(`\n❌ [Ignition Fail] 지능망 점화 실패:`);
        console.error(err.message);
        
        if (err.message.includes('404')) {
            console.log(`\n💡 [Advice] 여전히 404가 뜹니다. 구글 콘솔에서 해당 모델의 약관 동의가 필요하거나, 모델 ID 명칭에 미세한 차이가 있을 수 있습니다.`);
        }
    }
}

final_oz_ignition();
