import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { isServerE2EMode } from '@/lib/e2e-mode';
import {
  getTagTranslations,
  saveTagTranslations,
} from '@/services/localization-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  if (isServerE2EMode()) return true;

  const session = await getServerSession(authOptions);
  return Boolean(session?.user && session.user.role === 'ADMIN');
}

export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await paramsPromise;
    const translations = await getTagTranslations(id);
    return NextResponse.json({ translations });
  } catch (error) {
    log.error('Error fetching tag translations', { error });
    return NextResponse.json(
      { error: 'Unable to load tag translations' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await paramsPromise;
    const body = await req.json();
    if (!body || typeof body.translations !== 'object') {
      return NextResponse.json(
        { error: 'Invalid translations payload' },
        { status: 400 }
      );
    }

    await saveTagTranslations(id, body.translations);
    return NextResponse.json({ message: 'Tag translations saved.' });
  } catch (error) {
    log.error('Error saving tag translations', { error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save translations',
      },
      { status: 400 }
    );
  }
}
