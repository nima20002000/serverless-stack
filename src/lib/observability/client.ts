'use client';

export type ClientErrorReport = {
  name?: string;
  message: string;
  stack?: string;
  source?: string;
  component?: string;
  context?: Record<string, unknown>;
};

export type FallbackWarningReport = {
  name: string;
  primary: string;
  fallback: string;
  reason?: string;
  context?: Record<string, unknown>;
};

const DEDUPE_WINDOW_MS = 60_000;
const fallbackWarningTimestamps = new Map<string, number>();

function canReportFallback(key: string, now = Date.now()): boolean {
  const previous = fallbackWarningTimestamps.get(key);
  if (previous && now - previous < DEDUPE_WINDOW_MS) {
    return false;
  }

  fallbackWarningTimestamps.set(key, now);
  return true;
}

function postReport(endpoint: string, payload: object): void {
  if (typeof window === 'undefined') return;

  try {
    const body = JSON.stringify({
      ...payload,
      url: `${window.location.origin}${window.location.pathname}`,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }

    void fetch(endpoint, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Reporting must never break the user-facing page.
  }
}

export function reportClientError(report: ClientErrorReport): void {
  if (!report.message) return;
  postReport('/api/client-errors', report);
}

export function reportFallbackWarning(report: FallbackWarningReport): void {
  if (!report.name || !report.primary || !report.fallback) return;

  const key = `${report.name}:${report.primary}:${report.fallback}:${report.reason || ''}`;
  if (!canReportFallback(key)) return;

  postReport('/api/fallback-warnings', report);
}

export function __resetObservabilityForTests(): void {
  fallbackWarningTimestamps.clear();
}
