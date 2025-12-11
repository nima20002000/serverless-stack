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
      className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:border-gray-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Variant info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
              {variant.order + 1}
            </span>
            <h4 className="font-medium text-gray-900 text-right">
              {variant.name}
            </h4>
            {variant.media && variant.media.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                {variant.media.length} تصویر
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
            {variant.sku && <p>SKU: {variant.sku}</p>}
            {variant.color && (
              <p className="flex items-center gap-2">
                رنگ:
                <span
                  className="inline-block w-4 h-4 rounded border"
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

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onEdit(variant)}
          >
            ویرایش
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => onDelete(variant.id)}
          >
            حذف
          </Button>
        </div>

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 transition-colors p-1"
          aria-label="جابجایی واریانت"
          type="button"
        >
          <svg
            className="w-6 h-6"
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 text-right">
          انواع محصول (رنگ، سایز، ...)
        </h2>
        {!showVariantForm && (
          <Button
            type="button"
            variant="secondary"
            onClick={onShowForm}
            disabled={disabled}
          >
            + افزودن نوع جدید
          </Button>
        )}
      </div>

      {hasVariantsError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 text-right">{hasVariantsError}</p>
        </div>
      )}

      {/* Variant Form */}
      {showVariantForm && (
        <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-4">
          <h3 className="font-medium text-right">
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

          <div className="space-y-4">
            <GradientColorPicker
              label="رنگ"
              name="color"
              value={variantForm.color}
              onChange={onVariantFormChange}
              placeholder="#000000"
            />

            <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="variantIsActive"
              name="isActive"
              checked={variantForm.isActive}
              onChange={onVariantFormChange}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="variantIsActive" className="text-sm font-medium text-gray-700">
              فعال
            </label>
          </div>

          {/* Variant Media */}
          <div className="border-t border-blue-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2 text-right">
              تصاویر این نوع محصول (اختیاری)
            </h4>
            <p className="text-xs text-gray-600 mb-3 text-right">
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

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onAddOrUpdate}
            >
              {editingVariantId ? 'بروزرسانی' : 'افزودن'}
            </Button>
          </div>
        </div>
      )}

      {/* Variant List with Drag and Drop */}
      {variants.length > 0 ? (
        <div>
          <p className="text-xs text-gray-500 mb-3 text-right">
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
              <div className="space-y-3">
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
        <p className="text-sm text-gray-500 text-center py-8">
          هیچ نوع محصولی اضافه نشده است
        </p>
      )}
    </div>
  );
}
