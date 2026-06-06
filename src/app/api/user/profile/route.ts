import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createClient } from '@/lib/supabase/server';
import { withLogging } from '@/lib/api/with-logging';
import { updateUserProfile } from '@/services/user-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/user/profile - Get current user's profile
async function getHandler() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Sign in to continue.' },
        { status: 401 }
      );
    }

    const supabase = createClient();

    const { data: user, error } = await supabase
      .from('users')
      .select(
        'id, uid, name, email, phone, shippingAddress, shippingCountry, shippingRegion, shippingCity, shippingAddressLine1, shippingAddressLine2, postalCode, isVerified, role, createdAt, password'
      )
      .eq('id', session.user.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Return user info with hasPassword flag (don't send actual password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return NextResponse.json({
      ...userWithoutPassword,
      createdAt: new Date(user.createdAt),
      hasPassword: !!password,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Unable to load user profile.' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/profile - Update current user's profile
async function patchHandler(req: NextRequest) {
  // Extract client info for activity logging
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Sign in to continue.' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const {
      name,
      email,
      phone,
      shippingAddress,
      shippingCountry,
      shippingRegion,
      shippingCity,
      shippingAddressLine1,
      shippingAddressLine2,
      postalCode,
    } = data;

    // Update user profile using service
    const updatedUser = await updateUserProfile(session.user.id, {
      name,
      email,
      phone,
      shippingAddress,
      shippingCountry,
      shippingRegion,
      shippingCity,
      shippingAddressLine1,
      shippingAddressLine2,
      postalCode,
    });

    // Log profile update (fire-and-forget)
    logUserActivity({
      userId: session.user.id,
      activityType: 'PROFILE_UPDATE',
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        updated_fields: Object.keys(data).filter(
          (key) => data[key] !== undefined
        ),
      },
    }).catch((err) => {
      log.warn('Failed to log profile update', {
        userId: session.user.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    return NextResponse.json({
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update your profile.',
      },
      { status: 500 }
    );
  }
}

export const GET = withLogging(getHandler, 'GET /api/user/profile');
export const PATCH = withLogging(patchHandler, 'PATCH /api/user/profile');
