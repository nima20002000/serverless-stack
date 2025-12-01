import nodemailer from 'nodemailer';
import { log } from '@/lib/logger';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Create email transporter based on environment
 * Development: Uses Ethereal (fake SMTP for testing)
 * Production: Uses Resend via SMTP
 */
async function createTransporter() {
  // Production mode: Use Resend
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
      }
    });
  }

  // Development mode: Use Ethereal or environment SMTP
  if (process.env.EMAIL_SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
      secure: process.env.EMAIL_SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASS
      }
    });
  }

  // Fallback: Create Ethereal test account on the fly
  const testAccount = await nodemailer.createTestAccount();
  log.info('Created Ethereal test account', {
    user: testAccount.user,
    pass: testAccount.pass
  });

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}

/**
 * Send OTP email
 * Development: Uses Ethereal (test inbox)
 * Production: Uses Resend
 */
export async function sendOTPEmail(email: string, otp: string): Promise<SendEmailResult> {
  try {
    const transporter = await createTransporter();

    const emailHTML = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Tahoma, Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .code {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #2563eb;
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: #eff6ff;
      border-radius: 8px;
    }
    .footer {
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    p {
      line-height: 1.6;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="color: #1f2937; margin: 0;">کد تایید کیتیا</h2>
    </div>
    <p>سلام،</p>
    <p>کد تایید شما برای ورود به کیتیا:</p>
    <div class="code">${otp}</div>
    <p>این کد تا <strong>5 دقیقه</strong> دیگر معتبر است.</p>
    <p>اگر این درخواست را شما ارسال نکرده‌اید، لطفاً این ایمیل را نادیده بگیرید.</p>
    <div class="footer">
      <p>کیتیا - فروشگاه اینترنتی</p>
      <p>این یک ایمیل خودکار است، لطفاً به آن پاسخ ندهید.</p>
    </div>
  </div>
</body>
</html>
    `;

    const emailText = `
کد تایید کیتیا

کد تایید شما: ${otp}

این کد تا 5 دقیقه دیگر معتبر است.

اگر این درخواست را شما ارسال نکرده‌اید، لطفاً این ایمیل را نادیده بگیرید.

کیتیا - فروشگاه اینترنتی
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"کیتیا" <noreply@kitia.ir>',
      to: email,
      subject: 'کد تایید کیتیا',
      text: emailText,
      html: emailHTML
    });

    // In development with Ethereal, log the preview URL
    if (!process.env.RESEND_API_KEY && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        log.info('📧 Email sent (Ethereal)', {
          email,
          previewUrl,
          messageId: info.messageId
        });
        console.log('\n==========================================');
        console.log('📧 EMAIL OTP (Ethereal Test Mode)');
        console.log(`To: ${email}`);
        console.log(`Code: ${otp}`);
        console.log(`Preview URL: ${previewUrl}`);
        console.log('==========================================\n');
      }
    } else {
      log.info('📧 Email sent (Production)', {
        email,
        messageId: info.messageId
      });
    }

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    log.error('Failed to send email', {
      email,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}
