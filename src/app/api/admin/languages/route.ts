import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { isServerE2EMode } from '@/lib/e2e-mode';
import {
  getLanguageSettings,
  updateLanguageSettings,
} from '@/services/localization-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  if (isServerE2EMode()) return true;

  const session = await getServerSession(authOptions);
  return Boolean(session?.user && session.user.role === 'ADMIN');
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const languages = await getLanguageSettings();
    return NextResponse.json({ languages });
  } catch (error) {
    log.error('Error fetching language settings', { error });
    return NextResponse.json(
      { error: 'Unable to load language settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    if (!Array.isArray(body.languages)) {
      return NextResponse.json(
        { error: 'Invalid languages payload' },
        { status: 400 }
      );
    }

    const languages = await updateLanguageSettings(body.languages);
    return NextResponse.json({ languages });
  } catch (error) {
    log.error('Error updating language settings', { error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save language settings',
      },
      { status: 400 }
    );
  }
}
