import { createClient } from '@/lib/supabase/server';
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
 * Send OTP to phone number or email
 * Implements rate limiting (1 OTP per 2 minutes per identifier)
 */
export async function sendOTP(
  identifier: string, // Email or phone
  purpose: 'register' | 'login' | 'checkout' = 'register'
): Promise<{ success: boolean; expiresAt: number; error?: string; errorCode?: 'RATE_LIMIT' | 'SEND_FAILED' }> {
  try {
    log.info('🔵 sendOTP called', { identifier, purpose, timestamp: new Date().toISOString() });

    const supabase = createClient();

    // FIRST: Delete all expired OTPs to prevent stale records from blocking new requests
    const { count: deletedExpiredCount, error: deleteExpiredError } = await supabase
      .from('otp_verifications')
      .delete({ count: 'exact' })
      .eq('identifier', identifier)
      .eq('purpose', purpose)
      .lt('expiresAt', new Date().toISOString());

    if (!deleteExpiredError) {
      log.info('🔵 Cleaned up expired OTPs', { identifier, purpose, count: deletedExpiredCount });
    }

    // THEN: Check rate limiting for RECENT non-expired OTPs (max 1 OTP per 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
    const now = new Date().toISOString();

    const { data: recentOTP, error: recentError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('identifier', identifier)
      .eq('purpose', purpose)
      .gte('createdAt', twoMinutesAgo)
      .gte('expiresAt', now)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();

    log.info('🔵 Rate limit check', {
      identifier,
      purpose,
      recentOTPFound: !!recentOTP,
      recentOTPCreatedAt: recentOTP?.createdAt,
      recentOTPExpiresAt: recentOTP?.expiresAt,
      now: new Date().toISOString()
    });

    if (!recentError && recentOTP) {
      // Parse timestamp as UTC (Supabase returns timestamp without timezone)
      const createdAt = new Date(recentOTP.createdAt + 'Z').getTime();
      const rateLimitExpiresAt = createdAt + 120000; // Rate limit expires 2 minutes after creation
      const waitTime = Math.ceil((rateLimitExpiresAt - Date.now()) / 1000);
      log.warn('🔴 OTP rate limit hit', { identifier, purpose, waitTime, recentOTPId: recentOTP.id });
      return {
        success: false,
        expiresAt: rateLimitExpiresAt,
        error: `لطفاً ${waitTime} ثانیه صبر کنید`,
        errorCode: 'RATE_LIMIT'
      };
    }

    // Delete any remaining old OTPs for this identifier and purpose
    const { count: deletedRemainingCount } = await supabase
      .from('otp_verifications')
      .delete({ count: 'exact' })
      .eq('identifier', identifier)
      .eq('purpose', purpose);

    log.info('🔵 Deleted remaining OTPs', { identifier, purpose, count: deletedRemainingCount });

    // Generate new OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    log.info('🔵 Creating new OTP record', { identifier, purpose, code, expiresAt: expiresAt.toISOString() });

    // Store OTP in database
    const { data: otpRecord, error: createError } = await supabase
      .from('otp_verifications')
      .insert({
        id: crypto.randomUUID(),
        identifier,
        code,
        purpose,
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        maxAttempts: 3
      })
      .select()
      .single();

    if (createError || !otpRecord) {
      log.error('🔴 Failed to create OTP record', { identifier, purpose, error: createError });
      throw new Error('خطا در ایجاد کد تایید');
    }

    log.info('🔵 OTP generated and stored', {
      identifier,
      purpose,
      expiresAt: expiresAt.toISOString(),
      otpRecordId: otpRecord.id,
      createdAt: otpRecord.createdAt
    });

    // Send OTP via appropriate channel based on identifier type
    if (identifier.startsWith('09')) {
      // Phone number: Send SMS via Kavenegar
      const result = await sendOTPSMS(identifier, code);
      if (!result.success) {
        // Delete the OTP record since sending failed
        await supabase
          .from('otp_verifications')
          .delete()
          .eq('id', otpRecord.id);

        log.error('Failed to send OTP SMS', { identifier, error: result.error });
        return {
          success: false,
          expiresAt: expiresAt.getTime(),
          error: 'خطا در ارسال پیامک. لطفاً دوباره تلاش کنید.',
          errorCode: 'SEND_FAILED'
        };
      }
    } else if (identifier.includes('@')) {
      // Email address: Send email
      log.info('🔵 Attempting to send OTP email', { identifier, code, otpRecordId: otpRecord.id });
      const result = await sendOTPEmail(identifier, code);
      log.info('🔵 Email send result', { identifier, success: result.success, error: result.error });

      if (!result.success) {
        // Delete the OTP record since sending failed
        await supabase
          .from('otp_verifications')
          .delete()
          .eq('id', otpRecord.id);

        log.error('🔴 Failed to send OTP email - deleted OTP record', { identifier, error: result.error, otpRecordId: otpRecord.id });
        return {
          success: false,
          expiresAt: expiresAt.getTime(),
          error: 'خطا در ارسال ایمیل. لطفاً دوباره تلاش کنید.',
          errorCode: 'SEND_FAILED'
        };
      }
    } else {
      // Delete the OTP record since format is invalid
      await supabase
        .from('otp_verifications')
        .delete()
        .eq('id', otpRecord.id);

      log.error('Invalid identifier format', { identifier });
      return {
        success: false,
        expiresAt: expiresAt.getTime(),
        error: 'فرمت ایمیل یا شماره تلفن نامعتبر است',
        errorCode: 'SEND_FAILED'
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
  purpose: 'register' | 'login' | 'checkout' = 'register'
): Promise<{ success: boolean; error?: string; attemptsLeft?: number }> {
  try {
    const supabase = createClient();

    const { data: stored, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('identifier', identifier)
      .eq('purpose', purpose)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !stored) {
      log.warn('OTP verification failed: not found', { identifier, purpose });
      return { success: false, error: 'کد تایید یافت نشد یا منقضی شده است' };
    }

    // Check expiration (parse timestamp as UTC - Supabase returns timestamp without timezone)
    if (new Date() > new Date(stored.expiresAt + 'Z')) {
      await supabase
        .from('otp_verifications')
        .delete()
        .eq('id', stored.id);

      log.warn('OTP verification failed: expired', { identifier, purpose });
      return { success: false, error: 'کد تایید منقضی شده است. لطفاً کد جدید درخواست کنید' };
    }

    // Check max attempts
    if (stored.attempts >= stored.maxAttempts) {
      await supabase
        .from('otp_verifications')
        .delete()
        .eq('id', stored.id);

      log.warn('OTP verification failed: max attempts exceeded', { identifier, purpose, attempts: stored.attempts });
      return { success: false, error: 'تعداد تلاش‌های شما به حداکثر رسیده است. لطفاً کد جدید درخواست کنید' };
    }

    // Increment attempts
    await supabase
      .from('otp_verifications')
      .update({ attempts: stored.attempts + 1 })
      .eq('id', stored.id);

    // Verify code
    if (code === stored.code) {
      // Delete OTP after successful verification
      await supabase
        .from('otp_verifications')
        .delete()
        .eq('id', stored.id);

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
