'use client';

import Link from 'next/link';
import { HomeIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import SearchBar from '@/components/ui/SearchBar';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-16 dark:bg-slate-950">
      <div className="w-full max-w-lg text-center">
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-slate-300">404</h1>
          <div className="mt-4 space-y-2">
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
              Page not found
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              The page you are looking for does not exist or has moved.
            </p>
          </div>
        </div>

        <div className="mb-8">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Search for a product or category:
          </p>
          <SearchBar placeholder="Search products..." />
        </div>

        <div className="space-y-4">
          <Link href="/">
            <Button variant="primary" className="gap-2">
              <HomeIcon className="h-5 w-5" />
              <span>Back home</span>
            </Button>
          </Link>

          <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <p className="mb-3 text-sm text-slate-500">Helpful links:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                ['Products', '/products'],
                ['Cart', '/cart'],
                ['Contact', '/contact'],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-blue-700 hover:underline dark:text-blue-300"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
