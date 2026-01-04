'use client';

import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PhotoIcon,
  FolderIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { optimizeImage } from '@/lib/cloudflare-images-client';

interface R2Object {
  key: string;
  size: number;
  lastModified: string;
  url: string;
}

interface R2MediaBrowserProps {
  /** Whether browser is open */
  isOpen: boolean;
  /** Callback to close browser */
  onClose: () => void;
  /** Callback when media is selected */
  onSelect: (urls: string[]) => void;
  /** Allow multiple selection */
  multiSelect?: boolean;
  /** Initial folder to browse */
  initialFolder?: string;
}

const DEFAULT_PAGE_SIZE = 80;
const CACHE_TTL_MS = 10 * 60 * 1000;

type CachedListing = {
  objects: R2Object[];
  prefixes: string[];
  nextToken: string | null;
  hasMore: boolean;
  timestamp: number;
};

const listingCache = new Map<string, CachedListing>();

const getCacheKey = (prefix: string) => (prefix ? prefix : '__root__');

const getCachedListing = (prefix: string) => {
  const cached = listingCache.get(getCacheKey(prefix));
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    listingCache.delete(getCacheKey(prefix));
    return null;
  }
  return cached;
};

const setCachedListing = (prefix: string, data: CachedListing) => {
  listingCache.set(getCacheKey(prefix), data);
};

const normalizePrefix = (prefix?: string) => {
  if (!prefix) return '';
  return prefix.endsWith('/') ? prefix : `${prefix}/`;
};

const getParentPrefix = (prefix: string) => {
  const trimmed = prefix.replace(/\/$/, '');
  if (!trimmed) return '';
  const parts = trimmed.split('/');
  parts.pop();
  return parts.length ? `${parts.join('/')}/` : '';
};

const sortByLastModified = (items: R2Object[]) =>
  [...items].sort((a, b) => {
    const aTime = Date.parse(a.lastModified);
    const bTime = Date.parse(b.lastModified);
    return bTime - aTime;
  });

