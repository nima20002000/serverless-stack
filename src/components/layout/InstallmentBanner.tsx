'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const HIDDEN_PATHS = ['/cart', '/checkout'];

export default function InstallmentBanner() {
  const pathname = usePathname();
  const fullMessage = 'فقط ۲۵٪ پیش‌پرداخت، مابقی طی ۳ قسط ماهانه';
  const shortMessage = '۲۵٪ پیش‌پرداخت + ۳ قسط';
  const [typedFull, setTypedFull] = useState('');
  const [typedShort, setTypedShort] = useState('');
  const isHidden = HIDDEN_PATHS.some((path) => pathname.startsWith(path));

  useEffect(() => {
    let interval: number | null = null;
    const cleanup = () => {
      if (interval !== null) {
        window.clearInterval(interval);
      }
    };

    if (typeof window === 'undefined') {
      return cleanup;
    }

    if (isHidden) {
      return cleanup;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setTypedFull(fullMessage);
      setTypedShort(shortMessage);
      return cleanup;
    }

    let index = 0;
    const maxLength = Math.max(fullMessage.length, shortMessage.length);
    interval = window.setInterval(() => {
      index += 1;
      setTypedFull(fullMessage.slice(0, index));
      setTypedShort(shortMessage.slice(0, index));
      if (index >= maxLength) {
        cleanup();
      }
    }, 30);

    return cleanup;
  }, [fullMessage, isHidden, shortMessage]);

  // Hide banner on cart and checkout pages
  if (isHidden) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] text-rose-700 bg-white/90 backdrop-blur border-b border-rose-100/80 shadow-[0_6px_20px_-16px_rgba(244,63,94,0.35)]">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(244,63,94,0.08),_rgba(255,255,255,0.95)_45%,_rgba(251,207,232,0.14))]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 py-2 text-sm sm:text-base">
            <div className="w-6 h-6 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-rose-600"
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
              <span className="hidden sm:inline"> {typedFull}</span>
              <span className="sm:hidden"> {typedShort}</span>
            </span>
          </div>
        </div>
      </div>
      {/* Spacer for fixed banner */}
      <div className="h-9 sm:h-10" />
    </>
  );
}
