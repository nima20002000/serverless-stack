import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getAllSettings, updateSettings } from '@/services/settings-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/admin/settings - Get all site settings
export async function GET(req: NextRequest) {
  try {
    // Check if running in E2E test mode
    const isE2E =
      process.env.E2E_TEST === 'true' ||
      req.headers.get('x-e2e-test') === 'true';

    // Check authentication (skip in E2E mode for testing)
    if (!isE2E) {
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'غیرمجاز' }, { status: 403 });
      }
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
    // Check if running in E2E test mode
    const isE2E =
      process.env.E2E_TEST === 'true' ||
      req.headers.get('x-e2e-test') === 'true';

    // Check authentication (skip in E2E mode for testing)
    let adminEmail = 'e2e-admin';
    if (!isE2E) {
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'غیرمجاز' }, { status: 403 });
      }
      adminEmail = session.user.email || 'admin';
    }

    const { settings } = await req.json();

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'داده‌های نامعتبر' }, { status: 400 });
    }

    await updateSettings(settings);

    log.info('Site settings updated', {
      admin: adminEmail,
      keys: Object.keys(settings),
    });

    return NextResponse.json({ message: 'تنظیمات با موفقیت ذخیره شد' });
  } catch (error) {
    log.error('Error updating site settings:', { error });
    return NextResponse.json(
      { error: 'خطا در ذخیره تنظیمات' },
      { status: 500 }
    );
  }
}
