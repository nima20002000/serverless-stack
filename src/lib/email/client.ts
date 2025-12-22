import 'server-only';
import nodemailer from 'nodemailer';
import { log } from '@/lib/logger';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Transaction data for email notifications (generic type, works with both Prisma and Supabase)
export type TransactionEmailData = {
  id: string;
  transactionCode: string;
  amount: string | number;
  paymentMethod: 'ZARINPAL' | 'DIGIPAY';
  fullName: string | null;
  phone: string | null;
  email: string | null;
  shippingAddress: string | null;
  postalCode: string | null;
  createdAt: string | Date;
  isGuest: boolean;
  items: Array<{
    quantity: number;
    price: string | number;
    product: {
      name: string;
      price: string | number;
    };
    variant?: {
      name: string;
      color?: string | null;
      size?: string | null;
      material?: string | null;
    } | null;
  }>;
  user?: {
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

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
        pass: process.env.RESEND_API_KEY,
      },
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
        pass: process.env.EMAIL_SMTP_PASS,
      },
    });
  }

  // Fallback: Create Ethereal test account on the fly
  const testAccount = await nodemailer.createTestAccount();
  log.info('Created Ethereal test account', {
    user: testAccount.user,
    pass: testAccount.pass,
  });

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

/**
 * Send OTP email
 * Development: Uses Ethereal (test inbox)
 * Production: Uses Resend
 */
