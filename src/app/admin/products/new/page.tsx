'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import MediaUploader from '@/components/products/MediaUploader';
import CategorySelector from '@/components/admin/CategorySelector';
import TagInput from '@/components/admin/TagInput';

interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt?: string;
  order: number;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface Variant {
  id: string;
  name: string;
  sku?: string;
  color?: string;
  size?: string;
  material?: string;
  priceAdjust: string;
  stock: string;
  isActive: boolean;
  media?: MediaItem[];
}

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discountPercent: '',
    stock: '',
    isFeatured: false,
    isActive: true,
    categoryId: null as string | null,
  });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState({
    name: '',
    sku: '',
    color: '',
    size: '',
    material: '',
    priceAdjust: '0',
    stock: '0',
    isActive: true,
  });
  const [variantMedia, setVariantMedia] = useState<MediaItem[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'نام محصول الزامی است';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'توضیحات محصول الزامی است';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'قیمت باید بیشتر از صفر باشد';
    }

    if (formData.discountPercent) {
      const discount = parseInt(formData.discountPercent);
      if (discount < 0 || discount > 100) {
        newErrors.discountPercent = 'تخفیف باید بین 0 تا 100 درصد باشد';
      }
    }

    if (!formData.stock || parseInt(formData.stock) < 0) {
      newErrors.stock = 'موجودی نمی‌تواند منفی باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create product
      const productResponse = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          discountPercent: formData.discountPercent ? parseInt(formData.discountPercent) : null,
          stock: parseInt(formData.stock),
          isFeatured: formData.isFeatured,
          isActive: formData.isActive,
          categoryId: formData.categoryId,
          tagIds: selectedTags.map(t => t.id),
          images: [], // Keep for backward compatibility
        }),
      });

      const productData = await productResponse.json();

      if (!productResponse.ok) {
        throw new Error(productData.error || 'خطا در ایجاد محصول');
      }

      const productId = productData.product.id;

      // Step 2: Add media
      if (media.length > 0) {
        for (const mediaItem of media) {
          await fetch(`/api/products/${productId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: mediaItem.type,
              url: mediaItem.url,
              alt: mediaItem.alt,
              order: mediaItem.order,
            }),
          });
        }
      }

      // Step 3: Add variants
      if (variants.length > 0) {
        for (const variant of variants) {
          const variantResponse = await fetch(`/api/products/${productId}/variants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: variant.name,
              sku: variant.sku || undefined,
              color: variant.color || undefined,
              size: variant.size || undefined,
              material: variant.material || undefined,
              priceAdjust: parseFloat(variant.priceAdjust),
              stock: parseInt(variant.stock),
              isActive: variant.isActive,
            }),
          });

          const variantData = await variantResponse.json();
          const variantId = variantData.variant?.id;

          // Step 4: Add variant-specific media
          if (variantId && variant.media && variant.media.length > 0) {
            for (const mediaItem of variant.media) {
              await fetch(`/api/products/${productId}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  variantId: variantId,
                  type: mediaItem.type,
                  url: mediaItem.url,
                  alt: mediaItem.alt,
                  order: mediaItem.order,
                }),
              });
            }
          }
        }
      }

      router.push('/admin/products');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'خطا در ایجاد محصول';
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleVariantFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setVariantForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const addOrUpdateVariant = () => {
    if (!variantForm.name.trim()) {
      alert('نام نوع محصول الزامی است');
      return;
    }

    if (editingVariantId) {
      // Update existing variant
      setVariants(variants.map(v =>
        v.id === editingVariantId
          ? { ...variantForm, id: editingVariantId, media: variantMedia }
          : v
      ));
      setEditingVariantId(null);
    } else {
      // Add new variant
      const newVariant: Variant = {
        ...variantForm,
        id: `variant-${Date.now()}`,
        media: variantMedia,
      };
      setVariants([...variants, newVariant]);
    }

    // Reset form
    setVariantForm({
      name: '',
      sku: '',
      color: '',
      size: '',
      material: '',
      priceAdjust: '0',
      stock: '0',
      isActive: true,
    });
    setVariantMedia([]);
    setShowVariantForm(false);
  };

  const editVariant = (variant: Variant) => {
    setVariantForm({
      name: variant.name,
      sku: variant.sku || '',
      color: variant.color || '',
      size: variant.size || '',
      material: variant.material || '',
      priceAdjust: variant.priceAdjust,
      stock: variant.stock,
      isActive: variant.isActive,
    });
    setVariantMedia(variant.media || []);
    setEditingVariantId(variant.id);
    setShowVariantForm(true);
  };

  const deleteVariant = (variantId: string) => {
    if (confirm('آیا از حذف این نوع محصول اطمینان دارید؟')) {
      setVariants(variants.filter(v => v.id !== variantId));
    }
  };

  const cancelVariantEdit = () => {
    setVariantForm({
      name: '',
      sku: '',
      color: '',
      size: '',
      material: '',
      priceAdjust: '0',
      stock: '0',
      isActive: true,
    });
    setVariantMedia([]);
    setEditingVariantId(null);
    setShowVariantForm(false);
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'مدیریت محصولات', href: '/admin/products' },
          { label: 'افزودن محصول جدید' },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 text-right">
          افزودن محصول جدید
        </h1>
      </div>

      {errorMessage && (
        <Alert type="error" className="mb-4" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-right">
            اطلاعات پایه
          </h2>

          <div className="space-y-6">
            <Input
              label="نام محصول"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              disabled={isLoading}
              placeholder="مثال: لپ‌تاپ ایسوس"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                دسته‌بندی
              </label>
              <CategorySelector
                value={formData.categoryId}
                onChange={(categoryId) => setFormData(prev => ({ ...prev, categoryId }))}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                برچسب‌ها
              </label>
              <TagInput
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                توضیحات محصول
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isLoading}
                rows={5}
                className="w-full px-4 py-2 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="توضیحات کامل محصول را وارد کنید"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 text-right">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="قیمت (تومان)"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                error={errors.price}
                disabled={isLoading}
                placeholder="1500000"
                dir="ltr"
              />

              <Input
                label="تخفیف (درصد)"
                name="discountPercent"
                type="number"
                value={formData.discountPercent}
                onChange={handleChange}
                error={errors.discountPercent}
                disabled={isLoading}
                placeholder="0"
                min="0"
                max="100"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="موجودی"
                name="stock"
                type="number"
                value={formData.stock}
                onChange={handleChange}
                error={errors.stock}
                disabled={isLoading}
                placeholder="10"
                dir="ltr"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isFeatured"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700">
                  محصول ویژه
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  محصول فعال باشد
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Media */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-right">
            تصاویر و ویدیو
          </h2>
          <MediaUploader
            media={media}
            onChange={setMedia}
            disabled={isLoading}
          />
        </Card>

        {/* Variants */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 text-right">
              انواع محصول (رنگ، سایز، ...)
            </h2>
            {!showVariantForm && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowVariantForm(true)}
                disabled={isLoading}
              >
                + افزودن نوع جدید
              </Button>
            )}
          </div>

          {showVariantForm && (
            <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-4">
              <h3 className="font-medium text-right">
                {editingVariantId ? 'ویرایش نوع محصول' : 'افزودن نوع جدید'}
              </h3>

              <Input
                label="نام نوع (مثال: قرمز - بزرگ)"
                name="name"
                value={variantForm.name}
                onChange={handleVariantFormChange}
                placeholder="قرمز - بزرگ"
              />

              <Input
                label="SKU (اختیاری)"
                name="sku"
                value={variantForm.sku}
                onChange={handleVariantFormChange}
                placeholder="PRD-RED-L"
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="رنگ"
                  name="color"
                  type="color"
                  value={variantForm.color}
                  onChange={handleVariantFormChange}
                />

                <Input
                  label="سایز"
                  name="size"
                  value={variantForm.size}
                  onChange={handleVariantFormChange}
                  placeholder="L, XL, ..."
                />

                <Input
                  label="جنس"
                  name="material"
                  value={variantForm.material}
                  onChange={handleVariantFormChange}
                  placeholder="پنبه، پشم، ..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="تغییر قیمت (تومان)"
                  name="priceAdjust"
                  type="number"
                  value={variantForm.priceAdjust}
                  onChange={handleVariantFormChange}
                  placeholder="0"
                  dir="ltr"
                />

                <Input
                  label="موجودی"
                  name="stock"
                  type="number"
                  value={variantForm.stock}
                  onChange={handleVariantFormChange}
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
                  onChange={handleVariantFormChange}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="variantIsActive" className="text-sm font-medium text-gray-700">
                  فعال
                </label>
              </div>

              <div className="border-t border-blue-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2 text-right">
                  تصاویر این نوع محصول (اختیاری)
                </h4>
                <p className="text-xs text-gray-600 mb-3 text-right">
                  تصاویری که اینجا آپلود می‌کنید فقط برای این نوع محصول نمایش داده می‌شوند
                </p>
                <MediaUploader
                  media={variantMedia}
                  onChange={setVariantMedia}
                  disabled={false}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelVariantEdit}
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={addOrUpdateVariant}
                >
                  {editingVariantId ? 'بروزرسانی' : 'افزودن'}
                </Button>
              </div>
            </div>
          )}

          {variants.length > 0 ? (
            <div className="space-y-3">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
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
                              style={{ backgroundColor: variant.color }}
                            />
                          </p>
                        )}
                        {variant.size && <p>سایز: {variant.size}</p>}
                        {variant.material && <p>جنس: {variant.material}</p>}
                        <p>تغییر قیمت: {parseInt(variant.priceAdjust).toLocaleString('fa-IR')} تومان</p>
                        <p>موجودی: {variant.stock}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mr-4">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => editVariant(variant)}
                      >
                        ویرایش
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => deleteVariant(variant.id)}
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              هیچ نوع محصولی اضافه نشده است
            </p>
          )}
        </Card>

        {/* Submit Buttons */}
        <Card>
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              ایجاد محصول
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
