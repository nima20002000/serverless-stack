import Input from '@/components/ui/Input';
import CategorySelector from '@/components/admin/CategorySelector';
import TagInput from '@/components/admin/TagInput';
import type { ProductFormData, Tag, Variant } from '@/types/product-admin';

interface ProductFormFieldsProps {
  formData: ProductFormData;
  selectedTags: Tag[];
  variants: Variant[];
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onTagsChange: (tags: Tag[]) => void;
}

/**
 * Reusable component for product form fields (basic information)
 * Used in both new and edit product pages
 */
export default function ProductFormFields({
  formData,
  selectedTags,
  variants,
  errors,
  disabled = false,
  onChange,
  onTagsChange,
}: ProductFormFieldsProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Input
        label="نام محصول"
        name="name"
        value={formData.name}
        onChange={onChange}
        error={errors.name}
        disabled={disabled}
        placeholder="مثال: لپ‌تاپ ایسوس"
      />

      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
          دسته‌بندی
        </label>
        <CategorySelector
          value={formData.categoryId}
          onChange={(categoryId) => {
            const event = {
              target: {
                name: 'categoryId',
                value: categoryId,
                type: 'text',
              },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(event);
          }}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
          برچسب‌ها
        </label>
        <TagInput
          selectedTags={selectedTags}
          onChange={onTagsChange}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-right">
          توضیحات محصول
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={onChange}
          disabled={disabled}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
          placeholder="توضیحات کامل محصول را وارد کنید"
        />
        {errors.description && (
          <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-rose-200 text-right">
            {errors.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Input
          label="قیمت"
          name="price"
          type="number"
          value={formData.price}
          onChange={onChange}
          error={errors.price}
          disabled={disabled}
          placeholder="1500000"
          dir="ltr"
        />

        <Input
          label="تخفیف (درصد)"
          name="discountPercent"
          type="number"
          value={formData.discountPercent}
          onChange={onChange}
          error={errors.discountPercent}
          disabled={disabled}
          placeholder="0"
          min="0"
          max="100"
          dir="ltr"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-slate-900/60 rounded-lg">
        <input
          type="checkbox"
          id="hasVariants"
          name="hasVariants"
          checked={formData.hasVariants}
          onChange={onChange}
          disabled={disabled}
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0 border-gray-300 dark:border-slate-700 dark:bg-slate-900"
        />
        <label
          htmlFor="hasVariants"
          className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300"
        >
          این محصول دارای انواع مختلف است (رنگ، سایز، جنس، ...)
        </label>
      </div>

      {formData.hasVariants && (
        <div className="p-3 sm:p-4 border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
            <strong>توجه:</strong> با فعال کردن این گزینه، موجودی کل محصول به
            صورت خودکار از مجموع موجودی انواع محصول محاسبه می‌شود.
            {variants.length > 0
              ? ` موجودی فعلی: ${variants.reduce((sum, v) => sum + parseInt(v.stock || '0'), 0)} عدد`
              : ' حتماً حداقل یک نوع محصول با موجودی مشخص اضافه کنید.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Input
          label={
            formData.hasVariants ? 'موجودی (محاسبه خودکار از انواع)' : 'موجودی'
          }
          name="stock"
          type="number"
          value={
            formData.hasVariants
              ? variants
                  .reduce((sum, v) => sum + parseInt(v.stock || '0'), 0)
                  .toString()
              : formData.stock
          }
          onChange={onChange}
          error={errors.stock}
          disabled={disabled || formData.hasVariants}
          placeholder="10"
          dir="ltr"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <input
            type="checkbox"
            id="isFeatured"
            name="isFeatured"
            checked={formData.isFeatured}
            onChange={onChange}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-700 dark:bg-slate-900"
          />
          <label
            htmlFor="isFeatured"
            className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            محصول ویژه
          </label>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={onChange}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-700 dark:bg-slate-900"
          />
          <label
            htmlFor="isActive"
            className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            محصول فعال باشد
          </label>
        </div>
      </div>
    </div>
  );
}
