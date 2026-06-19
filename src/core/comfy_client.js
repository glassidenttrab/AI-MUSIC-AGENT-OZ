const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

/**
 * ComfyUI 로컬 API 클라이언트
 */
class ComfyClient {
    constructor(baseUrl = 'http://localhost:8188') {
        this.baseUrl = baseUrl;
        this.workflowDir = path.join(__dirname, 'workflows');
    }

    async isAlive() {
        try {
            await axios.get(`${this.baseUrl}/system_stats`, { timeout: 2000 });
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 워크플로우 템플릿 로드 및 파라미터 주입
     */
    async _prepareWorkflow(templateName, params) {
        let templatePath = path.join(this.workflowDir, `${templateName}.json`);
        
        // 템플릿 파일이 없으면 기본값 사용
        if (!await fs.pathExists(templatePath)) {
            console.warn(`⚠️ [ComfyUI] 워크플로우 '${templateName}'을 찾을 수 없습니다. 기본 템플릿을 사용합니다.`);
            templatePath = path.join(this.workflowDir, 'basic_v1.json');
        }

        const workflow = await fs.readJson(templatePath);

        // [핵심 로직] 각 노드의 입력값 동적 주입
        // 기본 템플릿(basic_v1) 기준 매핑. 고급 워크플로우는 별도 매핑 규칙 필요.
        for (const nodeId in workflow) {
            const node = workflow[nodeId];
            if (node.class_type === 'CLIPTextEncode') {
                if (nodeId === '6') node.inputs.text = params.prompt; // Positive
                if (nodeId === '7') node.inputs.text = params.negativePrompt || node.inputs.text; // Negative
            }
            if (node.class_type === 'KSampler') {
                node.inputs.seed = params.seed || Math.floor(Math.random() * 1000000000);
            }
            if (node.class_type === 'EmptyLatentImage') {
                node.inputs.width = params.isVertical ? 512 : 768;
                node.inputs.height = params.isVertical ? 768 : 512;
            }
        }

        return workflow;
    }

    /**
     * 이미지 생성 요청 (고급 파이프라인 대응)
     */
    async generate(params, outputPath) {
        const isVertical = params.isVertical || false;
        const prompt = typeof params === 'string' ? params : params.prompt;
        
        const generationParams = typeof params === 'string' 
            ? { prompt, isVertical } 
            : params;

        try {
            const workflow = await this._prepareWorkflow(generationParams.workflow || 'basic_v1', generationParams);
            
            console.log(`[ComfyUI] 이미지 생성 시작... (Workflow: ${generationParams.workflow || 'basic_v1'})`);
            const response = await axios.post(`${this.baseUrl}/prompt`, { prompt: workflow });
            const promptId = response.data.prompt_id;

            // 생성 완료 대기
            let fileName = '';
            let attempts = 0;
            while (attempts < 60) { // Max 1 minute
                const history = await axios.get(`${this.baseUrl}/history/${promptId}`);
                if (history.data[promptId]) {
                    const outputs = history.data[promptId].outputs;
                    // 마지막 SaveImage 노드를 찾아 결과물 추출 (보통 9번)
                    const saveImageNode = Object.values(outputs).find(out => out.images);
                    if (saveImageNode) {
                        fileName = saveImageNode.images[0].filename;
                        break;
                    }
                }
                attempts++;
                await new Promise(r => setTimeout(r, 1000));
            }

            if (!fileName) throw new Error("생성 타임아웃 또는 워크플로우 오류");

            const imageUrl = `${this.baseUrl}/view?filename=${fileName}&type=output`;
            const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            await fs.writeFile(outputPath, imgResponse.data);
            
            return outputPath;

        } catch (err) {
            console.error(`❌ [ComfyUI Error] ${err.message}`);
            
            // [Fallback] 고급 워크플로우 실패 시 기본 모드로 재시도 (최초 1회 한정)
            if (generationParams.workflow && generationParams.workflow !== 'basic_v1') {
                console.warn(`🔄 [Fallback] 기본 워크플로우(basic_v1)로 재시도합니다...`);
                return this.generate({ ...generationParams, workflow: 'basic_v1' }, outputPath);
            }
            throw err;
        }
    }
}

module.exports = new ComfyClient(process.env.COMFY_URL);
