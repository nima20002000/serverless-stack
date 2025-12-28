import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/services/auth-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Login endpoint - handles user authentication
 * This endpoint is rate-limited by middleware (5 requests per 2 minutes)
 * Returns user data which the client uses to trigger NextAuth session creation
 */
export async function POST(req: NextRequest) {
  // Extract client info for activity logging
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const body = await req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'ایمیل و رمز عبور الزامی است' },
        { status: 400 }
      );
    }

    // Authenticate user (throws error if invalid)
    const user = await authenticateUser(email, password);

    log.info('User authenticated successfully', {
      userId: user.id,
      email: user.email,
    });

    // Log successful login (fire-and-forget)
    logUserActivity({
      userId: user.id,
      activityType: 'LOGIN_SUCCESS',
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        identifier_type: email.includes('@') ? 'email' : 'phone',
      },
    }).catch((err) => {
      log.warn('Failed to log login success', {
        userId: user.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    // Return user data and credentials for NextAuth signIn
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      // Return credentials to use with NextAuth signIn
      credentials: {
        email,
        password,
      },
    });
  } catch (error) {
    // Log failed login (fire-and-forget)
    logUserActivity({
      activityType: 'LOGIN_FAILED',
      ipAddress,
      userAgent,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Login failed',
    }).catch((err) => {
      log.warn('Failed to log login failure', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    // Handle authentication errors
    if (error instanceof Error) {
      log.warn('Login failed', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    log.error('Unexpected login error', { error });
    return NextResponse.json(
      { error: 'خطا در ورود. لطفاً دوباره تلاش کنید.' },
      { status: 500 }
    );
  }
}
