import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getActivePromoCode } from '@/services/promo-service-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'لطفاً وارد شوید' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const promoCode = await getActivePromoCode(userId);

    return NextResponse.json({
      promoCode,
    });
  } catch (error) {
    console.error('Error fetching promo code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در دریافت کد تخفیف' },
      { status: 500 }
    );
  }
}
