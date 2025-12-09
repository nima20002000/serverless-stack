'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';
import { optimizeImage } from '@/lib/cloudflare-images-client';

interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt?: string;
  order: number;
  variantId?: string | null;
}

interface Variant {
  id: string;
  media?: MediaItem[];
}

interface ProductGalleryProps {
  media: MediaItem[];
  productName: string;
  selectedVariant?: Variant | null;
}

export default function ProductGallery({ media, productName, selectedVariant }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Memoize filtered and sorted media to avoid recalculating on every render
  const sortedMedia = useMemo(() => {
    let displayMedia: MediaItem[];

    if (!selectedVariant) {
      // Show only product-level media (no variantId) when no variant is selected
      displayMedia = media.filter(m => !m.variantId);
    } else {
      // When variant is selected, prefer variant-specific media
      const variantMedia = selectedVariant.media || [];

      // If variant has no specific media, fall back to product-level media
      displayMedia = variantMedia.length === 0
        ? media.filter(m => !m.variantId)
        : variantMedia;
    }

    // Sort by order
    return [...displayMedia].sort((a, b) => a.order - b.order);
  }, [media, selectedVariant]);

  // Reset selectedIndex when variant changes or media changes
  useEffect(() => {
    setSelectedIndex(0);
    setIsZoomed(false);
  }, [selectedVariant?.id, media.length]);

  if (!sortedMedia || sortedMedia.length === 0) {
    return (
      <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-400">تصویری موجود نیست</p>
      </div>
    );
  }

  const currentMedia = sortedMedia[selectedIndex];

  const goToPrevious = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedIndex((prev) => (prev === 0 ? sortedMedia.length - 1 : prev - 1));
      setIsTransitioning(false);
    }, 150);
  };

  const goToNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedIndex((prev) => (prev === sortedMedia.length - 1 ? 0 : prev + 1));
      setIsTransitioning(false);
    }, 150);
  };

  const handleThumbnailClick = (index: number) => {
    if (index !== selectedIndex) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedIndex(index);
        setIsTransitioning(false);
      }, 150);
    }
    setIsZoomed(false);
  };

  return (
    <div className="space-y-4">
      {/* Main Display */}
      <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden group">
        {currentMedia.type === 'IMAGE' ? (
          <>
            <Image
              src={optimizeImage.large(currentMedia.url)}
              alt={currentMedia.alt || productName}
              fill
              className={`object-contain transition-all duration-300 ${
                isZoomed ? 'cursor-zoom-out scale-150' : 'cursor-zoom-in'
              } ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
              onClick={() => setIsZoomed(!isZoomed)}
              priority={selectedIndex === 0}
            />
          </>
        ) : (
          <video
            src={currentMedia.url}
            controls
            className={`w-full h-full object-contain transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
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

        {/* Variant Indicator */}
        {selectedVariant && (
          <div className={`absolute top-4 right-4 text-white text-xs px-3 py-1.5 rounded-full shadow-lg ${
            selectedVariant.media && selectedVariant.media.length > 0
              ? 'bg-blue-600'
              : 'bg-gray-600'
          }`}>
            {selectedVariant.media && selectedVariant.media.length > 0
              ? `تصاویر ویژه نوع: ${selectedVariant.media.length}`
              : 'تصاویر پیش‌فرض محصول'
            }
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
                  src={optimizeImage.adminThumb(item.url)}
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
              src={optimizeImage.large(currentMedia.url)}
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
