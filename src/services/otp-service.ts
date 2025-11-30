import prisma from '@/lib/prisma/client';
import { sendOTPSMS } from '@/lib/kavenegar/client';
import { log } from '@/lib/logger';

/**
 * Generate 6-digit OTP code
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to phone number
 * Implements rate limiting (1 OTP per minute per identifier)
 */
export async function sendOTP(
  identifier: string, // Email or phone
  purpose: 'register' | 'login' = 'register'
): Promise<{ success: boolean; expiresAt: number; error?: string }> {
  try {
    // Check rate limiting: max 1 OTP per minute per identifier
    const recentOTP = await prisma.oTPVerification.findFirst({
      where: {
        identifier,
        purpose,
        createdAt: {
          gte: new Date(Date.now() - 60000) // Last 1 minute
        }
      }
    });

    if (recentOTP) {
      const waitTime = 60 - Math.floor((Date.now() - recentOTP.createdAt.getTime()) / 1000);
      log.warn('OTP rate limit hit', { identifier, purpose, waitTime });
      return {
        success: false,
        expiresAt: recentOTP.expiresAt.getTime(),
        error: `لطفاً ${waitTime} ثانیه صبر کنید`
      };
    }

    // Delete old OTPs for this identifier and purpose
    await prisma.oTPVerification.deleteMany({
      where: { identifier, purpose }
    });

    // Generate new OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in database
    await prisma.oTPVerification.create({
      data: {
        identifier,
        code,
        purpose,
        expiresAt,
        attempts: 0,
        maxAttempts: 3
      }
    });

    log.info('OTP generated and stored', { identifier, purpose, expiresAt });

    // Send SMS only if identifier is a phone number (starts with 09)
    if (identifier.startsWith('09')) {
      const result = await sendOTPSMS(identifier, code);
      if (!result.success) {
        log.error('Failed to send OTP SMS', { identifier, error: result.error });
        return {
          success: false,
          expiresAt: expiresAt.getTime(),
          error: 'خطا در ارسال پیامک. لطفاً دوباره تلاش کنید.'
        };
      }
    }

    log.info('OTP sent successfully', { identifier, purpose });

    return { success: true, expiresAt: expiresAt.getTime() };
  } catch (error) {
    log.error('Failed to send OTP', { identifier, purpose, error });
    throw new Error('خطا در ارسال کد تایید');
  }
}

/**
 * Verify OTP code
 * Implements attempt limiting (max 3 attempts)
 */
export async function verifyOTP(
  identifier: string,
  code: string,
  purpose: 'register' | 'login' = 'register'
): Promise<{ success: boolean; error?: string; attemptsLeft?: number }> {
  try {
    const stored = await prisma.oTPVerification.findFirst({
      where: { identifier, purpose }
    });

    if (!stored) {
      log.warn('OTP verification failed: not found', { identifier, purpose });
      return { success: false, error: 'کد تایید یافت نشد یا منقضی شده است' };
    }

    // Check expiration
    if (new Date() > stored.expiresAt) {
      await prisma.oTPVerification.delete({ where: { id: stored.id } });
      log.warn('OTP verification failed: expired', { identifier, purpose });
      return { success: false, error: 'کد تایید منقضی شده است. لطفاً کد جدید درخواست کنید' };
    }

    // Check max attempts
    if (stored.attempts >= stored.maxAttempts) {
      await prisma.oTPVerification.delete({ where: { id: stored.id } });
      log.warn('OTP verification failed: max attempts exceeded', { identifier, purpose, attempts: stored.attempts });
      return { success: false, error: 'تعداد تلاش‌های شما به حداکثر رسیده است. لطفاً کد جدید درخواست کنید' };
    }

    // Increment attempts
    await prisma.oTPVerification.update({
      where: { id: stored.id },
      data: { attempts: stored.attempts + 1 }
    });

    // Verify code
    if (code === stored.code) {
      // Delete OTP after successful verification
      await prisma.oTPVerification.delete({ where: { id: stored.id } });
      log.info('OTP verified successfully', { identifier, purpose });
      return { success: true };
    }

    const attemptsLeft = stored.maxAttempts - (stored.attempts + 1);
    log.warn('OTP verification failed: invalid code', { identifier, purpose, attemptsLeft });

    return {
      success: false,
      error: attemptsLeft > 0
        ? `کد تایید اشتباه است. ${attemptsLeft} تلاش باقی‌مانده`
        : 'کد تایید اشتباه است',
      attemptsLeft
    };
  } catch (error) {
    log.error('Failed to verify OTP', { identifier, purpose, error });
    throw new Error('خطا در تایید کد');
  }
}
