export type SanitizedReport = Record<string, unknown>;

export const MAX_REPORT_BYTES = 16 * 1024;
const MAX_STRING_LENGTH = 500;
const MAX_STACK_LENGTH = 2000;
const MAX_ARRAY_LENGTH = 20;
const MAX_DEPTH = 4;
const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN =
  /password|passcode|token|secret|authorization|cookie|session|email|phone|card|payment|credential|apikey|api_key/i;

function truncate(value: string, maxLength = MAX_STRING_LENGTH): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function sanitizeValue(value: unknown, key = '', depth = 0): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED;
  }

  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return truncate(
      value,
      key === 'stack' ? MAX_STACK_LENGTH : MAX_STRING_LENGTH
    );
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (value instanceof Error) {
    return {
      name: truncate(value.name),
      message: truncate(value.message),
      stack: truncate(value.stack || '', MAX_STACK_LENGTH),
    };
  }

  if (depth >= MAX_DEPTH) {
    return '[Truncated]';
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeValue(item, key, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 50)
        .map(([entryKey, entryValue]) => [
          truncate(entryKey, 80),
          sanitizeValue(entryValue, entryKey, depth + 1),
        ])
    );
  }

  return String(value);
}

export function sanitizeReportPayload(payload: unknown): SanitizedReport {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Report payload must be an object');
  }

  return sanitizeValue(payload) as SanitizedReport;
}

export class ReportPayloadTooLargeError extends Error {
  constructor() {
    super('Report payload is too large');
  }
}

export async function readJsonReportBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REPORT_BYTES) {
    throw new ReportPayloadTooLargeError();
  }

  if (!request.body) {
    throw new Error('Report payload is required');
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_REPORT_BYTES) {
      throw new ReportPayloadTooLargeError();
    }

    chunks.push(value);
  }

  const body = new TextDecoder().decode(Buffer.concat(chunks));
  if (!body) {
    throw new Error('Report payload is required');
  }

  return JSON.parse(body);
}

export function requireReportFields(
  payload: SanitizedReport,
  fields: string[]
): void {
  const missing = fields.filter(
    (field) => typeof payload[field] !== 'string' || payload[field] === ''
  );

  if (missing.length > 0) {
    throw new Error(`Missing required report fields: ${missing.join(', ')}`);
  }
}

export function getRequestMetadata(request: Request) {
  const url = new URL(request.url);

  return {
    path: url.pathname,
    userAgent: truncate(request.headers.get('user-agent') || 'unknown'),
  };
}
