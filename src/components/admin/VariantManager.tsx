import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GradientColorPicker from '@/components/ui/GradientColorPicker';
import MediaManager from '@/components/admin/MediaManager';
import { useMediaManager } from '@/hooks/useMediaManager';
import { useState } from 'react';
import type { Variant, VariantFormData, MediaItem } from '@/types/product-admin';
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

interface VariantManagerProps {
  variants: Variant[];
  showVariantForm: boolean;
  editingVariantId: string | null;
  variantForm: VariantFormData;
  variantMedia: MediaItem[];
  onVariantFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
      className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50 hover:border-gray-300 transition-colors"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
        {/* Variant info */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 text-blue-800 text-[10px] sm:text-xs font-medium flex-shrink-0">
              {variant.order + 1}
            </span>
            <h4 className="font-medium text-gray-900 text-right text-sm sm:text-base">
              {variant.name}
            </h4>
            {variant.media && variant.media.length > 0 && (
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                {variant.media.length} تصویر
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
            {variant.sku && <p>SKU: {variant.sku}</p>}
            {variant.color && (
              <p className="flex items-center gap-2">
                رنگ:
                <span
                  className="inline-block w-3 h-3 sm:w-4 sm:h-4 rounded border"
                  style={{ background: variant.color }}
                />
              </p>
            )}
            {variant.size && <p>سایز: {variant.size}</p>}
            {variant.material && <p>جنس: {variant.material}</p>}
            <p>تغییر قیمت: {parseInt(variant.priceAdjust).toLocaleString('fa-IR')} تومان</p>
            <p>موجودی: {variant.stock}</p>
          </div>
        </div>

        {/* Actions and Drag handle wrapper */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Actions */}
          <div className="flex gap-1.5 sm:gap-2 flex-1 sm:flex-none">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEdit(variant)}
              className="flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3"
            >
              ویرایش
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => onDelete(variant.id)}
              className="flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3"
            >
              حذف
            </Button>
          </div>

          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 transition-colors p-1 flex-shrink-0"
            aria-label="جابجایی واریانت"
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
  onVariantFormChange,
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

  // Use media manager hook for variant media
  const variantMediaManager = useMediaManager(variantMedia);

  // Sync variant media changes back to parent
  const handleVariantMediaSelect = (urls: string[]) => {
    variantMediaManager.handleMediaSelect(urls);
    // Update parent immediately
    setTimeout(() => {
      onSetVariantMedia(variantMediaManager.media);
    }, 0);
  };

  const handleSetDefaultVariantMedia = (id: string) => {
    variantMediaManager.setDefaultMedia(id);
    setTimeout(() => {
      onSetVariantMedia(variantMediaManager.media);
    }, 0);
  };

  const handleRemoveVariantMedia = (id: string) => {
    variantMediaManager.removeMedia(id);
    setTimeout(() => {
      onSetVariantMedia(variantMediaManager.media);
    }, 0);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 text-right order-1">
          انواع محصول (رنگ، سایز، ...)
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
            + افزودن نوع جدید
          </Button>
        )}
      </div>

      {hasVariantsError && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs sm:text-sm text-red-600 text-right">{hasVariantsError}</p>
        </div>
      )}

      {/* Variant Form */}
      {showVariantForm && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-3 sm:space-y-4">
          <h3 className="font-medium text-right text-sm sm:text-base">
            {editingVariantId && !editingVariantId.startsWith('variant-')
              ? 'ویرایش نوع محصول'
              : 'افزودن نوع جدید'}
          </h3>

          <Input
            label="نام نوع (مثال: قرمز - بزرگ)"
            name="name"
            value={variantForm.name}
            onChange={onVariantFormChange}
            placeholder="قرمز - بزرگ"
          />

          <Input
            label="SKU (اختیاری)"
            name="sku"
            value={variantForm.sku}
            onChange={onVariantFormChange}
            placeholder="PRD-RED-L"
          />

          <div className="space-y-3 sm:space-y-4">
            <GradientColorPicker
              label="رنگ"
              name="color"
              value={variantForm.color}
              onChange={onVariantFormChange}
              placeholder="#000000"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label="سایز"
                name="size"
                value={variantForm.size}
                onChange={onVariantFormChange}
                placeholder="L, XL, ..."
              />

              <Input
                label="جنس"
                name="material"
                value={variantForm.material}
                onChange={onVariantFormChange}
                placeholder="پنبه، پشم، ..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="تغییر قیمت (تومان)"
              name="priceAdjust"
              type="number"
              value={variantForm.priceAdjust}
              onChange={onVariantFormChange}
              placeholder="0"
              dir="ltr"
            />

            <Input
              label="موجودی"
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
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="variantIsActive" className="text-xs sm:text-sm font-medium text-gray-700">
              فعال
            </label>
          </div>

          {/* Variant Media */}
          <div className="border-t border-blue-200 pt-3 sm:pt-4">
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 text-right">
              تصاویر این نوع محصول (اختیاری)
            </h4>
            <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3 text-right">
              تصاویری که اینجا انتخاب می‌کنید فقط برای این نوع محصول نمایش داده می‌شوند
            </p>

            <MediaManager
              media={variantMediaManager.media}
              onMediaSelect={handleVariantMediaSelect}
              onSetDefault={handleSetDefaultVariantMedia}
              onRemove={handleRemoveVariantMedia}
              showBrowser={showVariantMediaBrowser}
              onOpenBrowser={() => setShowVariantMediaBrowser(true)}
              onCloseBrowser={() => setShowVariantMediaBrowser(false)}
              title=""
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onCancel}
              className="w-full sm:w-auto order-2 sm:order-1 text-sm"
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onAddOrUpdate}
              className="w-full sm:w-auto order-1 sm:order-2 text-sm"
            >
              {editingVariantId ? 'بروزرسانی' : 'افزودن'}
            </Button>
          </div>
        </div>
      )}

      {/* Variant List with Drag and Drop */}
      {variants.length > 0 ? (
        <div>
          <p className="text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3 text-right">
            💡 برای تغییر ترتیب نمایش، واریانت‌ها را با نگه داشتن آیکن کشیده و جابجا کنید
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
        <p className="text-xs sm:text-sm text-gray-500 text-center py-6 sm:py-8">
          هیچ نوع محصولی اضافه نشده است
        </p>
      )}
    </div>
  );
}
