import Image from 'next/image';
import Button from '@/components/ui/Button';
import R2MediaBrowser from '@/components/admin/R2MediaBrowser';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { MediaItem } from '@/types/product-admin';

interface MediaManagerProps {
  media: MediaItem[];
  onMediaSelect: (urls: string[]) => void;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
  showBrowser: boolean;
  onOpenBrowser: () => void;
  onCloseBrowser: () => void;
  disabled?: boolean;
  title?: string;
  buttonLabel?: string;
}

/**
 * Reusable component for managing media (images/videos)
 * Used for both product-level and variant-level media
 */
export default function MediaManager({
  media,
  onMediaSelect,
  onSetDefault,
  onRemove,
  showBrowser,
  onOpenBrowser,
  onCloseBrowser,
  disabled = false,
  title = 'تصاویر و ویدیو',
  buttonLabel = '+ انتخاب رسانه از R2',
}: MediaManagerProps) {
  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {title && (
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 text-right">
            {title}
          </h2>
        )}

        {/* Selected Media Preview Grid */}
        {media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {media.map((item) => (
              <div
                key={item.id}
                className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer ${
                  item.isDefault ? 'border-blue-500' : 'border-gray-200'
                }`}
                onClick={() => onSetDefault(item.id)}
                title="کلیک کنید تا عکس پیش‌فرض شود"
              >
                <div className="aspect-square relative bg-gray-200">
                  {item.type === 'IMAGE' ? (
                    <Image
                      src={item.url}
                      alt={item.alt || 'Product media'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs sm:text-sm">
                      ویدیو
                    </div>
                  )}
                  {item.isDefault && (
                    <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-blue-600 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium">
                      پیش‌فرض
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-red-600 text-white rounded p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onOpenBrowser}
          disabled={disabled}
          className="w-full sm:w-auto text-sm"
        >
          {buttonLabel}
        </Button>
      </div>

      {/* R2MediaBrowser Modal */}
      <R2MediaBrowser
        isOpen={showBrowser}
        onClose={onCloseBrowser}
        onSelect={onMediaSelect}
        multiSelect={true}
        initialFolder="products/images"
        allowUpload={true}
      />
    </>
  );
}
