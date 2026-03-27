const fs = require('fs-extra');
const path = require('path');
const notificationService = require('./notification_service');

/**
 * [AI MUSIC AGENT OZ] Monitoring Module
 * 자동화 엔진의 실행 상태 및 결과 파일의 무결성을 감독합니다.
 */
class MonitoringAgent {
    constructor() {
        this.musicDir = path.join(__dirname, 'music');
        this.lastRunPath = path.join(__dirname, 'last_run.json');
        this.logPath = path.join(__dirname, 'latest_agent.log');
    }

    /**
     * 전체 시스템 건전성 체크 및 리포트 생성
     */
    async performHealthCheck() {
        console.log('\n====== [AI MUSIC AGENT OZ] 시스템 정밀 모니터링 가동 ======');
        
        const report = {
            timestamp: new Date().toLocaleString(),
            status: "Healthy",
            checks: [],
            issues: []
        };

        // 1. 마지막 실행 기록 확인
        try {
            if (fs.existsSync(this.lastRunPath)) {
                const lastRun = await fs.readJson(this.lastRunPath);
                report.checks.push(`✅ 마지막 실행 기록 확인됨 (날짜: ${lastRun.date})`);
            } else {
                report.issues.push("⚠️ 마지막 실행 기록 파일(last_run.json)이 존재하지 않습니다.");
            }
        } catch (e) {
            report.issues.push(`❌ 실행 기록 파일 읽기 실패: ${e.message}`);
        }

        // 2. 음원 자산 무결성 검사 (최근 24시간 내 생성된 파일)
        try {
            const files = await fs.readdir(this.musicDir);
            const now = Date.now();
            const recentFiles = [];

            for (const file of files) {
                const filePath = path.join(this.musicDir, file);
                const stats = await fs.stat(filePath);
                if (now - stats.mtimeMs < 24 * 60 * 60 * 1000) {
                    recentFiles.push({ name: file, size: stats.size });
                }
            }

            if (recentFiles.length > 0) {
                report.checks.push(`✅ 최근 24시간 내 ${recentFiles.length}개의 음원이 생성되었습니다.`);
            } else {
                report.issues.push("⚠️ 최근 생성된 음원 파일이 없습니다. (자동화 동작 여부 확인 필요)");
            }
        } catch (e) {
            report.issues.push(`❌ 음원 폴더 스캔 실패: ${e.message}`);
        }

        // 3. 로그 분석 (에러 키워드 탐지)
        if (fs.existsSync(this.logPath)) {
            try {
                const logContent = await fs.readFile(this.logPath, 'utf-8');
                if (logContent.toLowerCase().includes('error') || logContent.toLowerCase().includes('fail')) {
                    report.issues.push("❌ 로그 내 치명적 오류 키워드가 감지되었습니다. 로그 확인 권장.");
                } else {
                    report.checks.push("✅ 최근 로그 내 에러 징후 없음");
                }
            } catch (e) {
                report.issues.push(`❌ 로그 파일 분석 실패: ${e.message}`);
            }
        }

        // 최종 상태 요약 출력
        this.printFinalReport(report);

        // [추가] 상태가 Healthy가 아닐 경우 실시간 알림 발송
        if (report.status !== "Healthy") {
            const subject = `AI MUSIC AGENT OZ 시스템 장애 감지 (${report.status})`;
            const message = report.issues.join('\n');
            await notificationService.sendAlert(subject, message);
        }

        return report;
    }

    printFinalReport(report) {
        console.log(`\n[보고서 생성 시간]: ${report.timestamp}`);
        console.log('-'.repeat(50));
        
        report.checks.forEach(c => console.log(c));
        
        if (report.issues.length > 0) {
            console.log('\n🚩 발견된 이슈:');
            report.issues.forEach(i => console.log(i));
            report.status = "Warning";
        } else {
            console.log('\n✨ 현재 모든 시스템이 최적의 상태로 가동 중입니다.');
        }

        console.log('-'.repeat(50));
        console.log(`최종 상태: [${report.status}]`);
    }
}

// 독립 실행 시
if (require.main === module) {
    const monitor = new MonitoringAgent();
    monitor.performHealthCheck();
}

module.exports = MonitoringAgent;
