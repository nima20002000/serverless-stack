import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GradientColorPicker from '@/components/ui/GradientColorPicker';
import MediaManager from '@/components/admin/MediaManager';
import { useState } from 'react';
import type {
  Variant,
  VariantFormData,
  MediaItem,
} from '@/types/product-admin';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatPrice } from '@/lib/utils/format';
import { siteLocale } from '@/config/site';
import {
  DEFAULT_SWATCH_CROP,
  SWATCH_CROP_LIMITS,
  getVariantSwatchStyle,
  normalizeVariantSwatchCrop,
} from '@/lib/variant-swatch';

interface VariantManagerProps {
  variants: Variant[];
  showVariantForm: boolean;
  editingVariantId: string | null;
  variantForm: VariantFormData;
  variantMedia: MediaItem[];
  productMedia?: MediaItem[];
  onVariantFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSetVariantForm: React.Dispatch<React.SetStateAction<VariantFormData>>;
  onAddOrUpdate: () => void;
  onEdit: (variant: Variant) => void;
  onDelete: (variantId: string) => void;
  onCancel: () => void;
  onShowForm: () => void;
  onSetVariantMedia: (media: MediaItem[]) => void;
  onReorder?: (startIndex: number, endIndex: number) => void;
  disabled?: boolean;
  hasVariantsError?: string;
}

/**
 * Sortable variant card component
 */
