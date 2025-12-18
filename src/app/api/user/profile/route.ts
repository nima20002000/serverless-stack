import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createClient } from '@/lib/supabase/server';
import { withLogging } from '@/lib/api/with-logging';
import { updateUserProfile } from '@/services/user-service-supabase';

export const dynamic = 'force-dynamic';

// GET /api/user/profile - Get current user's profile
async function getHandler() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'برای دسترسی به این صفحه باید وارد شوید' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, uid, name, email, phone, shippingAddress, postalCode, isVerified, role, createdAt, password')
      .eq('id', session.user.id)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'کاربر یافت نشد' },
        { status: 404 }
      );
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
      { error: 'خطا در بارگذاری اطلاعات کاربر' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/profile - Update current user's profile
async function patchHandler(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'برای دسترسی به این صفحه باید وارد شوید' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { name, email, phone, shippingAddress, postalCode } = data;

    // Update user profile using service
    const updatedUser = await updateUserProfile(session.user.id, {
      name,
      email,
      phone,
      shippingAddress,
      postalCode,
    });

    return NextResponse.json({
      message: 'پروفایل با موفقیت به‌روزرسانی شد',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در به‌روزرسانی پروفایل' },
      { status: 500 }
    );
  }
}

export const GET = withLogging(getHandler, 'GET /api/user/profile');
export const PATCH = withLogging(patchHandler, 'PATCH /api/user/profile');
