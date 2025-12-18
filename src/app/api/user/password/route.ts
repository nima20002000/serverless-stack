import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { withLogging } from '@/lib/api/with-logging';
import { changeUserPassword, setUserPassword } from '@/services/user-service-supabase';

export const dynamic = 'force-dynamic';

// POST /api/user/password - Change or set password
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
    const { currentPassword, newPassword, action } = data;

    // Validate required fields
    if (!newPassword) {
      return NextResponse.json(
        { error: 'رمز عبور جدید الزامی است' },
        { status: 400 }
      );
    }

    // Action: "change" or "set"
    if (action === 'set') {
      // Set password for users without a password (NULL in database)
      await setUserPassword(session.user.id, newPassword);
      return NextResponse.json({
        message: 'رمز عبور با موفقیت تنظیم شد',
      });
    } else {
      // Change password - REQUIRES current password for security
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'رمز عبور فعلی الزامی است' },
          { status: 400 }
        );
      }

      await changeUserPassword(session.user.id, currentPassword, newPassword);
      return NextResponse.json({
        message: 'رمز عبور با موفقیت تغییر یافت',
      });
    }
  } catch (error) {
    console.error('Error managing user password:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در مدیریت رمز عبور' },
      { status: 500 }
    );
  }
}

export const POST = withLogging(postHandler, 'POST /api/user/password');
