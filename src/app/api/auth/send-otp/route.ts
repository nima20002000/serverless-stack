import { NextRequest, NextResponse } from 'next/server';
import { sendOTP } from '@/services/otp-service';
import { validatePhone } from '@/services/user-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Send OTP code to phone number
 * POST /api/auth/send-otp
 * Body: { phone: string, purpose: 'register' | 'login' }
 */
export async function POST(req: NextRequest) {
  try {
    const { phone, purpose = 'register' } = await req.json();

    // Validate phone number
    if (!phone || !validatePhone(phone)) {
      return NextResponse.json(
        { error: 'شماره تلفن نامعتبر است. فرمت صحیح: 09xxxxxxxxx' },
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

    log.info('Sending OTP', { phone, purpose });

    // Send OTP
    const result = await sendOTP(phone, purpose);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          expiresAt: result.expiresAt
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'کد تایید به شماره شما ارسال شد',
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
