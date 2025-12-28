import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/services/otp-service';
import { createUser, getUserByIdentifier } from '@/services/user-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Verify OTP code during checkout flow
 * POST /api/auth/checkout-verify-otp
 *
 * This endpoint handles three scenarios:
 * 1. Existing user login via OTP - returns user info for NextAuth signIn
 * 2. New user registration via OTP (if createAccount=true) - creates user and returns info
 * 3. Guest verification (if createAccount=false) - just verifies OTP
 */
export async function POST(req: NextRequest) {
  // Extract client info for activity logging
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const { phone, email, code, purpose, createAccount, name } =
      await req.json();

    // Must provide either phone or email
    const identifier = phone || email;
    if (!identifier || !code) {
      return NextResponse.json(
        { error: 'شماره تلفن یا ایمیل و کد تایید الزامی است' },
        { status: 400 }
      );
    }

    const isEmail = identifier.includes('@');

    log.info('Verifying OTP for checkout', {
      identifier,
      purpose,
      createAccount,
    });

    // Verify OTP
    const result = await verifyOTP(identifier, code, purpose || 'login');

    if (!result.success) {
      // Log failed OTP verification (fire-and-forget)
      logUserActivity({
        activityType: 'OTP_FAILED',
        ipAddress,
        userAgent,
        success: false,
        errorMessage: result.error || 'Checkout OTP verification failed',
        metadata: {
          identifier_type: isEmail ? 'email' : 'phone',
          purpose: purpose || 'login',
          attemptsLeft: result.attemptsLeft,
          flow: 'checkout',
        },
      }).catch((err) => {
        log.warn('Failed to log checkout OTP failure', {
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

    // Check if user exists
    const existingUser = await getUserByIdentifier(identifier);

    // Scenario 1: Existing user - auto-login (even if createAccount is false)
    if (existingUser) {
      log.info('Existing user verified via OTP - ready for auto-login', {
        identifier,
        userId: existingUser.id,
      });

      // Log successful OTP verification (fire-and-forget)
      logUserActivity({
        userId: existingUser.id,
        activityType: 'OTP_VERIFIED',
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          identifier_type: isEmail ? 'email' : 'phone',
          purpose: purpose || 'login',
          flow: 'checkout',
        },
      }).catch((err) => {
        log.warn('Failed to log checkout OTP verification', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      // Also log the login
      logUserActivity({
        userId: existingUser.id,
        activityType: 'LOGIN_SUCCESS',
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          method: 'otp',
          identifier_type: isEmail ? 'email' : 'phone',
          flow: 'checkout',
        },
      }).catch((err) => {
        log.warn('Failed to log checkout login', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      return NextResponse.json({
        success: true,
        action: 'login',
        message: 'ورود با موفقیت انجام شد',
        identifier: identifier,
      });
    }

    // Scenario 2: New user with createAccount=true - register and auto-login
    if (createAccount) {
      log.info('Creating new user account via checkout OTP', {
        identifier,
        name,
      });

      // Generate a temporary password for OTP-based registration
      const tempPassword =
        Math.random().toString(36).slice(-12) +
        Math.random().toString(36).slice(-12);

      const userData = isEmail
        ? { email: identifier, name: name || '', password: tempPassword }
        : { phone: identifier, name: name || '', password: tempPassword };

      const newUser = await createUser(userData);

      log.info('New user created via checkout OTP - ready for auto-login', {
        identifier,
        userId: newUser.id,
      });

      // Log successful OTP verification (fire-and-forget)
      logUserActivity({
        userId: newUser.id,
        activityType: 'OTP_VERIFIED',
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          identifier_type: isEmail ? 'email' : 'phone',
          purpose: purpose || 'checkout',
          flow: 'checkout',
        },
      }).catch((err) => {
        log.warn('Failed to log checkout OTP verification', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      // Also log the registration
      logUserActivity({
        userId: newUser.id,
        activityType: 'REGISTER',
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          method: 'otp',
          identifier_type: isEmail ? 'email' : 'phone',
          flow: 'checkout',
        },
      }).catch((err) => {
        log.warn('Failed to log checkout registration', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      return NextResponse.json({
        success: true,
        action: 'register',
        message: 'حساب کاربری با موفقیت ایجاد شد',
        identifier: identifier,
      });
    }

    // Scenario 3: User doesn't exist and createAccount=false
    // This shouldn't happen in the new flow, but handle it gracefully
    log.warn('OTP verified but user not found and createAccount=false', {
      identifier,
    });

    return NextResponse.json(
      {
        error: 'برای ایجاد حساب کاربری، گزینه "ساخت حساب کاربری" را فعال کنید',
      },
      { status: 400 }
    );
  } catch (error) {
    log.error('Checkout OTP verification error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در تایید کد' },
      { status: 500 }
    );
  }
}
