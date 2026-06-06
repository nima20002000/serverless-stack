'use client';

import { useTranslations } from '@/components/providers/I18nProvider';

export default function ProductsHero() {
  const t = useTranslations();

  return (
    <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
        {t('products.catalog')}
      </p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl dark:text-white">
        {t('products.title')}
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        {t('products.heroDescription')}
      </p>
    </section>
  );
}
