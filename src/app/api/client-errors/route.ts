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
    requireReportFields(payload, ['message']);

    log.error('Client error reported', {
      report: payload,
      request: getRequestMetadata(request),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ReportPayloadTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }

    const message =
      error instanceof Error ? error.message : 'Invalid client error report';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
