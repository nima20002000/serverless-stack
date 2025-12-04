import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getAllMedia, getAllTags } from '@/services/media-library-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media-library
 * Get all media with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') as 'IMAGE' | 'VIDEO' | null;
    const tagsParam = searchParams.get('tags');
    const search = searchParams.get('search');
    const getTags = searchParams.get('getTags') === 'true';

    // If getTags is requested, return all unique tags
    if (getTags) {
      const tags = await getAllTags();
      return NextResponse.json({ tags });
    }

    // Parse tags if provided
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;

    // Get media with filters
    const media = await getAllMedia({
      type: type || undefined,
      tags,
      search: search || undefined,
    });

    return NextResponse.json({ media });
  } catch (error) {
    log.error('Media library GET error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در دریافت رسانه‌ها' },
      { status: 500 }
    );
  }
}
