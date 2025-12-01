import prisma from '@/lib/prisma/client';
import { sendOTPSMS } from '@/lib/kavenegar/client';
import { sendOTPEmail } from '@/lib/email/client';
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
    // FIRST: Delete all expired OTPs to prevent stale records from blocking new requests
    await prisma.oTPVerification.deleteMany({
      where: {
        identifier,
        purpose,
        expiresAt: {
          lt: new Date() // Delete if expired
        }
      }
    });

    log.info('Cleaned up expired OTPs', { identifier, purpose });

    // THEN: Check rate limiting for RECENT non-expired OTPs (max 1 OTP per minute)
    const recentOTP = await prisma.oTPVerification.findFirst({
      where: {
        identifier,
        purpose,
        createdAt: {
          gte: new Date(Date.now() - 60000) // Last 1 minute
        },
        expiresAt: {
          gte: new Date() // Only check non-expired OTPs
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

    // Delete any remaining old OTPs for this identifier and purpose (shouldn't be any after cleanup above)
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

    // Send OTP via appropriate channel based on identifier type
    if (identifier.startsWith('09')) {
      // Phone number: Send SMS via Kavenegar
      const result = await sendOTPSMS(identifier, code);
      if (!result.success) {
        log.error('Failed to send OTP SMS', { identifier, error: result.error });
        return {
          success: false,
          expiresAt: expiresAt.getTime(),
          error: 'خطا در ارسال پیامک. لطفاً دوباره تلاش کنید.'
        };
      }
    } else if (identifier.includes('@')) {
      // Email address: Send email
      const result = await sendOTPEmail(identifier, code);
      if (!result.success) {
        log.error('Failed to send OTP email', { identifier, error: result.error });
        return {
          success: false,
          expiresAt: expiresAt.getTime(),
          error: 'خطا در ارسال ایمیل. لطفاً دوباره تلاش کنید.'
        };
      }
    } else {
      log.error('Invalid identifier format', { identifier });
      return {
        success: false,
        expiresAt: expiresAt.getTime(),
        error: 'فرمت ایمیل یا شماره تلفن نامعتبر است'
      };
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
