import { log } from '@/lib/logger';

declare global {
  // eslint-disable-next-line no-var
  var __kitiaFetchWrapped: boolean | undefined;
  // eslint-disable-next-line no-var
  var __kitiaOriginalFetch: typeof fetch | undefined;
}

function getUrlInfo(input: RequestInfo | URL): {
  url: string;
  host: string | null;
  path: string | null;
} {
  const raw =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  try {
    const parsed = new URL(raw);
    return {
      url: `${parsed.origin}${parsed.pathname}`,
      host: parsed.host,
      path: parsed.pathname,
    };
  } catch {
    return { url: raw, host: null, path: null };
  }
}

export async function register() {
  if (globalThis.__kitiaFetchWrapped) return;

  const originalFetch = globalThis.fetch?.bind(globalThis);
  if (!originalFetch) return;

  const thresholdMs = Number(process.env.FETCH_LOG_THRESHOLD_MS || 2000);

  globalThis.__kitiaOriginalFetch = originalFetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const start = Date.now();
    const method =
      init?.method ?? (input instanceof Request ? input.method : 'GET');
    const { url, host, path } = getUrlInfo(input);

    try {
      const response = await originalFetch(input, init);
      const durationMs = Date.now() - start;

      if (durationMs >= thresholdMs || response.status >= 500) {
        log.warn('Upstream fetch slow', {
          method,
          url,
          host,
          path,
          status: response.status,
          durationMs,
        });
      }

      return response;
    } catch (error) {
      const durationMs = Date.now() - start;
      log.error('Upstream fetch failed', {
        method,
        url,
        host,
        path,
        durationMs,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  };

  globalThis.__kitiaFetchWrapped = true;
}
