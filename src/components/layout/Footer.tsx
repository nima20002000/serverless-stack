'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { useTranslations } from '@/components/providers/I18nProvider';
import { parsePathLocale } from '@/lib/i18n/routing';

const HIDDEN_PATHS = ['/checkout'];

const footerGroups = [
  {
    title: 'Shop',
    links: [
      { href: '/products', labelKey: 'nav.products' },
      { href: '/wishlist', labelKey: 'nav.wishlist' },
      { href: '/cart', labelKey: 'nav.cart' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/shipping', labelKey: 'footer.shipping' },
      { href: '/refund-policy', labelKey: 'footer.returns' },
      { href: '/faq', labelKey: 'footer.faq' },
      { href: '/contact', labelKey: 'nav.contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', labelKey: 'nav.about' },
      { href: '/privacy', labelKey: 'footer.privacy' },
      { href: '/terms', labelKey: 'footer.terms' },
    ],
  },
];

export default function Footer() {
  const t = useTranslations();
  const pathname = usePathname();
  const routePathname = parsePathLocale(pathname).pathnameWithoutLocale;
  const isHidden = HIDDEN_PATHS.some((path) => routePathname.startsWith(path));

  if (isHidden) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
              {siteConfig.displayName}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {siteConfig.description}
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                {t(`footer.${group.title.toLowerCase()}`)}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>
            (c) {new Date().getFullYear()} {siteConfig.displayName}.{' '}
            {t('footer.boilerplate')}
          </p>
        </div>
      </div>
    </footer>
  );
}
