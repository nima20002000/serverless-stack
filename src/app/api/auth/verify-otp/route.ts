import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/services/otp-service';
import { createUser, getUserByIdentifier } from '@/services/user-service';
import { authenticateUserByPhone } from '@/services/auth-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';
import { log } from '@/lib/logger';
import { createOtpToken } from '@/lib/auth/otp-token';

export const dynamic = 'force-dynamic';

/**
 * Verify OTP code
 * POST /api/auth/verify-otp
 * Body: { phone?: string, email?: string, otp: string, purpose: 'register' | 'login', name?: string, password?: string }
 */
export async function POST(req: NextRequest) {
  // Extract client info for activity logging
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const {
      phone,
      email,
      otp,
      name,
      password,
      purpose = 'register',
    } = await req.json();

    // Must provide either phone or email
    const identifier = phone || email;
    if (!identifier || !otp) {
      return NextResponse.json(
        { error: 'ایمیل یا شماره تلفن و کد تایید الزامی است' },
        { status: 400 }
      );
    }

    const isEmail = identifier.includes('@');

    log.info('Verifying OTP', { identifier, purpose });

    // Verify OTP
    const result = await verifyOTP(identifier, otp, purpose);

    if (!result.success) {
      // Log failed OTP verification (fire-and-forget)
      logUserActivity({
        activityType: 'OTP_FAILED',
        ipAddress,
        userAgent,
        success: false,
        errorMessage: result.error || 'OTP verification failed',
        metadata: {
          identifier_type: isEmail ? 'email' : 'phone',
          purpose,
          attemptsLeft: result.attemptsLeft,
        },
      }).catch((err) => {
        log.warn('Failed to log OTP failure', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      return NextResponse.json(
        {
          error: result.error,
          attemptsLeft: result.attemptsLeft,
        },
        { status: 400 }
      );
    }

    // For registration: Create user
    if (purpose === 'register') {
      if (!password) {
        return NextResponse.json(
          { error: 'رمز عبور الزامی است' },
          { status: 400 }
        );
      }

      // Create user with email or phone and password (name is optional)
      const userData = isEmail
        ? { email: identifier, name: name || '', password }
        : { phone: identifier, name: name || '', password };

      const user = await createUser(userData);

      log.info('User registered successfully via OTP', {
        identifier,
        userId: user.id,
      });

      // Log successful OTP verification and registration (fire-and-forget)
      logUserActivity({
        userId: user.id,
        activityType: 'OTP_VERIFIED',
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          identifier_type: isEmail ? 'email' : 'phone',
          purpose,
        },
      }).catch((err) => {
        log.warn('Failed to log OTP verification', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      // Also log the registration
      logUserActivity({
        userId: user.id,
        activityType: 'REGISTER',
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          method: 'otp',
          identifier_type: isEmail ? 'email' : 'phone',
        },
      }).catch((err) => {
        log.warn('Failed to log registration', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      return NextResponse.json({
        success: true,
        message: 'ثبت‌نام با موفقیت انجام شد',
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }

    // For login: Verify user exists
    if (purpose === 'login') {
      const secret = process.env.NEXTAUTH_SECRET;
      if (!secret) {
        throw new Error('تنظیمات احراز هویت ناقص است');
      }

      // For phone login, use existing authenticateUserByPhone
      // For email login, use getUserByIdentifier
      const user = isEmail
        ? await getUserByIdentifier(identifier)
        : await authenticateUserByPhone(identifier);

      if (!user) {
        return NextResponse.json(
          { error: 'کاربری با این مشخصات یافت نشد' },
          { status: 404 }
        );
      }

      log.info('User logged in successfully via OTP', {
        identifier,
        userId: user.id,
      });

      // Log successful OTP verification (fire-and-forget)
      logUserActivity({
        userId: user.id,
        activityType: 'OTP_VERIFIED',
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          identifier_type: isEmail ? 'email' : 'phone',
          purpose,
        },
      }).catch((err) => {
        log.warn('Failed to log OTP verification', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      // Also log the login
      logUserActivity({
        userId: user.id,
        activityType: 'LOGIN_SUCCESS',
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          method: 'otp',
          identifier_type: isEmail ? 'email' : 'phone',
        },
      }).catch((err) => {
        log.warn('Failed to log login', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      return NextResponse.json({
        success: true,
        message: 'ورود با موفقیت انجام شد',
        otpToken: createOtpToken(identifier, 'login', secret),
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'کد تایید معتبر است',
    });
  } catch (error) {
    log.error('Verify OTP error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در تایید کد' },
      { status: 500 }
    );
  }
}
