'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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

  // Touch swipe handling (for main gallery)
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const minSwipeDistance = 50; // Minimum swipe distance in pixels

  // Touch swipe handling (for zoom modal)
  const zoomTouchStartX = useRef<number>(0);
  const zoomTouchEndX = useRef<number>(0)

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

  // Handle ESC key to close zoom modal and prevent body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZoomed) {
        setIsZoomed(false);
      }
    };

    if (isZoomed) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZoomed]);

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

  // Touch swipe handlers for main gallery
  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = 0; // Reset
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // In RTL, left swipe = previous, right swipe = next
    if (isLeftSwipe) {
      goToPrevious();
    } else if (isRightSwipe) {
      goToNext();
    }

    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Touch swipe handlers for zoom modal
  const onZoomTouchStart = (e: React.TouchEvent) => {
    zoomTouchEndX.current = 0; // Reset
    zoomTouchStartX.current = e.targetTouches[0].clientX;
  };

  const onZoomTouchMove = (e: React.TouchEvent) => {
    zoomTouchEndX.current = e.targetTouches[0].clientX;
  };

  const onZoomTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent closing modal on swipe

    if (!zoomTouchStartX.current || !zoomTouchEndX.current) return;

    const distance = zoomTouchStartX.current - zoomTouchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // In RTL, left swipe = previous, right swipe = next
    if (isLeftSwipe) {
      goToPrevious();
    } else if (isRightSwipe) {
      goToNext();
    }

    // Reset
    zoomTouchStartX.current = 0;
    zoomTouchEndX.current = 0;
  };

  return (
    <div className="space-y-4">
      {/* Main Display */}
      <div
        className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden group"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {currentMedia.type === 'IMAGE' ? (
          <>
            <Image
              src={optimizeImage.large(currentMedia.url)}
              alt={currentMedia.alt || productName}
              fill
              className={`object-contain object-center transition-all duration-300 ${
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

        {/* Navigation Arrows - Always visible on mobile, hover on desktop */}
        {sortedMedia.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity active:opacity-100"
              aria-label="تصویر قبلی"
            >
              <ChevronLeftIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-800" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity active:opacity-100"
              aria-label="تصویر بعدی"
            >
              <ChevronRightIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-800" />
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
                  className="object-cover object-center"
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
          className="fixed inset-0 z-50 bg-black bg-opacity-95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
          onTouchStart={onZoomTouchStart}
          onTouchMove={onZoomTouchMove}
          onTouchEnd={onZoomTouchEnd}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
        >
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(false);
            }}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-2 transition-colors z-10"
            aria-label="بستن"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Navigation Arrows for Modal */}
          {sortedMedia.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 shadow-lg transition-all z-10"
                aria-label="تصویر قبلی"
              >
                <ChevronLeftIcon className="h-6 w-6 text-white" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 shadow-lg transition-all z-10"
                aria-label="تصویر بعدی"
              >
                <ChevronRightIcon className="h-6 w-6 text-white" />
              </button>
            </>
          )}

          {/* Counter for Modal */}
          {sortedMedia.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/20 text-white text-sm px-4 py-2 rounded-full z-10">
              {selectedIndex + 1} / {sortedMedia.length}
            </div>
          )}

          <div className="relative w-full h-full max-w-7xl max-h-screen pointer-events-none">
            <Image
              src={optimizeImage.large(currentMedia.url)}
              alt={currentMedia.alt || productName}
              fill
              className={`object-contain transition-opacity duration-300 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
