'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Combobox, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FolderIcon, TagIcon } from '@heroicons/react/24/solid';
import type { SearchResult } from '@/types/search';
import { formatPrice } from '@/lib/utils/format';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onResultClick?: () => void;
}

interface SearchResponse {
  products: Array<SearchResult & { type: 'product' }>;
  categories: Array<SearchResult & { type: 'category' }>;
  total: number;
}

export default function SearchBar({
  className = '',
  placeholder = 'Search products and categories...',
  onResultClick,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse>({
    products: [],
    categories: [],
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null | undefined>(
    null
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const trimmedQuery = query.trim();
      if (trimmedQuery.length === 0) {
        setResults({ products: [], categories: [], total: 0 });
        return;
      }

      if (trimmedQuery.length < 2) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}&limit=5`
        );
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
        setResults({ products: [], categories: [], total: 0 });
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (result: SearchResult | null | undefined) => {
    if (!result) return;

    setSelected(result);

    if (result.type === 'product') {
      router.push(`/products/${result.id}`);
    } else if (result.type === 'category') {
      router.push(`/products?category=${result.slug}`);
    }

    setQuery('');
    setResults({ products: [], categories: [], total: 0 });
    onResultClick?.();
  };

  const allResults: SearchResult[] = [
    ...results.categories,
    ...results.products,
  ];

  const hasResults = allResults.length > 0;

  return (
    <div className={`relative w-full ${className}`}>
      <Combobox value={selected} onChange={handleSelect}>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
            {isLoading ? (
              <div className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : (
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            )}
          </div>

          <Combobox.Input
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 ps-10 pe-10 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-slate-700/60"
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            displayValue={() => query}
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults({ products: [], categories: [], total: 0 });
              }}
              className="absolute inset-y-0 end-0 flex items-center rounded-e-lg pe-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Clear search"
            >
              <XMarkIcon className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200" />
            </button>
          )}

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
              {hasResults ? (
                <div className="py-2">
                  {results.categories.length > 0 && (
                    <div className="mb-2">
                      <div className="bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                        Categories
                      </div>
                      {results.categories.map((category) => (
                        <Combobox.Option
                          key={category.id}
                          value={category}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-3 transition-colors ${
                              active
                                ? 'bg-slate-50 text-slate-950 dark:bg-slate-800 dark:text-slate-100'
                                : 'text-slate-800 dark:text-slate-200'
                            }`
                          }
                        >
                          {({ active }) => (
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                                  active
                                    ? 'bg-slate-200 dark:bg-slate-700'
                                    : 'bg-slate-100 dark:bg-slate-800'
                                }`}
                              >
                                <FolderIcon className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                  {category.name}
                                </p>
                                {category.description && (
                                  <p className="mt-0.5 truncate text-xs text-slate-500">
                                    {category.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </Combobox.Option>
                      ))}
                    </div>
                  )}

                  {results.products.length > 0 && (
                    <div>
                      <div className="bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                        Products
                      </div>
                      {results.products.map((product) => (
                        <Combobox.Option
                          key={product.id}
                          value={product}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-3 transition-colors ${
                              active
                                ? 'bg-slate-50 text-slate-950 dark:bg-slate-800 dark:text-slate-100'
                                : 'text-slate-800 dark:text-slate-200'
                            }`
                          }
                        >
                          {() => (
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                {product.images && product.images.length > 0 ? (
                                  <Image
                                    src={product.images[0]}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                                    <TagIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                  {product.name}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {formatPrice(product.price)}
                                  </span>
                                  {product.categoryName && (
                                    <>
                                      <span className="text-slate-300 dark:text-slate-600">
                                        |
                                      </span>
                                      <span className="truncate text-xs text-slate-500">
                                        {product.categoryName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {product.discountPercent &&
                                product.discountPercent > 0 && (
                                  <span className="inline-flex flex-shrink-0 items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-slate-800 dark:text-slate-200">
                                    {product.discountPercent}% off
                                  </span>
                                )}
                            </div>
                          )}
                        </Combobox.Option>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                query.trim().length >= 2 &&
                !isLoading && (
                  <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    <MagnifyingGlassIcon className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium">No results found</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Try a different product name or category.
                    </p>
                  </div>
                )
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}
