'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PillV4 from '@/components/ui-v4/Pill';

export default function CtaSection() {
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
      { threshold: 0.3 }
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
      className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-20"
    >
      <Card
        className={`relative overflow-hidden text-center bg-white transition-all duration-700 ease-out ${revealBase}`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(244,63,94,0.12),_transparent_45%,_rgba(251,207,232,0.25))]" />
        <div className="relative px-6 py-12">
          <PillV4 tone="rose">مجموعه کامل</PillV4>
          <h2 className="text-3xl md:text-4xl font-bold text-rose-900 mt-6">
            آماده برای شروع خرید هستید؟
          </h2>
          <p className="text-lg text-rose-500 mt-4">
            کالکشن تازه را همین حالا ببینید و لحظه‌های خود را زیباتر کنید.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/products">
              <Button variant="primary" size="lg">
                مشاهده تمام محصولات
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </section>
  );
}
