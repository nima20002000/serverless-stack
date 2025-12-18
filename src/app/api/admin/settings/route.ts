import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getAllSettings, updateSettings } from '@/services/settings-service-supabase';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/admin/settings - Get all site settings
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'غیرمجاز' }, { status: 403 });
    }

    const settings = await getAllSettings();

    return NextResponse.json({ settings });
  } catch (error) {
    log.error('Error fetching site settings:', { error });
    return NextResponse.json(
      { error: 'خطا در دریافت تنظیمات' },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings - Update site settings
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'غیرمجاز' }, { status: 403 });
    }

    const { settings } = await req.json();

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'داده‌های نامعتبر' },
        { status: 400 }
      );
    }

    await updateSettings(settings);

    log.info('Site settings updated', { admin: session.user.email, keys: Object.keys(settings) });

    return NextResponse.json({ message: 'تنظیمات با موفقیت ذخیره شد' });
  } catch (error) {
    log.error('Error updating site settings:', { error });
    return NextResponse.json(
      { error: 'خطا در ذخیره تنظیمات' },
      { status: 500 }
    );
  }
}
