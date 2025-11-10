'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';

interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt?: string;
  order: number;
}

interface ProductGalleryProps {
  media: MediaItem[];
  productName: string;
}

export default function ProductGallery({ media, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!media || media.length === 0) {
    return (
      <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-400">تصویری موجود نیست</p>
      </div>
    );
  }

  const sortedMedia = [...media].sort((a, b) => a.order - b.order);
  const currentMedia = sortedMedia[selectedIndex];

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? sortedMedia.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === sortedMedia.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
    setIsZoomed(false);
  };

  return (
    <div className="space-y-4">
      {/* Main Display */}
      <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden group">
        {currentMedia.type === 'IMAGE' ? (
          <>
            <Image
              src={currentMedia.url}
              alt={currentMedia.alt || productName}
              fill
              className={`object-contain transition-transform ${
                isZoomed ? 'cursor-zoom-out scale-150' : 'cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
              priority={selectedIndex === 0}
            />
          </>
        ) : (
          <video
            src={currentMedia.url}
            controls
            className="w-full h-full object-contain"
            poster={currentMedia.url.replace(/\.[^.]+$/, '-poster.jpg')}
          >
            مرورگر شما از نمایش ویدیو پشتیبانی نمی‌کند.
          </video>
        )}

        {/* Navigation Arrows */}
        {sortedMedia.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="تصویر قبلی"
            >
              <ChevronLeftIcon className="h-6 w-6 text-gray-800" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="تصویر بعدی"
            >
              <ChevronRightIcon className="h-6 w-6 text-gray-800" />
            </button>
          </>
        )}

        {/* Counter */}
        {sortedMedia.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
            {selectedIndex + 1} / {sortedMedia.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {sortedMedia.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sortedMedia.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleThumbnailClick(index)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === selectedIndex
                  ? 'border-blue-600 ring-2 ring-blue-200'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {item.type === 'IMAGE' ? (
                <Image
                  src={item.url}
                  alt={item.alt || `${productName} - ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="relative w-full h-full bg-gray-200">
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <PlayIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      {isZoomed && currentMedia.type === 'IMAGE' && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
            aria-label="بستن"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          <div className="relative w-full h-full max-w-7xl max-h-screen">
            <Image
              src={currentMedia.url}
              alt={currentMedia.alt || productName}
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
