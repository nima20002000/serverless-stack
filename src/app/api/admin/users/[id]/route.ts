import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import {
  getUserById,
  updateUserRole,
  deleteUser,
} from '@/services/admin-service';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    const userData = await getUserById(params.id);

    // Serialize the response to ensure proper format
    const user = {
      ...userData,
      createdAt: userData.createdAt.toISOString(),
      _count: {
        transactions: userData.transactions.length,
        promoCodes: userData.promoCodes.length,
      },
      transactions: userData.transactions.map(t => ({
        id: t.id,
        transactionCode: t.transactionCode,
        amount: Number(t.amount),
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      promoCodes: userData.promoCodes.map(p => ({
        id: p.id,
        code: p.code,
        expiresAt: p.expiresAt.toISOString(),
        isUsed: p.isUsed,
      })),
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    const errorMessage = error instanceof Error ? error.message : 'خطا در دریافت کاربر';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    // Prevent admin from changing their own role
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: 'نمی‌توانید نقش خود را تغییر دهید' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'نقش کاربری نامعتبر است' },
        { status: 400 }
      );
    }

    const user = await updateUserRole(params.id, role as Role);
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'خطا در به‌روزرسانی کاربر';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    // Prevent admin from deleting their own account
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: 'نمی‌توانید حساب کاربری خود را حذف کنید' },
        { status: 403 }
      );
    }

    await deleteUser(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    const errorMessage = error instanceof Error ? error.message : 'خطا در حذف کاربر';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
