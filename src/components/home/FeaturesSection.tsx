'use client';

import { useEffect, useRef, useState } from 'react';
import Card from '@/components/ui/Card';

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const cleanup = () => {
      observer?.disconnect();
    };

    if (typeof window === 'undefined') {
      return cleanup;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      return cleanup;
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          cleanup();
        }
      },
      { threshold: 0.25 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return cleanup;
  }, []);

  const revealBase = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-4';

  return (
    <section
      ref={sectionRef}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-10"
    >
      <div
        className={`text-center mb-12 transition-all duration-700 ease-out ${revealBase}`}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-rose-900 mb-4">
          چرا کیتیا؟
        </h2>
        <div className="w-24 h-1 bg-gradient-to-r from-rose-500 to-pink-400 mx-auto mb-4"></div>
        <p className="text-rose-500 text-lg">مزایای خرید از ما</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card
          className={`text-center hover:shadow-[0_28px_60px_-40px_rgba(244,63,94,0.45)] transition-all duration-700 ease-out transform hover:-translate-y-2 ${revealBase} delay-100`}
        >
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-rose-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-rose-900 mb-3">ارسال سریع</h3>
            <p className="text-rose-500 leading-relaxed">
              ارسال سریع و ایمن محصولات به سراسر کشور با بسته‌بندی مناسب
            </p>
          </div>
        </Card>

        <Card
          className={`text-center hover:shadow-[0_28px_60px_-40px_rgba(244,63,94,0.45)] transition-all duration-700 ease-out transform hover:-translate-y-2 ${revealBase} delay-200`}
        >
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-pink-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-rose-900 mb-3">
              تضمین سلامت کالا
            </h3>
            <p className="text-rose-500 leading-relaxed">
              تضمین اصالت و سلامت کالا با امکان بازگشت تا ۷ روز
            </p>
          </div>
        </Card>

        <Card
          className={`text-center hover:shadow-[0_28px_60px_-40px_rgba(244,63,94,0.45)] transition-all duration-700 ease-out transform hover:-translate-y-2 ${revealBase} delay-300`}
        >
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-amber-100 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-rose-500"
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
            <h3 className="text-xl font-bold text-rose-900 mb-3">
              امکان خرید قسطی
            </h3>
            <p className="text-rose-500 leading-relaxed">
              خرید آسان با امکان پرداخت اقساطی و بدون نیاز به ضامن
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
