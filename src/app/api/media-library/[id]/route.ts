import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getMediaById, updateMedia, deleteMedia } from '@/services/media-library-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media-library/[id]
 * Get media by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const media = await getMediaById(params.id);
    return NextResponse.json({ media });
  } catch (error) {
    log.error('Media library GET by ID error', { error, id: params.id });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در دریافت رسانه' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/media-library/[id]
 * Update media metadata
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { alt, tags } = body;

    const media = await updateMedia(params.id, {
      alt,
      tags,
    });

    return NextResponse.json({ success: true, media });
  } catch (error) {
    log.error('Media library PATCH error', { error, id: params.id });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در بروزرسانی رسانه' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media-library/[id]
 * Delete media from library and storage
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    await deleteMedia(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Media library DELETE error', { error, id: params.id });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در حذف رسانه' },
      { status: 500 }
    );
  }
}
