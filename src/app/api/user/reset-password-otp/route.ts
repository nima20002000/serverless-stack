import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { withLogging } from '@/lib/api/with-logging';
import { verifyOTP } from '@/services/otp-service-supabase';
import { resetPasswordWithOTP } from '@/services/user-service-supabase';

export const dynamic = 'force-dynamic';

// POST /api/user/reset-password-otp - Reset password using OTP verification
async function postHandler(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'برای دسترسی به این صفحه باید وارد شوید' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { otp, newPassword } = data;

    // Validate required fields
    if (!otp || !newPassword) {
      return NextResponse.json(
        { error: 'کد OTP و رمز عبور جدید الزامی است' },
        { status: 400 }
      );
    }

    // Get user's phone or email for OTP verification
    // We need to fetch from database to get the identifier
    const { getUserById } = await import('@/services/user-service-supabase');
    const user = await getUserById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { error: 'کاربر یافت نشد' },
        { status: 404 }
      );
    }

    const identifier = user.phone || user.email;
    if (!identifier) {
      return NextResponse.json(
        { error: 'شماره تلفن یا ایمیل یافت نشد' },
        { status: 400 }
      );
    }

    // Verify OTP
    const result = await verifyOTP(identifier, otp, 'login');

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          attemptsLeft: result.attemptsLeft,
        },
        { status: 400 }
      );
    }

    // Reset password
    await resetPasswordWithOTP(session.user.id, newPassword);

    return NextResponse.json({
      success: true,
      message: 'رمز عبور با موفقیت بازیابی شد',
    });
  } catch (error) {
    console.error('Error resetting password with OTP:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در بازیابی رمز عبور' },
      { status: 500 }
    );
  }
}

export const POST = withLogging(postHandler, 'POST /api/user/reset-password-otp');
