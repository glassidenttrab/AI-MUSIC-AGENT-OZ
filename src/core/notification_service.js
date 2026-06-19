const nodemailer = require('nodemailer');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

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
        this.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
        this.enabled = process.env.ENABLE_NOTIFICATIONS === 'true';
        
        console.log(`[DEBUG] Notifications Enabled: ${this.enabled}`);
        console.log(`[DEBUG] EMAIL: ${this.emailUser ? '설정' : '미설정'}`);
        console.log(`[DEBUG] Webhook: ${this.webhookUrl ? '설정' : '미설정'}`);
        console.log(`[DEBUG] Telegram: ${this.telegramToken ? '설정' : '미설정'}`);
    }

    /**
     * 통합 알림 발송 함수 (이메일 및 웹후크)
     * @param {string} subject - 제목
     * @param {string} message - 상세 내용
     */
    async sendAlert(subject, message) {
        if (!this.enabled) {
            console.log(`[Notification] 🔇 Silent Mode: 알림이 비활성화되어 발송되지 않았습니다. (주제: ${subject})`);
            return;
        }
        console.log(`\n[Notification] 🚨 실시간 알림 발송 중: ${subject}`);
        
        const results = [];

        // 1. 웹후크(Discord/Slack) 발송 시도 - 설정이 간편하여 최우선 권장
        if (this.webhookUrl) {
            try {
                // [안정화] 5초 타임아웃 설정
                await axios.post(this.webhookUrl, {
                    content: `🚨 **[AI MUSIC AGENT OZ - 긴급 알림]** 🚨\n\n**${subject}**\n\n${message}\n\n*실시간 시스템 모니터링 모듈에 의해 감지되었습니다.*`
                }, { timeout: 5000 });
                results.push("✅ 웹후크 전송 성공");
            } catch (e) {
                console.error(`❌ 웹후크 전송 실패: ${e.message}`);
            }
        }

        // 2. 이메일 발송 시도 (사용자 요청으로 주석 처리됨)
        if (false /* this.emailUser && this.emailPass && this.receiverEmail */) {
            try {
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true, // 465 포트는 true
                    auth: {
                        user: this.emailUser,
                        pass: this.emailPass
                    }
                });

                const mailOptions = {
                    from: `"AI MUSIC AGENT OZ" <${this.emailUser}>`,
                    to: this.receiverEmail,
                    subject: `[AI MUSIC AGENT OZ] 🚨 ${subject}`,
                    text: `시스템 긴급 알림 통보입니다.\n\n상세 내용:\n${message}\n\n감사합니다.`
                };

                // [안정화] 10초 타임아웃 설정 (이메일은 조금 더 길게)
                await Promise.race([
                    transporter.sendMail(mailOptions),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Email Send Timeout')), 10000))
                ]);
                results.push("✅ 이메일 전송 성공");
            } catch (e) {
                console.error(`❌ 이메일 전송 실패: ${e.message}`);
                if (e.message.includes('535-5.7.8')) {
                    console.error("💡 힌트: '구글 앱 비밀번호'가 올바른지, 혹은 계정의 2단계 인증이 활성 상태인지 확인하세요.");
                }
            }
        }

        // 3. 텔레그램 발송 시도 (사용자 요청으로 주석 처리됨)
        if (false /* this.telegramToken && this.telegramChatId */) {
            try {
                // [안정화] 5초 타임아웃 설정
                await axios.post(`https://api.telegram.org/bot${this.telegramToken}/sendMessage`, {
                    chat_id: this.telegramChatId,
                    text: `🚨 *[AI MUSIC AGENT OZ - 긴급]*\n\n*${subject}*\n${message}`,
                    parse_mode: 'Markdown'
                }, { timeout: 5000 });
                results.push("✅ 텔레그램 전송 성공");
            } catch (e) {
                console.error(`❌ 텔레그램 전송 실패: ${e.message}`);
                if (e.response && e.response.status === 400) {
                    console.error("💡 힌트: 'TELEGRAM_CHAT_ID'가 올바른 숫자 ID인지 확인하세요. (예: 8771933002)");
                }
            }
        }

        if (results.length === 0) {
            console.log("⚠️ 설정된 알림 채널(URL 또는 계정 정보)이 없어 발송이 생략되었습니다.");
        } else {
            console.log(results.join('\n'));
        }
    }

    /**
     * 일반 정보 알림 발송 함수 (상태 체크인 등)
     */
    async sendInfo(subject, message) {
        if (!this.enabled) {
            console.log(`[Notification] 🔇 Silent Mode: 정보 알림이 비활성화되어 발송되지 않았습니다. (주제: ${subject})`);
            return;
        }
        console.log(`\n[Notification] ℹ️ 정보 알림 발송 중: ${subject}`);
        
        if (this.webhookUrl) {
            try {
                await axios.post(this.webhookUrl, {
                    content: `ℹ️ **[AI MUSIC AGENT OZ - 상태 보고]**\n\n**${subject}**\n${message}`
                });
            } catch (e) {}
        }

        if (false /* this.telegramToken && this.telegramChatId */) {
            try {
                await axios.post(`https://api.telegram.org/bot${this.telegramToken}/sendMessage`, {
                    chat_id: this.telegramChatId,
                    text: `ℹ️ *[AI MUSIC AGENT OZ - 정보]*\n\n*${subject}*\n${message}`,
                    parse_mode: 'Markdown'
                });
            } catch (e) {}
        }
        // 정보성 알림은 이메일 발송 생략 (스팸 방지)
    }
}

module.exports = new NotificationService();
