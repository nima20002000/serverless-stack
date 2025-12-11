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
      <div className="space-y-4">
        {title && (
          <h2 className="text-lg font-semibold text-gray-900 text-right">
            {title}
          </h2>
        )}

        {/* Selected Media Preview Grid */}
        {media.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      ویدیو
                    </div>
                  )}
                  {item.isDefault && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                      پیش‌فرض
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={onOpenBrowser}
          disabled={disabled}
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
