import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { storage } from '@/lib/storage';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/r2-browser
 * List objects in R2 storage
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get('prefix') || undefined;
    const maxKeys = searchParams.get('maxKeys') ? parseInt(searchParams.get('maxKeys')!) : 100;
    const continuationToken = searchParams.get('continuationToken') || undefined;

    // List objects from R2
    const result = await storage.list({
      prefix,
      maxKeys,
      continuationToken,
    });

    if (!result.success) {
      log.error('R2 browser list failed', { error: result.error, prefix });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    log.info('R2 browser list successful', {
      prefix,
      count: result.objects?.length || 0,
      isTruncated: result.isTruncated,
    });

    return NextResponse.json({
      success: true,
      objects: result.objects || [],
      nextContinuationToken: result.nextContinuationToken,
      isTruncated: result.isTruncated,
    });
  } catch (error) {
    log.error('R2 browser API error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در دریافت لیست فایل‌ها' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/r2-browser
 * Delete object from R2 storage
 */
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    // Get path from request body
    const { path } = await req.json();

    if (!path) {
      return NextResponse.json({ error: 'مسیر فایل الزامی است' }, { status: 400 });
    }

    // Delete from R2
    const result = await storage.delete(path);

    if (!result.success) {
      log.error('R2 browser delete failed', { error: result.error, path });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    log.info('R2 browser delete successful', { path });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('R2 browser delete API error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در حذف فایل' },
      { status: 500 }
    );
  }
}