export default function R2MediaBrowser({
  isOpen,
  onClose,
  onSelect,
  multiSelect = false,
  initialFolder = 'products/images',
}: R2MediaBrowserProps) {
  const [objects, setObjects] = useState<R2Object[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState(
    normalizePrefix(initialFolder)
  );
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Load objects when folder changes
  useEffect(() => {
    if (isOpen) {
      loadObjects(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrefix, isOpen]);

  // Reset selection when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedUrls(new Set());
      setError('');
    } else {
      setError('');
      setCurrentPrefix(normalizePrefix(initialFolder));
    }
  }, [isOpen, initialFolder]);

  // Clear selection when navigating folders
  useEffect(() => {
    setSelectedUrls(new Set());
  }, [currentPrefix]);

  const loadObjects = async (reset: boolean, forceRefresh = false) => {
    try {
      if (reset && !forceRefresh) {
        const cached = getCachedListing(currentPrefix);
        if (cached) {
          setFolders(cached.prefixes);
          setObjects(cached.objects);
          setNextToken(cached.nextToken);
          setHasMore(cached.hasMore);
          return;
        }
      }

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');

      const params = new URLSearchParams();
      if (currentPrefix) {
        params.set('prefix', currentPrefix);
      }
      params.set('delimiter', '/');
      params.set('maxKeys', `${DEFAULT_PAGE_SIZE}`);
      if (!reset && nextToken) {
        params.set('continuationToken', nextToken);
      }

      const response = await fetch(
        `/api/admin/r2-browser?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در دریافت فایل‌ها');
      }

      const incomingObjects = data.objects || [];
      const incomingPrefixes = data.prefixes || [];

      if (reset) {
        const sortedObjects = sortByLastModified(incomingObjects);
        const nextToken = data.nextContinuationToken || null;
        const hasMoreNext = Boolean(
          data.isTruncated && data.nextContinuationToken
        );

        setFolders(incomingPrefixes);
        setObjects(sortedObjects);
        setNextToken(nextToken);
        setHasMore(hasMoreNext);

        setCachedListing(currentPrefix, {
          objects: sortedObjects,
          prefixes: incomingPrefixes,
          nextToken,
          hasMore: hasMoreNext,
          timestamp: Date.now(),
        });
      } else {
        setObjects((prev) => {
          const merged = sortByLastModified([...prev, ...incomingObjects]);
          setCachedListing(currentPrefix, {
            objects: merged,
            prefixes: folders,
            nextToken: data.nextContinuationToken || null,
            hasMore: Boolean(data.isTruncated && data.nextContinuationToken),
            timestamp: Date.now(),
          });
          return merged;
        });
        setNextToken(data.nextContinuationToken || null);
        setHasMore(Boolean(data.isTruncated && data.nextContinuationToken));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص');
      if (reset) {
        setObjects([]);
        setFolders([]);
        setNextToken(null);
        setHasMore(false);
      }
    } finally {
      if (reset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const toggleSelection = (url: string) => {
    const newSelection = new Set(selectedUrls);
    if (newSelection.has(url)) {
      newSelection.delete(url);
    } else {
      if (multiSelect) {
        newSelection.add(url);
      } else {
        newSelection.clear();
        newSelection.add(url);
      }
    }
    setSelectedUrls(newSelection);
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedUrls));
    onClose();
  };

  const handleDelete = async (path: string) => {
    if (!confirm('آیا از حذف این فایل اطمینان دارید؟')) {
      return;
    }

    try {
      setError('');
      const response = await fetch('/api/admin/r2-browser', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در حذف فایل');
      }

      // Reload objects after delete
      await loadObjects(true, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص');
    }
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  if (!isOpen) return null;

  const folderParts = currentPrefix
    ? currentPrefix.replace(/\/$/, '').split('/')
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-slate-950/80"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-slate-900 rounded-lg text-right overflow-hidden shadow-xl dark:shadow-none transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                  انتخاب رسانه از R2
                </h3>

                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <button
                    type="button"
                    onClick={() => setCurrentPrefix('')}
                    className="font-medium hover:text-gray-900 dark:hover:text-white"
                  >
                    ریشه
                  </button>
                  {folderParts.map((part, index) => {
                    const prefix = `${folderParts
                      .slice(0, index + 1)
                      .join('/')}/`;
                    return (
                      <span key={prefix} className="flex items-center gap-2">
                        <span className="text-gray-400 dark:text-slate-500">
                          /
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentPrefix(prefix)}
                          className="font-medium hover:text-gray-900 dark:hover:text-white"
                        >
                          {part}
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mt-3 text-sm text-red-600 dark:text-rose-200 bg-red-50 dark:bg-rose-900/30 p-3 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Content */}
          <div
            className="bg-gray-50 dark:bg-slate-900/60 px-4 py-5 sm:p-6"
            style={{ maxHeight: '60vh', overflowY: 'auto' }}
          >
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-300" />
              </div>
            ) : objects.length === 0 && folders.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-slate-500" />
                <p>هیچ فایلی در این پوشه وجود ندارد</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    پوشه‌ها
                  </div>
                  {currentPrefix && (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPrefix(getParentPrefix(currentPrefix))
                      }
                      className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
                    >
                      بازگشت به پوشه والد
                    </button>
                  )}
                </div>
                {folders.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                    زیرپوشه‌ای وجود ندارد
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                    {folders.map((prefix) => {
                      const label = prefix
                        .replace(currentPrefix, '')
                        .replace(/\/$/, '');
                      return (
                        <button
                          key={prefix}
                          type="button"
                          onClick={() => setCurrentPrefix(prefix)}
                          className="group border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-right bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600 transition"
                        >
                          <div className="flex items-center gap-2">
                            <FolderIcon className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                            <span className="text-sm text-gray-700 dark:text-slate-200 truncate">
                              {label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
                  فایل‌ها
                </div>
                {objects.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    فایلی در این پوشه وجود ندارد
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {objects.map((obj) => {
                      const isSelected = selectedUrls.has(obj.url);
                      const isImg = isImage(obj.url);

                      return (
                        <div
                          key={obj.key}
                          className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-600'
                          }`}
                          onClick={() => toggleSelection(obj.url)}
                        >
                          {/* Preview */}
                          <div className="aspect-square bg-gray-100 dark:bg-slate-800 relative">
                            {isImg ? (
                              <Image
                                src={optimizeImage.adminThumb(obj.url)}
                                alt={obj.key}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <PhotoIcon className="h-12 w-12 text-gray-400 dark:text-slate-500" />
                              </div>
                            )}

                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute top-2 left-2 bg-blue-600 text-white rounded-full p-1">
                                <CheckIcon className="h-4 w-4" />
                              </div>
                            )}

                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(obj.key);
                              }}
                              className="absolute top-2 right-2 bg-red-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="حذف"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Info */}
                          <div className="p-2 bg-white dark:bg-slate-900">
                            <p
                              className="text-xs text-gray-600 dark:text-slate-300 truncate"
                              title={obj.key}
                            >
                              {obj.key.split('/').pop()}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-slate-500">
                              {(obj.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {hasMore && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={() => loadObjects(false)}
                      disabled={loadingMore}
                      className="text-sm px-4 py-2 border border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      {loadingMore ? 'در حال بارگذاری...' : 'نمایش بیشتر'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-slate-900/60 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3 border-t border-gray-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedUrls.size === 0}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              انتخاب ({selectedUrls.size})
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-slate-700 shadow-sm px-4 py-2 bg-white dark:bg-slate-900 text-base font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
