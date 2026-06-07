'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/observability/client';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      name: error.name,
      message: error.message,
      stack: error.stack,
      source: 'next.global-error',
      context: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-400">
              The application reported this error so an operator can inspect it.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
