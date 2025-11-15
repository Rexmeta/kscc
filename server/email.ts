export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private apiKey: string | undefined;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('[EMAIL] RESEND_API_KEY not configured. Email not sent.');
      console.log('[EMAIL] Would have sent:', {
        to: options.to,
        subject: options.subject,
        preview: options.text?.substring(0, 100) || options.html.substring(0, 100),
      });
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[EMAIL] Failed to send email:', error);
        return false;
      }

      const data = await response.json();
      console.log('[EMAIL] Email sent successfully:', data);
      return true;
    } catch (error) {
      console.error('[EMAIL] Error sending email:', error);
      return false;
    }
  }

  generateInquiryReplyEmail(
    inquirySubject: string,
    inquiryMessage: string,
    replyMessage: string,
    recipientName: string
  ): { html: string; text: string } {
    const text = `
안녕하세요 ${recipientName}님,

문의하신 내용에 대한 답변을 보내드립니다.

[원본 문의]
제목: ${inquirySubject}
내용: ${inquiryMessage}

[답변]
${replyMessage}

감사합니다.
한국 사천-충칭 총상회
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a365d 0%, #2d5a8d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f7f9fc; padding: 30px; border-radius: 0 0 8px 8px; }
    .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 6px; border-left: 4px solid #2d5a8d; }
    .section-title { font-weight: bold; color: #1a365d; margin-bottom: 10px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">한국 사천-충칭 총상회</h1>
      <p style="margin: 10px 0 0;">Korea Sichuan-Chongqing Chamber of Commerce</p>
    </div>
    <div class="content">
      <p>안녕하세요 <strong>${recipientName}</strong>님,</p>
      <p>문의하신 내용에 대한 답변을 보내드립니다.</p>
      
      <div class="section">
        <div class="section-title">원본 문의</div>
        <p><strong>제목:</strong> ${inquirySubject}</p>
        <p><strong>내용:</strong><br>${inquiryMessage.replace(/\n/g, '<br>')}</p>
      </div>
      
      <div class="section">
        <div class="section-title">답변</div>
        <p>${replyMessage.replace(/\n/g, '<br>')}</p>
      </div>
      
      <p>추가 문의사항이 있으시면 언제든지 연락 주시기 바랍니다.</p>
      <p>감사합니다.</p>
    </div>
    <div class="footer">
      <p>한국 사천-충칭 총상회 | Korea Sichuan-Chongqing Chamber of Commerce</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return { html, text };
  }
}

export const emailService = new EmailService();
