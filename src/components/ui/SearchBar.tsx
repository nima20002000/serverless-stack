'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Combobox, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { TagIcon, FolderIcon } from '@heroicons/react/24/solid';
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
  placeholder = 'جستجوی محصولات و دسته‌بندی‌ها...',
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

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length === 0) {
        setResults({ products: [], categories: [], total: 0 });
        return;
      }

      if (query.trim().length < 2) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=5`
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

  // Handle selection
  const handleSelect = (result: SearchResult | null | undefined) => {
    if (!result) return;

    setSelected(result);

    if (result.type === 'product') {
      router.push(`/products/${result.id}`);
    } else if (result.type === 'category') {
      router.push(`/products?category=${result.slug}`);
    }

    // Clear search after navigation
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
          {/* Search Icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {isLoading ? (
              <div className="animate-spin h-5 w-5 text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
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
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>

          {/* Input Field */}
          <Combobox.Input
            className="w-full pr-10 pl-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            displayValue={() => query}
          />

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults({ products: [], categories: [], total: 0 });
              }}
              className="absolute inset-y-0 left-0 flex items-center pl-3 hover:bg-gray-100 rounded-l-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}

          {/* Results Dropdown */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-auto focus:outline-none">
              {hasResults ? (
                <div className="py-2">
                  {/* Categories Section */}
                  {results.categories.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                        دسته‌بندی‌ها
                      </div>
                      {results.categories.map((category) => (
                        <Combobox.Option
                          key={category.id}
                          value={category}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-3 transition-colors ${
                              active
                                ? 'bg-blue-50 text-blue-900'
                                : 'text-gray-900'
                            }`
                          }
                        >
                          {({ active }) => (
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                  active ? 'bg-blue-100' : 'bg-gray-100'
                                }`}
                              >
                                <FolderIcon
                                  className={`w-5 h-5 ${
                                    active ? 'text-blue-600' : 'text-gray-600'
                                  }`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {category.name}
                                </p>
                                {category.description && (
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
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

                  {/* Products Section */}
                  {results.products.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                        محصولات
                      </div>
                      {results.products.map((product) => (
                        <Combobox.Option
                          key={product.id}
                          value={product}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-3 transition-colors ${
                              active
                                ? 'bg-blue-50 text-blue-900'
                                : 'text-gray-900'
                            }`
                          }
                        >
                          {({ active }) => (
                            <div className="flex items-center gap-3">
                              {/* Product Image */}
                              <div
                                className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border ${
                                  active ? 'border-blue-200' : 'border-gray-200'
                                }`}
                              >
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <TagIcon className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {product.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm font-semibold text-blue-600">
                                    {formatPrice(product.price)}
                                  </span>
                                  {product.categoryName && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <span className="text-xs text-gray-500 truncate">
                                        {product.categoryName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Discount Badge */}
                              {product.discountPercent &&
                                product.discountPercent > 0 && (
                                  <div className="flex-shrink-0">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                      {product.discountPercent}٪ تخفیف
                                    </span>
                                  </div>
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
                  <div className="px-4 py-8 text-center text-gray-500">
                    <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium">نتیجه‌ای یافت نشد</p>
                    <p className="text-xs mt-1">جستجوی دیگری را امتحان کنید</p>
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