export async function sendOTPEmail(
  email: string,
  otp: string
): Promise<SendEmailResult> {
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
      html: emailHTML,
    });

    // In development with Ethereal, log the preview URL
    if (!process.env.RESEND_API_KEY && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        log.info('📧 Email sent (Ethereal)', {
          email,
          previewUrl,
          messageId: info.messageId,
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
        messageId: info.messageId,
      });
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    log.error('Failed to send email', {
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send order confirmation email to buyer
 * Sends order confirmation with transaction code and items purchased
 */
export async function sendBuyerOrderConfirmation(
  transaction: TransactionEmailData
): Promise<SendEmailResult> {
  try {
    const buyerEmail = transaction.email;

    log.info('Attempting to send buyer order confirmation', {
      transactionCode: transaction.transactionCode,
      buyerEmail,
      hasEmail: !!buyerEmail,
      resendKeyConfigured: !!process.env.RESEND_API_KEY,
      emailFromConfigured: !!process.env.EMAIL_FROM,
    });

    if (!buyerEmail) {
      log.info('No buyer email provided, skipping buyer confirmation email', {
        transactionCode: transaction.transactionCode,
      });
      return {
        success: false,
        error: 'Buyer email not provided',
      };
    }

    const transporter = await createTransporter();

    log.info('Email transporter created for buyer confirmation', {
      transactionCode: transaction.transactionCode,
      hasResendKey: !!process.env.RESEND_API_KEY,
    });

    // Format order date
    const orderDate = new Date(transaction.createdAt).toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Calculate total items quantity
    const totalItems = transaction.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    // Build items HTML table
    const itemsHTML = transaction.items
      .map((item, index) => {
        const variantInfo = item.variant
          ? `<br/><small style="color: #6b7280;">نوع: ${item.variant.name}</small>`
          : '';

        const price = Number(item.price).toLocaleString('fa-IR');
        const totalPrice = (Number(item.price) * item.quantity).toLocaleString(
          'fa-IR'
        );

        return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: center;">${index + 1}</td>
          <td style="padding: 12px;">
            ${item.product.name}
            ${variantInfo}
          </td>
          <td style="padding: 12px; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; text-align: center; direction: rtl;">${price} تومان</td>
          <td style="padding: 12px; text-align: center; direction: rtl;">${totalPrice} تومان</td>
        </tr>
      `;
      })
      .join('');

    // Build items plain text
    const itemsText = transaction.items
      .map((item, index) => {
        const variantInfo = item.variant ? ` (نوع: ${item.variant.name})` : '';
        const price = Number(item.price).toLocaleString('fa-IR');
        const totalPrice = (Number(item.price) * item.quantity).toLocaleString(
          'fa-IR'
        );

        return `${index + 1}. ${item.product.name}${variantInfo}
   تعداد: ${item.quantity}
   قیمت واحد: ${price} تومان
   قیمت کل: ${totalPrice} تومان`;
      })
      .join('\n\n');

    // Buyer information
    const buyerName = transaction.user?.name || transaction.fullName;
    const buyerPhone = transaction.user?.phone || transaction.phone;

    // Payment method label
    const paymentMethodLabel =
      transaction.paymentMethod === 'DIGIPAY' ? 'دیجی‌پی' : 'زرین‌پال';

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
      max-width: 800px;
      margin: 40px auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h2 {
      margin: 0;
      font-size: 24px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 12px;
      margin-bottom: 15px;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
    }
    .highlight {
      background: #dbeafe;
      padding: 15px;
      border-radius: 8px;
      border-right: 4px solid #2563eb;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: center;
      font-weight: bold;
      color: #1f2937;
    }
    .footer {
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    .total {
      font-size: 20px;
      font-weight: bold;
      color: #2563eb;
      text-align: center;
      padding: 15px;
      background: #eff6ff;
      border-radius: 8px;
      margin-top: 20px;
    }
    .thank-you {
      background: #f0fdf4;
      border-right: 4px solid #10b981;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✅ سفارش شما با موفقیت ثبت شد!</h2>
      <p style="margin: 10px 0 0 0; font-size: 14px;">کد پیگیری: ${transaction.transactionCode}</p>
    </div>

    <div class="thank-you">
      <strong>${buyerName} عزیز،</strong><br/>
      از خرید شما در کیتیا متشکریم! سفارش شما با موفقیت ثبت شد و به زودی برای ارسال آماده می‌شود.
    </div>

    <div class="highlight">
      <strong>📦 تعداد کل اقلام:</strong> ${totalItems} عدد<br/>
      <strong>💰 مبلغ پرداختی:</strong> ${Number(transaction.amount).toLocaleString('fa-IR')} تومان<br/>
      <strong>💳 روش پرداخت:</strong> ${paymentMethodLabel}<br/>
      <strong>📅 تاریخ ثبت سفارش:</strong> ${orderDate}
    </div>

    <div class="section">
      <div class="section-title">📍 اطلاعات ارسال</div>
      <div class="info-grid">
        <div class="info-label">نام و نام خانوادگی:</div>
        <div class="info-value">${buyerName}</div>

        <div class="info-label">شماره تماس:</div>
        <div class="info-value" style="direction: ltr; text-align: right;">${buyerPhone}</div>

        <div class="info-label">آدرس:</div>
        <div class="info-value">${transaction.shippingAddress}</div>

        ${
          transaction.postalCode
            ? `
        <div class="info-label">کد پستی:</div>
        <div class="info-value" style="direction: ltr; text-align: right;">${transaction.postalCode}</div>
        `
            : ''
        }
      </div>
    </div>

    <div class="section">
      <div class="section-title">🛒 جزئیات سفارش</div>
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">ردیف</th>
            <th>محصول</th>
            <th style="width: 80px;">تعداد</th>
            <th style="width: 120px;">قیمت واحد</th>
            <th style="width: 120px;">قیمت کل</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="total">
        جمع کل: ${Number(transaction.amount).toLocaleString('fa-IR')} تومان
      </div>
    </div>

    <div class="section" style="background: #fef3c7; padding: 15px; border-radius: 8px; border-right: 4px solid #f59e0b;">
      <strong>📞 پشتیبانی:</strong><br/>
      در صورت داشتن هرگونه سوال یا نیاز به کمک، با شماره تماس ثبت شده با ما در ارتباط باشید.
    </div>

    <div class="footer">
      <p>با تشکر از اعتماد شما به کیتیا</p>
      <p>کیتیا - فروشگاه اینترنتی</p>
      <p>این یک ایمیل خودکار است، لطفاً به آن پاسخ ندهید.</p>
    </div>
  </div>
</body>
</html>
    `;

    const emailText = `
✅ سفارش شما با موفقیت ثبت شد!

کد پیگیری: ${transaction.transactionCode}

${buyerName} عزیز،
از خرید شما در کیتیا متشکریم! سفارش شما با موفقیت ثبت شد و به زودی برای ارسال آماده می‌شود.

────────────────────────────────
📦 اطلاعات سفارش
────────────────────────────────
تعداد کل اقلام: ${totalItems} عدد
مبلغ پرداختی: ${Number(transaction.amount).toLocaleString('fa-IR')} تومان
روش پرداخت: ${paymentMethodLabel}
تاریخ ثبت: ${orderDate}

────────────────────────────────
📍 اطلاعات ارسال
────────────────────────────────
نام: ${buyerName}
تلفن: ${buyerPhone}
آدرس: ${transaction.shippingAddress}
${transaction.postalCode ? `کد پستی: ${transaction.postalCode}` : ''}

────────────────────────────────
🛒 جزئیات سفارش
────────────────────────────────

${itemsText}

────────────────────────────────
💰 جمع کل: ${Number(transaction.amount).toLocaleString('fa-IR')} تومان
────────────────────────────────

📞 پشتیبانی:
در صورت داشتن هرگونه سوال یا نیاز به کمک، با شماره تماس ثبت شده با ما در ارتباط باشید.

با تشکر از اعتماد شما به کیتیا
کیتیا - فروشگاه اینترنتی
    `;

    log.info('Sending buyer order confirmation email', {
      transactionCode: transaction.transactionCode,
      to: buyerEmail,
      from: process.env.EMAIL_FROM || '"کیتیا" <noreply@kitia.ir>',
      subject: `✅ تایید سفارش ${transaction.transactionCode} - کیتیا`,
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"کیتیا" <noreply@kitia.ir>',
      to: buyerEmail,
      subject: `✅ تایید سفارش ${transaction.transactionCode} - کیتیا`,
      text: emailText,
      html: emailHTML,
    });

    log.info('Email sent via transporter', {
      transactionCode: transaction.transactionCode,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    // In development with Ethereal, log the preview URL
    if (!process.env.RESEND_API_KEY && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        log.info('📧 Buyer order confirmation sent (Ethereal)', {
          transactionCode: transaction.transactionCode,
          previewUrl,
          messageId: info.messageId,
        });
        console.log('\n==========================================');
        console.log('📧 BUYER ORDER CONFIRMATION (Ethereal Test Mode)');
        console.log(`To: ${buyerEmail}`);
        console.log(`Order: ${transaction.transactionCode}`);
        console.log(`Preview URL: ${previewUrl}`);
        console.log('==========================================\n');
      }
    } else {
      log.info('📧 Buyer order confirmation sent (Production)', {
        transactionCode: transaction.transactionCode,
        buyerEmail,
        messageId: info.messageId,
      });
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    log.error('Failed to send buyer order confirmation', {
      transactionCode: transaction.transactionCode,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to send buyer confirmation',
    };
  }
}

/**
 * Send order confirmation email to admin
 * Sends comprehensive order details including buyer info and purchased items with variants
 */
export async function sendAdminOrderConfirmation(
  transaction: TransactionEmailData,
  refId?: number
): Promise<SendEmailResult> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;

    log.info('Attempting to send admin order confirmation', {
      transactionCode: transaction.transactionCode,
      adminEmailConfigured: !!adminEmail,
      resendKeyConfigured: !!process.env.RESEND_API_KEY,
      emailFromConfigured: !!process.env.EMAIL_FROM,
    });

    if (!adminEmail) {
      log.warn('ADMIN_EMAIL not configured, skipping admin confirmation email');
      return {
        success: false,
        error: 'ADMIN_EMAIL not configured',
      };
    }

    const transporter = await createTransporter();

    log.info('Email transporter created', {
      transactionCode: transaction.transactionCode,
      hasResendKey: !!process.env.RESEND_API_KEY,
    });

    // Format order date
    const orderDate = new Date(transaction.createdAt).toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Calculate total items quantity
    const totalItems = transaction.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    // Build items HTML table
    const itemsHTML = transaction.items
      .map((item, index) => {
        const variantInfo = item.variant
          ? `<br/><small style="color: #6b7280;">نوع: ${item.variant.name}</small>`
          : '';

        const price = Number(item.price).toLocaleString('fa-IR');
        const totalPrice = (Number(item.price) * item.quantity).toLocaleString(
          'fa-IR'
        );

        return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: center;">${index + 1}</td>
          <td style="padding: 12px;">
            ${item.product.name}
            ${variantInfo}
          </td>
          <td style="padding: 12px; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; text-align: center; direction: rtl;">${price} تومان</td>
          <td style="padding: 12px; text-align: center; direction: rtl;">${totalPrice} تومان</td>
        </tr>
      `;
      })
      .join('');

    // Build items plain text
    const itemsText = transaction.items
      .map((item, index) => {
        const variantInfo = item.variant ? ` (نوع: ${item.variant.name})` : '';
        const price = Number(item.price).toLocaleString('fa-IR');
        const totalPrice = (Number(item.price) * item.quantity).toLocaleString(
          'fa-IR'
        );

        return `${index + 1}. ${item.product.name}${variantInfo}
   تعداد: ${item.quantity}
   قیمت واحد: ${price} تومان
   قیمت کل: ${totalPrice} تومان`;
      })
      .join('\n\n');

    // Buyer information
    const buyerName = transaction.user?.name || transaction.fullName;
    const buyerPhone = transaction.user?.phone || transaction.phone;
    const buyerEmail = transaction.user?.email || transaction.email || 'ندارد';
    const accountType = transaction.isGuest
      ? 'مهمان (بدون ثبت‌نام)'
      : 'کاربر ثبت‌نام شده';

    // Payment method label
    const paymentMethodLabel =
      transaction.paymentMethod === 'DIGIPAY' ? 'دیجی‌پی' : 'زرین‌پال';

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
      max-width: 800px;
      margin: 40px auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h2 {
      margin: 0;
      font-size: 24px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 12px;
      margin-bottom: 15px;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
    }
    .highlight {
      background: #fef3c7;
      padding: 15px;
      border-radius: 8px;
      border-right: 4px solid #f59e0b;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: center;
      font-weight: bold;
      color: #1f2937;
    }
    .footer {
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    .total {
      font-size: 20px;
      font-weight: bold;
      color: #10b981;
      text-align: center;
      padding: 15px;
      background: #ecfdf5;
      border-radius: 8px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎉 سفارش جدید ثبت شد!</h2>
      <p style="margin: 10px 0 0 0; font-size: 14px;">کد سفارش: ${transaction.transactionCode}</p>
    </div>

    <div class="highlight">
      <strong>📦 تعداد کل اقلام:</strong> ${totalItems} عدد<br/>
      <strong>💰 مبلغ کل:</strong> ${Number(transaction.amount).toLocaleString('fa-IR')} تومان<br/>
      <strong>💳 روش پرداخت:</strong> ${paymentMethodLabel}<br/>
      ${refId ? `<strong>🔢 شناسه پرداخت:</strong> ${refId}<br/>` : ''}
      <strong>📅 تاریخ ثبت سفارش:</strong> ${orderDate}
    </div>

    <div class="section">
      <div class="section-title">👤 اطلاعات خریدار</div>
      <div class="info-grid">
        <div class="info-label">نام و نام خانوادگی:</div>
        <div class="info-value">${buyerName}</div>

        <div class="info-label">شماره تماس:</div>
        <div class="info-value" style="direction: ltr; text-align: right;">${buyerPhone}</div>

        <div class="info-label">ایمیل:</div>
        <div class="info-value">${buyerEmail}</div>

        <div class="info-label">نوع حساب:</div>
        <div class="info-value">${accountType}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📍 اطلاعات ارسال</div>
      <div class="info-grid">
        <div class="info-label">آدرس:</div>
        <div class="info-value">${transaction.shippingAddress}</div>

        ${
          transaction.postalCode
            ? `
        <div class="info-label">کد پستی:</div>
        <div class="info-value" style="direction: ltr; text-align: right;">${transaction.postalCode}</div>
        `
            : ''
        }
      </div>
    </div>

    <div class="section">
      <div class="section-title">🛒 جزئیات سفارش</div>
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">ردیف</th>
            <th>محصول</th>
            <th style="width: 80px;">تعداد</th>
            <th style="width: 120px;">قیمت واحد</th>
            <th style="width: 120px;">قیمت کل</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="total">
        جمع کل: ${Number(transaction.amount).toLocaleString('fa-IR')} تومان
      </div>
    </div>

    <div class="footer">
      <p>کیتیا - سیستم مدیریت فروشگاه</p>
      <p>این یک ایمیل خودکار است، لطفاً به آن پاسخ ندهید.</p>
    </div>
  </div>
</body>
</html>
    `;

    const emailText = `
🎉 سفارش جدید ثبت شد!

کد سفارش: ${transaction.transactionCode}
تاریخ: ${orderDate}
مبلغ: ${Number(transaction.amount).toLocaleString('fa-IR')} تومان
روش پرداخت: ${paymentMethodLabel}
${refId ? `شناسه پرداخت: ${refId}` : ''}

👤 خریدار: ${buyerName} | تلفن: ${buyerPhone} | ایمیل: ${buyerEmail} | حساب: ${accountType}

📍 آدرس: ${transaction.shippingAddress}${transaction.postalCode ? ` | کد پستی: ${transaction.postalCode}` : ''}

🛒 محصولات (${totalItems} قلم):

${itemsText}

────────────────────────────────
💰 جمع کل: ${Number(transaction.amount).toLocaleString('fa-IR')} تومان
────────────────────────────────

کیتیا - سیستم مدیریت فروشگاه
    `;

    log.info('Sending admin order confirmation email', {
      transactionCode: transaction.transactionCode,
      to: adminEmail,
      from: process.env.EMAIL_FROM || '"کیتیا" <noreply@kitia.ir>',
      subject: `🛍️ سفارش جدید: ${transaction.transactionCode} - ${buyerName}`,
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"کیتیا" <noreply@kitia.ir>',
      to: adminEmail,
      subject: `🛍️ سفارش جدید: ${transaction.transactionCode} - ${buyerName}`,
      text: emailText,
      html: emailHTML,
    });

    log.info('Email sent via transporter', {
      transactionCode: transaction.transactionCode,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    // In development with Ethereal, log the preview URL
    if (!process.env.RESEND_API_KEY && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        log.info('📧 Admin order confirmation sent (Ethereal)', {
          transactionCode: transaction.transactionCode,
          previewUrl,
          messageId: info.messageId,
        });
        console.log('\n==========================================');
        console.log('📧 ADMIN ORDER CONFIRMATION (Ethereal Test Mode)');
        console.log(`To: ${adminEmail}`);
        console.log(`Order: ${transaction.transactionCode}`);
        console.log(`Preview URL: ${previewUrl}`);
        console.log('==========================================\n');
      }
    } else {
      log.info('📧 Admin order confirmation sent (Production)', {
        transactionCode: transaction.transactionCode,
        adminEmail,
        messageId: info.messageId,
      });
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    log.error('Failed to send admin order confirmation', {
      transactionCode: transaction.transactionCode,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to send admin confirmation',
    };
  }
}
