'use strict';

const fs = require('fs');
const path = require('path');

/**
 * SystemKnowledge Module
 * 담당: OZ 에이전트의 전역 지식(SKILL, SRC, TOOL, MEMORY)을 파악하고 LLM용 컨텍스트 생성
 */
class SystemKnowledge {
    constructor() {
        this.baseDir = path.join(__dirname, '../../');
        this.skillPath = path.join(this.baseDir, '.agent/skills/oz_strategy_v4/SKILL.md');
        this.memoryPath = path.join(this.baseDir, 'memory/lessons_learned.json');
    }

    // 1. [SKILL] 전략 요약 추출
    getSkillSummary() {
        try {
            if (fs.existsSync(this.skillPath)) {
                const content = fs.readFileSync(this.skillPath, 'utf8');
                // 핵심적인 테이블과 전략 섹션만 추출 (컨텍스트 절약)
                const parts = content.split('## 1. 핵심 카테고리');
                const strategySection = parts.length > 1 ? parts[1] : '';
                return `## Core Strategies (from SKILL.md)\n${strategySection.split('## 5. 🚀')[0]}`;
            }
        } catch (e) { return 'Skill manual not found.'; }
    }

    // 2. [SRC] 프로젝트 구조 파악
    getProjectMap() {
        return `
## Project Structure (SRC)
- src/core: Core modules (PromptEngineer, ComfyClient, YouTubeAnalyzer, etc.)
- src/apps: Main autonomous applications (MasterScheduler, RunAutonomous)
- src/test: Diagnostic and verification scripts
- memory/: Long-term memory and logs
- memory/collaboration: Requests for high-level help to Antigravity (Gemini)
- images/: Generated thumbnails and assets
        `.trim();
    }

    // 3. [TOOL] 사용 가능한 도구 명세
    getToolSpecs() {
        return `
## Available Tools & Engines
- Ollama (Local LLM): Theme analysis, reasoning, metadata generation.
- ComfyUI (Local Image Gen): High-quality 16:9 thumbnail and visual asset creation.
- Lyria (Music Gen): Multi-track AI music generation.
- FFmpeg (Video Processing): Merging audio/visuals, applying real-time visualizers.
- YouTube API: Trending discovery and automated video upload.
- Antigravity Bridge: Delegation of complex tasks to Gemini when local AI hits a wall.
        `.trim();
    }

    // 4. [MEMORY] 이전 기록 요약
    getMemorySnapshot() {
        try {
            if (fs.existsSync(this.memoryPath)) {
                const memory = JSON.parse(fs.readFileSync(this.memoryPath, 'utf8'));
                const stats = {
                    successful_genres: (memory.successful_genres || []).slice(-5),
                    issue_count: (memory.technical_issues || []).length
                };
                return `## Memory Snapshot\nRecent success: ${stats.successful_genres.join(', ')}\nPending issues recorded: ${stats.issue_count}`;
            }
        } catch (e) { return 'Memory empty.'; }
    }

    // 전역 컨텍스트 생성
    async getFullContext() {
        const parts = [
            "# System Knowledge Base: AI MUSIC AGENT [OZ]",
            "You are the brain of OZ, a world-class AI music agent.",
            this.getProjectMap(),
            this.getToolSpecs(),
            this.getSkillSummary(),
            this.getMemorySnapshot()
        ];
        
        const fullText = parts.join('\n\n');
        
        // 지식 베이스 파일로도 저장 (디버깅용)
        const kbPath = path.join(this.baseDir, 'memory/system_knowledge_base.md');
        if (!fs.existsSync(path.dirname(kbPath))) {
            fs.mkdirSync(path.dirname(kbPath), { recursive: true });
        }
        fs.writeFileSync(kbPath, fullText);
        
        return fullText;
    }
}

module.exports = new SystemKnowledge();
