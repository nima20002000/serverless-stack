import 'server-only';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { log } from '@/lib/logger';
import { siteConfig } from '@/config/site';
import { formatDateTime, formatPrice } from '@/lib/utils/format';
import {
  defaultLocale,
  getLocaleDirection,
  isSupportedLocale,
  type Locale,
} from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { createTranslator } from '@/lib/i18n/translate';
import { getIntlLocale } from '@/lib/seo/localized-metadata';

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
const configuredLanguage = isSupportedLocale(siteConfig.language)
  ? siteConfig.language
  : defaultLocale;

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

type EmailI18n = {
  locale: Locale;
  intlLocale: string;
  direction: ReturnType<typeof getLocaleDirection>;
  t: ReturnType<typeof createTranslator>;
};

type EmailLocaleOptions = {
  locale?: Locale;
};

function getEmailI18n(options: EmailLocaleOptions = {}): EmailI18n {
  const locale = options.locale || configuredLanguage;
  return {
    locale,
    intlLocale: getIntlLocale(locale),
    direction: getLocaleDirection(locale),
    t: createTranslator(getDictionary(locale)),
  };
}

function layoutEmail(title: string, body: string, i18n: EmailI18n): string {
  return `
<!DOCTYPE html>
<html dir="${i18n.direction}" lang="${i18n.locale}">
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
      <p>${escapeHtml(i18n.t('email.automated'))}</p>
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
  otp: string,
  options: EmailLocaleOptions = {}
): Promise<SendEmailResult> {
  const i18n = getEmailI18n(options);
  const safeOtp = escapeHtml(otp);
  const title = i18n.t('email.otpSubject', { siteName });
  const html = layoutEmail(
    title,
    `
      <p>${escapeHtml(i18n.t('email.otpIntro', { siteName }))}</p>
      <div class="code">${safeOtp}</div>
      <p>${escapeHtml(i18n.t('email.otpExpiry'))}</p>
    `,
    i18n
  );
  const text = `${title}

${i18n.t('email.code')}: ${otp}

${i18n.t('email.otpExpiry')}`;

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

function buildItemsRows(transaction: TransactionEmailData, i18n: EmailI18n) {
  const rows = transaction.items
    .map((item, index) => {
      const variant = item.variant?.name
        ? `<br><small>${escapeHtml(item.variant.name)}</small>`
        : '';
      const unitPrice = formatPrice(Number(item.price), {
        locale: i18n.intlLocale,
      });
      const lineTotal = formatPrice(Number(item.price) * item.quantity, {
        locale: i18n.intlLocale,
      });

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
          <th>${escapeHtml(i18n.t('email.product'))}</th>
          <th>${escapeHtml(i18n.t('email.quantity'))}</th>
          <th>${escapeHtml(i18n.t('email.unitPrice'))}</th>
          <th>${escapeHtml(i18n.t('email.lineTotal'))}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildItemsText(
  transaction: TransactionEmailData,
  i18n: EmailI18n
): string {
  return transaction.items
    .map((item, index) => {
      const variant = item.variant?.name ? ` (${item.variant.name})` : '';
      const unitPrice = formatPrice(Number(item.price), {
        locale: i18n.intlLocale,
      });
      const lineTotal = formatPrice(Number(item.price) * item.quantity, {
        locale: i18n.intlLocale,
      });

      return `${index + 1}. ${item.product.name}${variant}
   ${i18n.t('email.quantity')}: ${item.quantity}
   ${i18n.t('email.unitPrice')}: ${unitPrice}
   ${i18n.t('email.lineTotal')}: ${lineTotal}`;
    })
    .join('\n\n');
}

export async function sendBuyerOrderConfirmation(
  transaction: TransactionEmailData,
  options: EmailLocaleOptions = {}
): Promise<SendEmailResult> {
  const i18n = getEmailI18n(options);
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
    transaction.user?.name ||
    transaction.fullName ||
    i18n.t('email.customerFallback');
  const buyerPhone =
    transaction.user?.phone || transaction.phone || i18n.t('email.notProvided');
  const orderDate = formatDateTime(transaction.createdAt, {
    locale: i18n.intlLocale,
  });
  const totalItems = transaction.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const total = formatPrice(Number(transaction.amount), {
    locale: i18n.intlLocale,
  });
  const subject = i18n.t('email.orderConfirmedSubject', {
    orderCode: transaction.transactionCode,
    siteName,
  });

  const html = layoutEmail(
    i18n.t('email.orderConfirmedTitle'),
    `
      <p>${escapeHtml(i18n.t('email.orderConfirmedGreeting', { buyerName }))}</p>
      <p>${escapeHtml(i18n.t('email.orderConfirmedIntro', { siteName }))}</p>
      <div class="panel">
        <strong>${escapeHtml(i18n.t('email.orderCode'))}:</strong> ${escapeHtml(transaction.transactionCode)}<br>
        <strong>${escapeHtml(i18n.t('email.orderDate'))}:</strong> ${escapeHtml(orderDate)}<br>
        <strong>${escapeHtml(i18n.t('email.items'))}:</strong> ${totalItems}<br>
        <strong>${escapeHtml(i18n.t('email.paymentMethod'))}:</strong> ${paymentMethodLabel(transaction.paymentMethod)}<br>
        <strong>${escapeHtml(i18n.t('email.total'))}:</strong> ${escapeHtml(total)}
      </div>
      <h2>${escapeHtml(i18n.t('email.shipping'))}</h2>
      <p>
        <strong>${escapeHtml(i18n.t('email.name'))}:</strong> ${escapeHtml(buyerName)}<br>
        <strong>${escapeHtml(i18n.t('email.phone'))}:</strong> ${escapeHtml(buyerPhone)}<br>
        <strong>${escapeHtml(i18n.t('email.address'))}:</strong> ${escapeHtml(transaction.shippingAddress || i18n.t('email.notProvided'))}<br>
        ${
          transaction.postalCode
            ? `<strong>${escapeHtml(i18n.t('email.postalCode'))}:</strong> ${escapeHtml(transaction.postalCode)}`
            : ''
        }
      </p>
      <h2>${escapeHtml(i18n.t('email.orderItems'))}</h2>
      ${buildItemsRows(transaction, i18n)}
      <div class="total">${escapeHtml(i18n.t('email.total'))}: ${escapeHtml(total)}</div>
    `,
    i18n
  );

  const text = `${i18n.t('email.orderConfirmedTitle')}

${i18n.t('email.orderConfirmedGreeting', { buyerName })}

${i18n.t('email.orderConfirmedIntro', { siteName })}

${i18n.t('email.orderCode')}: ${transaction.transactionCode}
${i18n.t('email.orderDate')}: ${orderDate}
${i18n.t('email.items')}: ${totalItems}
${i18n.t('email.paymentMethod')}: ${paymentMethodLabel(transaction.paymentMethod)}
${i18n.t('email.total')}: ${total}

${i18n.t('email.shipping')}
${i18n.t('email.name')}: ${buyerName}
${i18n.t('email.phone')}: ${buyerPhone}
${i18n.t('email.address')}: ${transaction.shippingAddress || i18n.t('email.notProvided')}
${transaction.postalCode ? `${i18n.t('email.postalCode')}: ${transaction.postalCode}` : ''}

${i18n.t('email.orderItems')}

${buildItemsText(transaction, i18n)}

${i18n.t('email.total')}: ${total}`;

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
  const i18n = getEmailI18n({ locale: defaultLocale });
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
      ${buildItemsRows(transaction, i18n)}
      <div class="total">Total: ${escapeHtml(total)}</div>
    `,
    i18n
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

${buildItemsText(transaction, i18n)}

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
