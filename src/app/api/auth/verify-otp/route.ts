import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/services/otp-service';
import { createUser } from '@/services/user-service';
import { authenticateUserByPhone } from '@/services/auth-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Verify OTP code
 * POST /api/auth/verify-otp
 * Body: { phone: string, otp: string, purpose: 'register' | 'login', name?: string, password?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { phone, otp, name, password, purpose = 'register' } = await req.json();

    // Validate required fields
    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'شماره تلفن و کد تایید الزامی است' },
        { status: 400 }
      );
    }

    log.info('Verifying OTP', { phone, purpose });

    // Verify OTP
    const result = await verifyOTP(phone, otp, purpose);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          attemptsLeft: result.attemptsLeft
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

      // Create user with phone and password (name is optional)
      const user = await createUser({
        phone,
        name: name || '',
        password
      });

      log.info('User registered successfully via phone OTP', { phone, userId: user.id });

      return NextResponse.json({
        success: true,
        message: 'ثبت‌نام با موفقیت انجام شد',
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role
        }
      });
    }

    // For login: Verify user exists
    if (purpose === 'login') {
      const user = await authenticateUserByPhone(phone);

      log.info('User logged in successfully via phone OTP', { phone, userId: user.id });

      return NextResponse.json({
        success: true,
        message: 'ورود با موفقیت انجام شد',
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'کد تایید معتبر است'
    });
  } catch (error) {
    log.error('Verify OTP error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در تایید کد' },
      { status: 500 }
    );
  }
}
