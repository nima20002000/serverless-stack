'use client';

import { useEffect, useRef, useState } from 'react';
import Card from '@/components/ui/Card';

const features = [
  {
    title: 'Catalog ready',
    body: 'Use Supabase-backed products, categories, variants, media, and stock data without changing the storefront contract.',
  },
  {
    title: 'Cart and wishlist',
    body: 'Public commerce flows stay available for guests while account sync can attach saved data to signed-in users.',
  },
  {
    title: 'Payment neutral',
    body: 'Stripe and PayPal are the built-in providers, with copy and policies kept generic for any commerce project.',
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const cleanup = () => observer?.disconnect();

    if (typeof window === 'undefined') {
      return cleanup;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    ? 'translate-y-0 opacity-100'
    : 'translate-y-4 opacity-0';

  return (
    <section
      ref={sectionRef}
      className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
    >
      <div
        className={`mb-8 transition-all duration-500 ease-out ${revealBase}`}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Boilerplate features
        </p>
        <h2 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
          Built for reusable commerce.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {features.map((feature, index) => (
          <Card
            key={feature.title}
            className={`p-6 transition-all duration-500 ease-out ${revealBase}`}
            style={{ transitionDelay: `${index * 80}ms` }}
          >
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
              {feature.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {feature.body}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
