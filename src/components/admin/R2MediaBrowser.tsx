'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, PhotoIcon, FolderIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

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
  /** Show upload button */
  allowUpload?: boolean;
}

const FOLDERS = [
  { value: 'products/images', label: 'تصاویر محصولات' },
  { value: 'products/videos', label: 'ویدیوهای محصولات' },
  { value: 'categories/images', label: 'تصاویر دسته‌بندی‌ها' },
  { value: 'media-library/images', label: 'تصاویر کتابخانه رسانه' },
  { value: 'media-library/videos', label: 'ویدیوهای کتابخانه رسانه' },
];

export default function R2MediaBrowser({
  isOpen,
  onClose,
  onSelect,
  multiSelect = false,
  initialFolder = 'products/images',
  allowUpload = true,
}: R2MediaBrowserProps) {
  const [objects, setObjects] = useState<R2Object[]>([]);
  const [selectedFolder, setSelectedFolder] = useState(initialFolder);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Load objects when folder changes
  useEffect(() => {
    if (isOpen) {
      loadObjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, isOpen]);

  // Reset selection when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedUrls(new Set());
      setError('');
    }
  }, [isOpen]);

  const loadObjects = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/admin/r2-browser?prefix=${selectedFolder}/&maxKeys=100`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در دریافت فایل‌ها');
      }

      setObjects(data.objects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص');
      setObjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', selectedFolder);

      const response = await fetch('/api/admin/r2-browser/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در آپلود فایل');
      }

      // Reload objects after upload
      await loadObjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    e.target.value = '';
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
      await loadObjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص');
    }
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900">انتخاب رسانه از R2</h3>

                {/* Folder selector */}
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-3 py-2"
                  disabled={loading || uploading}
                >
                  {FOLDERS.map((folder) => (
                    <option key={folder.value} value={folder.value}>
                      {folder.label}
                    </option>
                  ))}
                </select>

                {/* Upload button */}
                {allowUpload && (
                  <label className="relative cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileInput}
                      disabled={uploading || loading}
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploading || loading}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4" />
                      {uploading ? 'در حال آپلود...' : 'آپلود فایل'}
                    </button>
                  </label>
                )}
              </div>

              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="bg-gray-50 px-4 py-5 sm:p-6" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : objects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>هیچ فایلی در این پوشه وجود ندارد</p>
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
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleSelection(obj.url)}
                    >
                      {/* Preview */}
                      <div className="aspect-square bg-gray-100 relative">
                        {isImg ? (
                          <Image
                            src={obj.url}
                            alt={obj.key}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <PhotoIcon className="h-12 w-12 text-gray-400" />
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
                      <div className="p-2 bg-white">
                        <p className="text-xs text-gray-600 truncate" title={obj.key}>
                          {obj.key.split('/').pop()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(obj.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3 border-t">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedUrls.size === 0}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              انتخاب ({selectedUrls.size})
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
