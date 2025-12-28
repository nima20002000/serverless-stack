import { NextRequest, NextResponse } from 'next/server';
import { sendOTP } from '@/services/otp-service';
import {
  validatePhone,
  validateEmail,
  getUserByIdentifier,
} from '@/services/user-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Send OTP code to phone number or email
 * POST /api/auth/send-otp
 * Body: { phone?: string, email?: string, purpose: 'register' | 'login' }
 */
export async function POST(req: NextRequest) {
  // Extract client info for activity logging
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const { phone, email, purpose = 'register' } = await req.json();

    // Must provide either phone or email
    const identifier = phone || email;
    if (!identifier) {
      return NextResponse.json(
        { error: 'ایمیل یا شماره تلفن الزامی است' },
        { status: 400 }
      );
    }

    // Validate identifier format
    if (phone && !validatePhone(phone)) {
      return NextResponse.json(
        { error: 'شماره تلفن نامعتبر است. فرمت صحیح: 09xxxxxxxxx' },
        { status: 400 }
      );
    }

    if (email && !validateEmail(email)) {
      return NextResponse.json(
        { error: 'فرمت ایمیل نامعتبر است' },
        { status: 400 }
      );
    }

    // Validate purpose
    if (!['register', 'login', 'checkout'].includes(purpose)) {
      return NextResponse.json(
        { error: 'نوع درخواست نامعتبر است' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await getUserByIdentifier(identifier);

    // For registration: user should NOT exist
    if (purpose === 'register' && existingUser) {
      return NextResponse.json(
        { error: 'کاربری با این ایمیل یا شماره تلفن قبلاً ثبت‌نام کرده است' },
        { status: 400 }
      );
    }

    // For login: user MUST exist
    if (purpose === 'login' && !existingUser) {
      return NextResponse.json(
        { error: 'کاربری با این مشخصات یافت نشد' },
        { status: 404 }
      );
    }

    // For checkout: existing users should log in, only allow OTP for new users
    if (purpose === 'checkout' && existingUser) {
      return NextResponse.json(
        {
          error:
            'این شماره قبلاً ثبت‌نام شده است. لطفاً وارد حساب کاربری خود شوید',
        },
        { status: 400 }
      );
    }

    log.info('Sending OTP', { identifier, purpose });

    // Send OTP
    const result = await sendOTP(identifier, purpose);

    if (!result.success) {
      // Log failed OTP send (fire-and-forget)
      const isEmail = identifier.includes('@');
      logUserActivity({
        userId: existingUser?.id || null,
        activityType: 'OTP_SENT',
        ipAddress,
        userAgent,
        success: false,
        errorMessage: result.error,
        metadata: {
          identifier_type: isEmail ? 'email' : 'phone',
          purpose,
          errorCode: result.errorCode,
        },
      }).catch((err) => {
        log.warn('Failed to log OTP send failure', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      // Return 429 for rate limit errors, 500 for send failures
      const statusCode = result.errorCode === 'RATE_LIMIT' ? 429 : 500;
      return NextResponse.json(
        {
          error: result.error,
          expiresAt: result.expiresAt,
        },
        { status: statusCode }
      );
    }

    const isEmail = identifier.includes('@');
    const message = isEmail
      ? 'کد تایید به ایمیل شما ارسال شد'
      : 'کد تایید به شماره شما ارسال شد';

    // Log OTP sent (fire-and-forget)
    logUserActivity({
      userId: existingUser?.id || null,
      activityType: 'OTP_SENT',
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        identifier_type: isEmail ? 'email' : 'phone',
        purpose,
      },
    }).catch((err) => {
      log.warn('Failed to log OTP sent', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    return NextResponse.json({
      success: true,
      message,
      expiresIn: 300, // 5 minutes in seconds
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    log.error('Send OTP error', { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'خطا در ارسال کد تایید',
      },
      { status: 500 }
    );
  }
}
