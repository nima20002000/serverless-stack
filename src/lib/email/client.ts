import 'server-only';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { log } from '@/lib/logger';
import { siteConfig } from '@/config/site';
import { formatDateTime, formatPrice } from '@/lib/utils/format';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Transaction data for email notifications.
export type TransactionEmailData = {
  id: string;
  transactionCode: string;
  amount: string | number;
  paymentMethod: 'STRIPE' | 'PAYPAL';
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

const siteName = siteConfig.displayName || siteConfig.name;
const direction = siteConfig.direction;
const language = siteConfig.language;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paymentMethodLabel(
  paymentMethod: TransactionEmailData['paymentMethod']
) {
  return paymentMethod === 'PAYPAL' ? 'PayPal' : 'Stripe';
}

function layoutEmail(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html dir="${direction}" lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f8fafc; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .container { max-width: 720px; margin: 32px auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .header { padding: 24px 28px; background: #111827; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; line-height: 1.3; }
    .content { padding: 28px; }
    .panel { margin: 20px 0; padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }
    .code { display: inline-block; margin: 18px 0; padding: 16px 22px; border-radius: 8px; background: #eef2ff; color: #1d4ed8; font-size: 30px; font-weight: 700; letter-spacing: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: start; vertical-align: top; }
    th { background: #f3f4f6; color: #374151; font-weight: 700; }
    .total { margin-top: 20px; padding: 16px; border-radius: 8px; background: #ecfdf5; color: #047857; font-size: 18px; font-weight: 700; }
    .footer { padding: 18px 28px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
    p { line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${escapeHtml(title)}</h1></div>
    <div class="content">${body}</div>
    <div class="footer">
      <p>${escapeHtml(siteName)}</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const from =
    process.env.EMAIL_FROM ||
    `${siteName} <${process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com'}>`;

  const useResendSmtp =
    process.env.RESEND_SMTP === 'true' ||
    !!process.env.RESEND_SMTP_HOST ||
    !!process.env.RESEND_SMTP_USER ||
    !!process.env.RESEND_SMTP_PASS;

  try {
    let transporter: nodemailer.Transporter;

    if (useResendSmtp) {
      const smtpPass =
        process.env.RESEND_SMTP_PASS || process.env.RESEND_API_KEY;

      if (!smtpPass) {
        throw new Error('RESEND_SMTP_PASS or RESEND_API_KEY is required');
      }

      transporter = nodemailer.createTransport({
        host: process.env.RESEND_SMTP_HOST || 'smtp.resend.com',
        port: parseInt(process.env.RESEND_SMTP_PORT || '587'),
        secure: process.env.RESEND_SMTP_SECURE === 'true',
        auth: {
          user: process.env.RESEND_SMTP_USER || 'resend',
          pass: smtpPass,
        },
      });
    } else if (process.env.EMAIL_SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SMTP_HOST,
        port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
        secure: process.env.EMAIL_SMTP_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_SMTP_USER,
          pass: process.env.EMAIL_SMTP_PASS,
        },
      });
    } else if (resend) {
      const { data, error } = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        log.error('Resend API error', { error: error.message });
        return { success: false, error: error.message };
      }

      log.info('Email sent via Resend API', {
        to: options.to,
        messageId: data?.id,
      });

      return { success: true, messageId: data?.id };
    } else {
      const testAccount = await nodemailer.createTestAccount();
      log.info('Created Ethereal test account', { user: testAccount.user });

      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (
      !process.env.EMAIL_SMTP_HOST &&
      !useResendSmtp &&
      !resend &&
      info.messageId
    ) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        log.info('Email sent to Ethereal test inbox', {
          to: options.to,
          subject: options.subject,
          previewUrl,
          messageId: info.messageId,
        });
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    log.error('Failed to send email', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

export async function sendOTPEmail(
  email: string,
  otp: string
): Promise<SendEmailResult> {
  const safeOtp = escapeHtml(otp);
  const title = `Your ${siteName} sign-in code`;
  const html = layoutEmail(
    title,
    `
      <p>Use this verification code to finish signing in to ${escapeHtml(siteName)}.</p>
      <div class="code">${safeOtp}</div>
      <p>This code expires in 5 minutes. If you did not request it, you can safely ignore this email.</p>
    `
  );
  const text = `${title}

Code: ${otp}

This code expires in 5 minutes. If you did not request it, you can safely ignore this email.`;

  log.info('Sending OTP email', { email });

  const result = await sendEmail({
    to: email,
    subject: title,
    html,
    text,
  });

  if (result.success) {
    log.info('OTP email sent', { email, messageId: result.messageId });
  }

  return result;
}

function buildItemsRows(transaction: TransactionEmailData) {
  const rows = transaction.items
    .map((item, index) => {
      const variant = item.variant?.name
        ? `<br><small>${escapeHtml(item.variant.name)}</small>`
        : '';
      const unitPrice = formatPrice(Number(item.price));
      const lineTotal = formatPrice(Number(item.price) * item.quantity);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.product.name)}${variant}</td>
          <td>${item.quantity}</td>
          <td>${escapeHtml(unitPrice)}</td>
          <td>${escapeHtml(lineTotal)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Product</th>
          <th>Quantity</th>
          <th>Unit price</th>
          <th>Line total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildItemsText(transaction: TransactionEmailData): string {
  return transaction.items
    .map((item, index) => {
      const variant = item.variant?.name ? ` (${item.variant.name})` : '';
      const unitPrice = formatPrice(Number(item.price));
      const lineTotal = formatPrice(Number(item.price) * item.quantity);

      return `${index + 1}. ${item.product.name}${variant}
   Quantity: ${item.quantity}
   Unit price: ${unitPrice}
   Line total: ${lineTotal}`;
    })
    .join('\n\n');
}

export async function sendBuyerOrderConfirmation(
  transaction: TransactionEmailData
): Promise<SendEmailResult> {
  const buyerEmail = transaction.email;

  log.info('Attempting to send buyer order confirmation', {
    transactionCode: transaction.transactionCode,
    buyerEmail,
    hasEmail: !!buyerEmail,
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

  const buyerName =
    transaction.user?.name || transaction.fullName || 'Customer';
  const buyerPhone =
    transaction.user?.phone || transaction.phone || 'Not provided';
  const orderDate = formatDateTime(transaction.createdAt);
  const totalItems = transaction.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const total = formatPrice(Number(transaction.amount));
  const subject = `Order ${transaction.transactionCode} confirmed - ${siteName}`;

  const html = layoutEmail(
    'Order confirmed',
    `
      <p>Hi ${escapeHtml(buyerName)},</p>
      <p>Thanks for your order from ${escapeHtml(siteName)}. We received your payment and will process the order shortly.</p>
      <div class="panel">
        <strong>Order code:</strong> ${escapeHtml(transaction.transactionCode)}<br>
        <strong>Order date:</strong> ${escapeHtml(orderDate)}<br>
        <strong>Items:</strong> ${totalItems}<br>
        <strong>Payment method:</strong> ${paymentMethodLabel(transaction.paymentMethod)}<br>
        <strong>Total:</strong> ${escapeHtml(total)}
      </div>
      <h2>Shipping</h2>
      <p>
        <strong>Name:</strong> ${escapeHtml(buyerName)}<br>
        <strong>Phone:</strong> ${escapeHtml(buyerPhone)}<br>
        <strong>Address:</strong> ${escapeHtml(transaction.shippingAddress || 'Not provided')}<br>
        ${
          transaction.postalCode
            ? `<strong>Postal code:</strong> ${escapeHtml(transaction.postalCode)}`
            : ''
        }
      </p>
      <h2>Order items</h2>
      ${buildItemsRows(transaction)}
      <div class="total">Total: ${escapeHtml(total)}</div>
    `
  );

  const text = `Order confirmed

Hi ${buyerName},

Thanks for your order from ${siteName}. We received your payment and will process the order shortly.

Order code: ${transaction.transactionCode}
Order date: ${orderDate}
Items: ${totalItems}
Payment method: ${paymentMethodLabel(transaction.paymentMethod)}
Total: ${total}

Shipping
Name: ${buyerName}
Phone: ${buyerPhone}
Address: ${transaction.shippingAddress || 'Not provided'}
${transaction.postalCode ? `Postal code: ${transaction.postalCode}` : ''}

Order items

${buildItemsText(transaction)}

Total: ${total}`;

  const result = await sendEmail({
    to: buyerEmail,
    subject,
    html,
    text,
  });

  if (result.success) {
    log.info('Buyer order confirmation sent', {
      transactionCode: transaction.transactionCode,
      buyerEmail,
      messageId: result.messageId,
    });
  }

  return result;
}

export async function sendAdminOrderConfirmation(
  transaction: TransactionEmailData,
  refId?: number
): Promise<SendEmailResult> {
  const adminEmail = process.env.ADMIN_EMAIL;

  log.info('Attempting to send admin order confirmation', {
    transactionCode: transaction.transactionCode,
    adminEmailConfigured: !!adminEmail,
  });

  if (!adminEmail) {
    log.warn('ADMIN_EMAIL not configured, skipping admin confirmation email');
    return {
      success: false,
      error: 'ADMIN_EMAIL not configured',
    };
  }

  const buyerName =
    transaction.user?.name || transaction.fullName || 'Customer';
  const buyerPhone =
    transaction.user?.phone || transaction.phone || 'Not provided';
  const buyerEmail =
    transaction.user?.email || transaction.email || 'Not provided';
  const accountType = transaction.isGuest
    ? 'Guest checkout'
    : 'Registered user';
  const orderDate = formatDateTime(transaction.createdAt);
  const totalItems = transaction.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const total = formatPrice(Number(transaction.amount));
  const subject = `New order ${transaction.transactionCode} - ${buyerName}`;

  const html = layoutEmail(
    'New order received',
    `
      <div class="panel">
        <strong>Order code:</strong> ${escapeHtml(transaction.transactionCode)}<br>
        <strong>Order date:</strong> ${escapeHtml(orderDate)}<br>
        <strong>Items:</strong> ${totalItems}<br>
        <strong>Payment method:</strong> ${paymentMethodLabel(transaction.paymentMethod)}<br>
        ${refId ? `<strong>Payment reference:</strong> ${refId}<br>` : ''}
        <strong>Total:</strong> ${escapeHtml(total)}
      </div>
      <h2>Customer</h2>
      <p>
        <strong>Name:</strong> ${escapeHtml(buyerName)}<br>
        <strong>Phone:</strong> ${escapeHtml(buyerPhone)}<br>
        <strong>Email:</strong> ${escapeHtml(buyerEmail)}<br>
        <strong>Account type:</strong> ${accountType}
      </p>
      <h2>Shipping</h2>
      <p>
        <strong>Address:</strong> ${escapeHtml(transaction.shippingAddress || 'Not provided')}<br>
        ${
          transaction.postalCode
            ? `<strong>Postal code:</strong> ${escapeHtml(transaction.postalCode)}`
            : ''
        }
      </p>
      <h2>Order items</h2>
      ${buildItemsRows(transaction)}
      <div class="total">Total: ${escapeHtml(total)}</div>
    `
  );

  const text = `New order received

Order code: ${transaction.transactionCode}
Order date: ${orderDate}
Items: ${totalItems}
Payment method: ${paymentMethodLabel(transaction.paymentMethod)}
${refId ? `Payment reference: ${refId}` : ''}
Total: ${total}

Customer
Name: ${buyerName}
Phone: ${buyerPhone}
Email: ${buyerEmail}
Account type: ${accountType}

Shipping
Address: ${transaction.shippingAddress || 'Not provided'}
${transaction.postalCode ? `Postal code: ${transaction.postalCode}` : ''}

Order items

${buildItemsText(transaction)}

Total: ${total}`;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
  });

  if (result.success) {
    log.info('Admin order confirmation sent', {
      transactionCode: transaction.transactionCode,
      adminEmail,
      messageId: result.messageId,
    });
  }

  return result;
}
