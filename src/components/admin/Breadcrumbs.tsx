'use client';

import Link from 'next/link';
import { ChevronLeftIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useTextDirection } from '@/components/providers/I18nProvider';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const direction = useTextDirection();

  return (
    <nav
      className="flex items-center gap-2 text-sm mb-6"
      aria-label="Breadcrumb"
    >
      <Link
        href="/admin"
        className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <HomeIcon className="w-5 h-5" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            <ChevronLeftIcon
              className={`h-4 w-4 text-gray-400 dark:text-slate-500 ${
                direction === 'rtl' ? '' : 'rotate-180'
              }`}
            />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-slate-100 font-medium">
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
