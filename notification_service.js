const nodemailer = require('nodemailer');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

/**
 * [AI MUSIC AGENT OZ] Notification Service
 * 시스템 장애 및 이상 상황 발생 시 실시간으로 알림을 전송합니다.
 */
class NotificationService {
    constructor() {
        this.emailUser = process.env.EMAIL_USER;
        this.emailPass = process.env.EMAIL_PASS;
        this.receiverEmail = process.env.ALERT_RECEIVER_EMAIL;
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
    }

    /**
     * 통합 알림 발송 함수 (이메일 및 웹후크)
     * @param {string} subject - 제목
     * @param {string} message - 상세 내용
     */
    async sendAlert(subject, message) {
        console.log(`\n[Notification] 🚨 실시간 알림 발송 중: ${subject}`);
        
        const results = [];

        // 1. 웹후크(Discord/Slack) 발송 시도 - 설정이 간편하여 최우선 권장
        if (this.webhookUrl) {
            try {
                await axios.post(this.webhookUrl, {
                    content: `🚨 **[AI MUSIC AGENT OZ - 긴급 알림]** 🚨\n\n**${subject}**\n\n${message}\n\n*실시간 시스템 모니터링 모듈에 의해 감지되었습니다.*`
                });
                results.push("✅ 웹후크 전송 성공");
            } catch (e) {
                console.error(`❌ 웹후크 전송 실패: ${e.message}`);
            }
        }

        // 2. 이메일 발송 시도
        if (this.emailUser && this.emailPass && this.receiverEmail) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail', // 기본값으로 Gmail 설정 (필요 시 수정 가능)
                    auth: {
                        user: this.emailUser,
                        pass: this.emailPass
                    }
                });

                const mailOptions = {
                    from: this.emailUser,
                    to: this.receiverEmail,
                    subject: `[AI MUSIC AGENT OZ] 🚨 ${subject}`,
                    text: `시스템 긴급 알지 통보입니다.\n\n상세 내용:\n${message}\n\n감사합니다.`
                };

                await transporter.sendMail(mailOptions);
                results.push("✅ 이메일 전송 성공");
            } catch (e) {
                console.error(`❌ 이메일 전송 실패: ${e.message}`);
            }
        }

        if (results.length === 0) {
            console.log("⚠️ 설정된 알림 채널(URL 또는 계정 정보)이 없어 발송이 생략되었습니다.");
        } else {
            console.log(results.join('\n'));
        }
    }
}

module.exports = new NotificationService();
