import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma/client';
import { withLogging } from '@/lib/api/with-logging';

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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        shippingAddress: true,
        postalCode: true,
        isVerified: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'کاربر یافت نشد' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'خطا در بارگذاری اطلاعات کاربر' },
      { status: 500 }
    );
  }
}

export const GET = withLogging(getHandler, 'GET /api/user/profile');
