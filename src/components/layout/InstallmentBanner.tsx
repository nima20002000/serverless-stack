'use client';

import { usePathname } from 'next/navigation';

const HIDDEN_PATHS = ['/cart', '/checkout'];

export default function InstallmentBanner() {
  const pathname = usePathname();

  // Hide banner on cart and checkout pages
  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-l from-rose-500 to-pink-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 py-2 text-sm sm:text-base">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <span className="text-center">
              <span className="font-bold">خرید قسطی:</span>
              <span className="hidden sm:inline">
                {' '}
                فقط ۲۵٪ پیش‌پرداخت، مابقی طی ۳ قسط ماهانه
              </span>
              <span className="sm:hidden"> ۲۵٪ پیش‌پرداخت + ۳ قسط</span>
            </span>
          </div>
        </div>
      </div>
      {/* Spacer for fixed banner */}
      <div className="h-9 sm:h-10" />
    </>
  );
}
