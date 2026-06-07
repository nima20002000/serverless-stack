import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import {
  getRequestMetadata,
  readJsonReportBody,
  ReportPayloadTooLargeError,
  requireReportFields,
  sanitizeReportPayload,
} from '@/lib/observability/sanitize';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = sanitizeReportPayload(await readJsonReportBody(request));
    requireReportFields(payload, ['name', 'primary', 'fallback']);

    log.warn('Client fallback warning reported', {
      report: payload,
      request: getRequestMetadata(request),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ReportPayloadTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }

    const message =
      error instanceof Error
        ? error.message
        : 'Invalid fallback warning report';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
