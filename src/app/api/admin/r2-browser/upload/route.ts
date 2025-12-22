import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { storage, validateFile, generateFilePath } from '@/lib/storage';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Configure body size limit to 60MB (to allow video uploads up to 50MB + overhead)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max execution time

/**
 * POST /api/admin/r2-browser/upload
 * Upload file to R2 storage
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'فایلی انتخاب نشده است' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid || !validation.mediaType) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generate unique file path
    // If folder is provided, use it; otherwise use default product path
    let filePath: string;
    if (folder) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop();
      filePath = `${folder}/${random}-${timestamp}.${ext}`;
    } else {
      filePath = generateFilePath(file.name, validation.mediaType);
    }

    // Upload to storage (R2)
    const result = await storage.upload({
      file,
      path: filePath,
      contentType: file.type,
      isPublic: true,
    });

    if (!result.success) {
      log.error('R2 browser upload failed', {
        error: result.error,
        fileName: file.name,
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    log.info('R2 browser upload successful', {
      fileName: file.name,
      mediaType: validation.mediaType,
      url: result.url,
      folder,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      path: filePath,
      type: validation.mediaType,
    });
  } catch (error) {
    log.error('R2 browser upload API error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در آپلود فایل' },
      { status: 500 }
    );
  }
}
