import { NextRequest, NextResponse } from 'next/server';
import { sendOTP } from '@/services/otp-service';
import { validatePhone, validateEmail } from '@/services/user-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Send OTP code to phone number or email
 * POST /api/auth/send-otp
 * Body: { phone?: string, email?: string, purpose: 'register' | 'login' }
 */
export async function POST(req: NextRequest) {
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
    if (!['register', 'login'].includes(purpose)) {
      return NextResponse.json(
        { error: 'نوع درخواست نامعتبر است' },
        { status: 400 }
      );
    }

    log.info('Sending OTP', { identifier, purpose });

    // Send OTP
    const result = await sendOTP(identifier, purpose);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          expiresAt: result.expiresAt
        },
        { status: 429 }
      );
    }

    const isEmail = identifier.includes('@');
    const message = isEmail
      ? 'کد تایید به ایمیل شما ارسال شد'
      : 'کد تایید به شماره شما ارسال شد';

    return NextResponse.json({
      success: true,
      message,
      expiresIn: 300, // 5 minutes in seconds
      expiresAt: result.expiresAt
    });
  } catch (error) {
    log.error('Send OTP error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در ارسال کد تایید' },
      { status: 500 }
    );
  }
}
