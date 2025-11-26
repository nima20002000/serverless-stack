'use client';

import { useState, useCallback } from 'react';
import { XMarkIcon, PhotoIcon, VideoCameraIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt?: string;
  order: number;
  file?: File;
  isNew?: boolean;
}

interface MediaUploaderProps {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export default function MediaUploader({
  media,
  onChange,
  maxFiles = 10,
  disabled = false
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const uploadFile = async (file: File): Promise<{ url: string; type: 'IMAGE' | 'VIDEO' }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload/product-media', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'خطا در آپلود فایل');
    }

    return response.json();
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (media.length + files.length > maxFiles) {
      alert(`حداکثر ${maxFiles} فایل می‌توانید آپلود کنید`);
      return;
    }

    setUploading(true);
    const newMedia: MediaItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFile(file);

        newMedia.push({
          id: `new-${Date.now()}-${i}`,
          type: result.type,
          url: result.url,
          alt: file.name,
          order: media.length + newMedia.length,
          isNew: true,
        });
      }

      onChange([...media, ...newMedia]);
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'خطا در آپلود فایل‌ها');
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  }, [media, maxFiles, onChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || uploading) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, uploading, handleFiles]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || uploading) return;
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const removeMedia = (id: string) => {
    onChange(media.filter(m => m.id !== id));
  };

  const moveMedia = (id: string, direction: 'up' | 'down') => {
    const index = media.findIndex(m => m.id === id);
    if (index === -1) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === media.length - 1) return;

    const newMedia = [...media];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    [newMedia[index], newMedia[swapIndex]] = [newMedia[swapIndex], newMedia[index]];

    // Update order values
    newMedia.forEach((item, idx) => {
      item.order = idx;
    });

    onChange(newMedia);
  };

  const updateAlt = (id: string, alt: string) => {
    onChange(media.map(m => m.id === id ? { ...m, alt } : m));
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          onChange={handleFileInput}
          disabled={disabled || uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="space-y-2">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="text-sm text-gray-600">در حال آپلود...</p>
            </>
          ) : (
            <>
              <div className="flex justify-center gap-2">
                <PhotoIcon className="h-12 w-12 text-gray-400" />
                <VideoCameraIcon className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                فایل‌ها را اینجا بکشید یا کلیک کنید
              </p>
              <p className="text-xs text-gray-500">
                تصاویر: JPG, PNG, WEBP, GIF (حداکثر 5MB)
                <br />
                ویدیو: MP4, WEBM, MOV (حداکثر 50MB)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Media Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item, index) => (
            <div key={item.id} className="relative group border rounded-lg overflow-hidden bg-gray-50">
              {/* Preview */}
              <div className="aspect-square relative bg-gray-200">
                {item.type === 'IMAGE' ? (
                  <Image
                    src={item.url}
                    alt={item.alt || 'Product media'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <VideoCameraIcon className="h-12 w-12 text-gray-400" />
                    <video
                      src={item.url}
                      className="absolute inset-0 w-full h-full object-cover opacity-50"
                      muted
                    />
                  </div>
                )}

                {/* Order Badge */}
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {index + 1}
                </div>
              </div>

              {/* Controls */}
              <div className="p-2 space-y-2">
                <input
                  type="text"
                  value={item.alt || ''}
                  onChange={(e) => updateAlt(item.id, e.target.value)}
                  placeholder="توضیح تصویر..."
                  className="w-full text-xs border rounded px-2 py-1"
                  disabled={disabled}
                />

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveMedia(item.id, 'up')}
                    disabled={disabled || index === 0}
                    className="flex-1 p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="انتقال به بالا"
                  >
                    <ArrowUpIcon className="h-4 w-4 mx-auto" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveMedia(item.id, 'down')}
                    disabled={disabled || index === media.length - 1}
                    className="flex-1 p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="انتقال به پایین"
                  >
                    <ArrowDownIcon className="h-4 w-4 mx-auto" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeMedia(item.id)}
                    disabled={disabled}
                    className="flex-1 p-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="حذف"
                  >
                    <XMarkIcon className="h-4 w-4 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Counter */}
      {media.length > 0 && (
        <p className="text-sm text-gray-600 text-center">
          {media.length} از {maxFiles} فایل
        </p>
      )}
    </div>
  );
}
