import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { storage } from '@/lib/storage';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const DEFAULT_MAX_KEYS = 100;
const MAX_KEYS_LIMIT = 1000;

function parseMaxKeys(maxKeysParam: string | null) {
  if (maxKeysParam === null) {
    return DEFAULT_MAX_KEYS;
  }

  const maxKeys = Number(maxKeysParam);
  if (!Number.isInteger(maxKeys) || maxKeys < 1 || maxKeys > MAX_KEYS_LIMIT) {
    return null;
  }

  return maxKeys;
}

/**
 * GET /api/admin/r2-browser
 * List objects in R2 storage
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get('prefix') || undefined;
    const delimiter = searchParams.get('delimiter') || undefined;
    const maxKeysParam = searchParams.get('maxKeys');
    const maxKeys = parseMaxKeys(maxKeysParam);
    if (maxKeys === null) {
      return NextResponse.json(
        { error: `maxKeys must be an integer between 1 and ${MAX_KEYS_LIMIT}` },
        { status: 400 }
      );
    }
    const continuationToken =
      searchParams.get('continuationToken') || undefined;

    // List objects from R2
    const result = await storage.list({
      prefix,
      delimiter,
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
      prefixes: result.prefixes || [],
      nextContinuationToken: result.nextContinuationToken,
      isTruncated: result.isTruncated,
    });
  } catch (error) {
    log.error('R2 browser API error', { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to load files',
      },
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get path from request body
    const { path } = await req.json();

    if (!path) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
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
      {
        error: error instanceof Error ? error.message : 'Unable to delete file',
      },
      { status: 500 }
    );
  }
}