function SortableVariantCard({
  variant,
  onEdit,
  onDelete,
}: {
  variant: Variant;
  onEdit: (variant: Variant) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: variant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 sm:p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900/60 hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
        {/* Variant info */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 text-[10px] sm:text-xs font-medium flex-shrink-0">
              {variant.order + 1}
            </span>
            <h4 className="font-medium text-gray-900 dark:text-slate-100 text-left text-sm sm:text-base">
              {variant.name}
            </h4>
            {variant.media && variant.media.length > 0 && (
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-200 whitespace-nowrap">
                {variant.media.length} Image
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-slate-400">
            {variant.sku && <p>SKU: {variant.sku}</p>}
            {variant.color && (
              <p className="flex items-center gap-2">
                Color:
                <span
                  className="inline-block w-3 h-3 sm:w-4 sm:h-4 rounded border"
                  style={{ background: variant.color }}
                />
              </p>
            )}
            {variant.size && <p>Size: {variant.size}</p>}
            {variant.material && <p>Material: {variant.material}</p>}
            <p>
              Price adjustment: {formatPrice(parseInt(variant.priceAdjust))}
            </p>
            <p>Stock: {variant.stock}</p>
          </div>
        </div>

        {/* Actions and Drag handle wrapper */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          {/* Actions */}
          <div className="flex gap-1.5 sm:gap-2 flex-1 sm:flex-none">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEdit(variant)}
              className="flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3"
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => onDelete(variant.id)}
              className="flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3"
            >
              Delete
            </Button>
          </div>

          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1 flex-shrink-0"
            aria-label="Reorder variant"
            type="button"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable component for managing product variants
 * Includes variant form, list, and variant-specific media management
 */
export default function VariantManager({
  variants,
  showVariantForm,
  editingVariantId,
  variantForm,
  variantMedia,
  productMedia = [],
  onVariantFormChange,
  onSetVariantForm,
  onAddOrUpdate,
  onEdit,
  onDelete,
  onCancel,
  onShowForm,
  onSetVariantMedia,
  onReorder,
  disabled = false,
  hasVariantsError,
}: VariantManagerProps) {
  const [showVariantMediaBrowser, setShowVariantMediaBrowser] = useState(false);

  // Drag and drop sensors - includes TouchSensor for mobile
  // Mobile/tablet: Requires press-and-hold (500ms) to activate drag, preventing scroll conflicts
  // Desktop: Only requires 8px movement to start dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Desktop: Require 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 500, // Mobile/tablet: 500ms press-and-hold before drag activates (prevents scroll interference)
        tolerance: 8, // Allow 8px of movement during the delay without canceling
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = variants.findIndex((v) => v.id === active.id);
      const newIndex = variants.findIndex((v) => v.id === over.id);

      onReorder(oldIndex, newIndex);
    }
  };

  // Variant media management - work directly with props to ensure state synchronization
  const handleVariantMediaSelect = (urls: string[]) => {
    const newMedia: MediaItem[] = urls.map((url, index) => ({
      id: `new-${Date.now()}-${index}`,
      type: url.includes('/videos/') ? 'VIDEO' : 'IMAGE',
      url,
      alt: '',
      order: variantMedia.length + index,
      isDefault: variantMedia.length === 0 && index === 0, // First photo is default if no media exists
      isNew: true,
    }));
    onSetVariantMedia([...variantMedia, ...newMedia]);
  };

  const handleSetDefaultVariantMedia = (id: string) => {
    const updatedMedia = variantMedia.map((m) => ({
      ...m,
      isDefault: m.id === id,
    }));
    onSetVariantMedia(updatedMedia);
  };

  const handleRemoveVariantMedia = (id: string) => {
    const removedItem = variantMedia.find((m) => m.id === id);
    const remaining = variantMedia.filter((m) => m.id !== id);

    // If removing the default media and there are remaining items, make the first one default
    if (removedItem?.isDefault && remaining.length > 0) {
      remaining[0].isDefault = true;
    }

    onSetVariantMedia(remaining);
  };

  const swatchImageOptions = [...productMedia, ...variantMedia]
    .filter((media) => media.type === 'IMAGE')
    .filter(
      (media, index, items) =>
        items.findIndex((item) => item.url === media.url) === index
    );

  const handleSelectSwatchImage = (url: string) => {
    onSetVariantForm((prev) => ({
      ...prev,
      swatchImageUrl: url,
      swatchCrop: normalizeVariantSwatchCrop(prev.swatchCrop),
    }));
  };

  const handleClearSwatch = () => {
    onSetVariantForm((prev) => ({
      ...prev,
      swatchImageUrl: '',
      swatchCrop: DEFAULT_SWATCH_CROP,
    }));
  };

  const handleSwatchCropChange = (field: 'x' | 'y' | 'zoom', value: string) => {
    onSetVariantForm((prev) => ({
      ...prev,
      swatchCrop: normalizeVariantSwatchCrop({
        ...prev.swatchCrop,
        [field]: Number(value),
      }),
    }));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 text-left order-1">
          Product variants
        </h2>
        {!showVariantForm && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onShowForm}
            disabled={disabled}
            className="w-full sm:w-auto order-2 text-sm"
          >
            + Add variant
          </Button>
        )}
      </div>

      {hasVariantsError && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 dark:bg-rose-900/30 border border-red-200 dark:border-rose-700 rounded-lg">
          <p className="text-xs sm:text-sm text-red-600 dark:text-rose-200 text-left">
            {hasVariantsError}
          </p>
        </div>
      )}

      {/* Variant Form */}
      {showVariantForm && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-slate-900/60 rounded-lg space-y-3 sm:space-y-4">
          <h3 className="font-medium text-left text-sm sm:text-base">
            {editingVariantId && !editingVariantId.startsWith('variant-')
              ? 'Edit variant'
              : 'Add variant'}
          </h3>

          <Input
            label="Variant name"
            name="name"
            value={variantForm.name}
            onChange={onVariantFormChange}
            placeholder="Red - Large"
          />

          <Input
            label="SKU (optional)"
            name="sku"
            value={variantForm.sku}
            onChange={onVariantFormChange}
            placeholder="PRD-RED-L"
          />

          <div className="space-y-3 sm:space-y-4">
            <GradientColorPicker
              label="Color"
              name="color"
              value={variantForm.color}
              onChange={onVariantFormChange}
              placeholder="#000000"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label="Size"
                name="size"
                value={variantForm.size}
                onChange={onVariantFormChange}
                placeholder="L, XL, ..."
              />

              <Input
                label="Material"
                name="material"
                value={variantForm.material}
                onChange={onVariantFormChange}
                placeholder="Cotton Wool ..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label={`Price adjustment (${siteLocale.currency})`}
              name="priceAdjust"
              type="number"
              value={variantForm.priceAdjust}
              onChange={onVariantFormChange}
              placeholder="0"
              dir="ltr"
            />

            <Input
              label="Stock"
              name="stock"
              type="number"
              value={variantForm.stock}
              onChange={onVariantFormChange}
              placeholder="10"
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <input
              type="checkbox"
              id="variantIsActive"
              name="isActive"
              checked={variantForm.isActive}
              onChange={onVariantFormChange}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-700 dark:bg-slate-900"
            />
            <label
              htmlFor="variantIsActive"
              className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              Active
            </label>
          </div>

          {/* Variant Media */}
          <div className="border-t border-blue-200 dark:border-blue-900/50 pt-3 sm:pt-4">
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 mb-2 text-left">
              Variant media (optional)
            </h4>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-slate-400 mb-2 sm:mb-3 text-left">
              Attach media that should appear when this variant is selected.
            </p>

            <MediaManager
              media={variantMedia}
              onMediaSelect={handleVariantMediaSelect}
              onSetDefault={handleSetDefaultVariantMedia}
              onRemove={handleRemoveVariantMedia}
              showBrowser={showVariantMediaBrowser}
              onOpenBrowser={() => setShowVariantMediaBrowser(true)}
              onCloseBrowser={() => setShowVariantMediaBrowser(false)}
              title=""
            />
          </div>

          <div className="border-t border-blue-200 dark:border-blue-900/50 pt-3 sm:pt-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="flex-1">
                <h4 className="mb-2 text-left text-xs font-medium text-gray-900 dark:text-slate-100 sm:text-sm">
                  Variant swatch image
                </h4>
                <p className="mb-3 text-left text-[10px] text-gray-600 dark:text-slate-400 sm:text-xs">
                  Select an existing product or variant image for the storefront
                  swatch.
                </p>

                {swatchImageOptions.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {swatchImageOptions.map((media) => {
                      const isSelected =
                        variantForm.swatchImageUrl === media.url;

                      return (
                        <button
                          key={`${media.id}-${media.url}`}
                          type="button"
                          onClick={() => handleSelectSwatchImage(media.url)}
                          className={`aspect-square overflow-hidden rounded border-2 bg-gray-100 transition-colors dark:bg-slate-800 ${
                            isSelected
                              ? 'border-blue-600 ring-2 ring-blue-200/70 dark:border-blue-300 dark:ring-blue-500/40'
                              : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-500'
                          }`}
                          aria-label={`Use ${media.alt || 'image'} as swatch`}
                        >
                          <span
                            className="block h-full w-full bg-cover bg-center"
                            style={{
                              backgroundImage: `url("${media.url}")`,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded border border-dashed border-gray-300 p-3 text-left text-xs text-gray-500 dark:border-slate-700 dark:text-slate-400">
                    Add product or variant images before choosing a swatch.
                  </p>
                )}
              </div>

              <div className="w-full rounded border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 lg:w-64">
                <div className="flex items-center gap-3">
                  <div
                    className="h-16 w-16 flex-shrink-0 rounded-full border border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-800"
                    style={getVariantSwatchStyle(
                      variantForm.swatchImageUrl,
                      variantForm.swatchCrop
                    )}
                    aria-label="Variant swatch preview"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-medium text-gray-900 dark:text-slate-100">
                      Swatch preview
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleClearSwatch}
                      disabled={!variantForm.swatchImageUrl}
                      className="mt-2 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {variantForm.swatchImageUrl && (
                  <div className="mt-4 space-y-3">
                    <label className="block text-left text-xs text-gray-600 dark:text-slate-400">
                      Horizontal crop
                      <input
                        type="range"
                        min={SWATCH_CROP_LIMITS.x.min}
                        max={SWATCH_CROP_LIMITS.x.max}
                        step="1"
                        value={variantForm.swatchCrop.x}
                        onChange={(event) =>
                          handleSwatchCropChange('x', event.target.value)
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-left text-xs text-gray-600 dark:text-slate-400">
                      Vertical crop
                      <input
                        type="range"
                        min={SWATCH_CROP_LIMITS.y.min}
                        max={SWATCH_CROP_LIMITS.y.max}
                        step="1"
                        value={variantForm.swatchCrop.y}
                        onChange={(event) =>
                          handleSwatchCropChange('y', event.target.value)
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-left text-xs text-gray-600 dark:text-slate-400">
                      Zoom
                      <input
                        type="range"
                        min={SWATCH_CROP_LIMITS.zoom.min}
                        max={SWATCH_CROP_LIMITS.zoom.max}
                        step="0.1"
                        value={variantForm.swatchCrop.zoom}
                        onChange={(event) =>
                          handleSwatchCropChange('zoom', event.target.value)
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-start">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onCancel}
              className="w-full sm:w-auto order-2 sm:order-1 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onAddOrUpdate}
              className="w-full sm:w-auto order-1 sm:order-2 text-sm"
            >
              {editingVariantId ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Variant List with Drag and Drop */}
      {variants.length > 0 ? (
        <div>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-500 mb-2 sm:mb-3 text-left">
            Drag variants to change their display order.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={variants.map((v) => v.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 sm:space-y-3">
                {variants.map((variant) => (
                  <SortableVariantCard
                    key={variant.id}
                    variant={variant}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-500 text-center py-6 sm:py-8">
          No variants added yet.
        </p>
      )}
    </div>
  );
}
