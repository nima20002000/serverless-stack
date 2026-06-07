'use client';

import { useEffect } from 'react';
import {
  reportClientError,
  reportFallbackWarning,
} from '@/lib/observability/client';

declare global {
  interface Window {
    __reportClientError?: typeof reportClientError;
    __reportFallbackWarning?: typeof reportFallbackWarning;
  }
}

function errorToReport(error: unknown, source: string) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      source,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown client error',
    source,
    context: { value: String(error) },
  };
}

export function ClientErrorReporter() {
  useEffect(() => {
    window.__reportClientError = reportClientError;
    window.__reportFallbackWarning = reportFallbackWarning;

    const handleError = (event: ErrorEvent) => {
      reportClientError({
        ...errorToReport(event.error || event.message, 'window.error'),
        context: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportClientError(errorToReport(event.reason, 'unhandledrejection'));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
      delete window.__reportClientError;
      delete window.__reportFallbackWarning;
    };
  }, []);

  return null;
}
