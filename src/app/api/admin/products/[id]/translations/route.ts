import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { isServerE2EMode } from '@/lib/e2e-mode';
import {
  getProductMediaTranslationsForProduct,
  getProductTranslations,
  saveProductMediaTranslations,
  saveProductTranslations,
  validateProductMediaTranslationPayload,
  validateProductMediaTranslationsBelongToProduct,
  validateProductTranslationPayload,
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
    const [translations, mediaTranslations] = await Promise.all([
      getProductTranslations(id),
      getProductMediaTranslationsForProduct(id),
    ]);

    return NextResponse.json({ translations, mediaTranslations });
  } catch (error) {
    log.error('Error fetching product translations', { error });
    return NextResponse.json(
      { error: 'Unable to load product translations' },
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

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid translations payload' },
        { status: 400 }
      );
    }

    const mediaTranslations = body.mediaTranslations || {};
    const translations = body.translations || {};
    validateProductTranslationPayload(translations);
    validateProductMediaTranslationPayload(mediaTranslations);
    await validateProductMediaTranslationsBelongToProduct(
      id,
      Object.keys(mediaTranslations)
    );
    await saveProductTranslations(id, translations);
    await saveProductMediaTranslations(id, mediaTranslations);

    return NextResponse.json({ message: 'Product translations saved.' });
  } catch (error) {
    log.error('Error saving product translations', { error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save product translations',
      },
      { status: 400 }
    );
  }
}
