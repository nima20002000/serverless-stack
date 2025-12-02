import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { storage, validateFile, generateFilePath } from '@/lib/storage';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

    if (!file) {
      return NextResponse.json({ error: 'فایلی انتخاب نشده است' }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid || !validation.mediaType) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generate unique file path
    const filePath = generateFilePath(file.name, validation.mediaType);

    // Upload to storage (R2)
    const result = await storage.upload({
      file,
      path: filePath,
      contentType: file.type,
      isPublic: true,
    });

    if (!result.success) {
      log.error('Upload failed', { error: result.error, fileName: file.name });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    log.info('File uploaded successfully', {
      fileName: file.name,
      mediaType: validation.mediaType,
      url: result.url,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      type: validation.mediaType,
    });
  } catch (error) {
    log.error('Upload API error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در آپلود فایل' },
      { status: 500 }
    );
  }
}
