import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { withLogging } from '@/lib/api/with-logging';
import { changeUserPassword, setUserPassword } from '@/services/user-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST /api/user/password - Change or set password
async function postHandler(req: NextRequest) {
  // Extract client info for activity logging
  const { ipAddress, userAgent } = getClientInfo(req);

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

      // Log password set (fire-and-forget)
      logUserActivity({
        userId: session.user.id,
        activityType: 'PASSWORD_CHANGE',
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          action: 'set',
        },
      }).catch((err) => {
        log.warn('Failed to log password set', {
          userId: session.user.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

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

      // Log password change (fire-and-forget)
      logUserActivity({
        userId: session.user.id,
        activityType: 'PASSWORD_CHANGE',
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          action: 'change',
        },
      }).catch((err) => {
        log.warn('Failed to log password change', {
          userId: session.user.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      return NextResponse.json({
        message: 'رمز عبور با موفقیت تغییر یافت',
      });
    }
  } catch (error) {
    console.error('Error managing user password:', error);

    // Log failed password change (fire-and-forget)
    const session = await getServerSession(authOptions);
    logUserActivity({
      userId: session?.user?.id || null,
      activityType: 'PASSWORD_CHANGE',
      ipAddress,
      userAgent,
      success: false,
      errorMessage:
        error instanceof Error ? error.message : 'Password change failed',
    }).catch((err) => {
      log.warn('Failed to log password change failure', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'خطا در مدیریت رمز عبور',
      },
      { status: 500 }
    );
  }
}

export const POST = withLogging(postHandler, 'POST /api/user/password');
