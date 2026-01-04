'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import ProductFormFields from '@/components/admin/ProductFormFields';
import MediaManager from '@/components/admin/MediaManager';
import VariantManager from '@/components/admin/VariantManager';
import { useMediaManager } from '@/hooks/useMediaManager';
import { useVariantManager } from '@/hooks/useVariantManager';
import type {
  ProductFormData,
  Tag,
  MediaItem,
  Variant,
} from '@/types/product-admin';
import { toast } from '@/store/toast-store';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  throw new Error(text || fallbackMessage);
}

async function readErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => null);
    if (data && typeof data.error === 'string') {
      return data.error;
    }
  }
  const text = await response.text();
  return text || fallbackMessage;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    discountPercent: '',
    stock: '',
    hasVariants: false,
    isFeatured: false,
    isActive: true,
    categoryId: null,
  });
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [originalVariants, setOriginalVariants] = useState<Variant[]>([]);

  // Media management (product-level)
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const productMedia = useMediaManager();

  // Variant management
  const variantManager = useVariantManager();

  const fetchProduct = async () => {
    try {
      // includeInactive=true to show all variants including inactive ones for admin editing
      const response = await fetch(
        `/api/products/${id}?includeRelations=true&includeInactive=true`
      );
      if (!response.ok) throw new Error('محصول یافت نشد');

      const data = await response.json();
      const product = data.product;

      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        discountPercent: product.discountPercent?.toString() || '',
        stock: product.stock.toString(),
        hasVariants: product.hasVariants || false,
        isFeatured: product.isFeatured || false,
        isActive: product.isActive,
        categoryId: product.categoryId || null,
      });

      // Load existing media (product-level only, not variant media)
      if (product.media) {
        const productMediaItems = product.media.filter(
          (m: MediaItem) => !m.variantId
        );
        productMedia.setMedia(productMediaItems);
      }

      // Load existing tags
      if (product.tags) {
        setSelectedTags(product.tags);
      }

      // Load existing variants with their media (sorted by order)
      if (product.variants) {
        const formattedVariants = product.variants
          .sort((a: Variant, b: Variant) => (a.order ?? 0) - (b.order ?? 0))
          .map((v: Variant) => ({
            id: v.id,
            name: v.name,
            sku: v.sku || '',
            color: v.color || '',
            size: v.size || '',
            material: v.material || '',
            priceAdjust: v.priceAdjust.toString(),
            stock: v.stock.toString(),
            order: v.order ?? 0,
            isActive: v.isActive,
            media: v.media || [],
          }));
        variantManager.setVariants(formattedVariants);
        setOriginalVariants(formattedVariants); // Store original state for comparison
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'خطا در بارگذاری محصول';
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        discountPercent: formData.discountPercent
          ? parseInt(formData.discountPercent)
          : null,
        hasVariants: formData.hasVariants,
        isFeatured: formData.isFeatured,
        isActive: formData.isActive,
        categoryId: formData.categoryId,
        tagIds: selectedTags.map((t) => t.id),
      };

      if (!formData.hasVariants) {
        payload.stock = parseInt(formData.stock);
      }

      // Step 1: Update product basic info
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readJsonResponse<{ error?: string }>(
        response,
        'خطا در به‌روزرسانی محصول'
      );

      if (!response.ok) {
        throw new Error(data.error || 'خطا در به‌روزرسانی محصول');
      }

      // Step 2: Fetch existing media and variants in parallel
      const [existingMediaResponse, existingVariantsResponse] =
        await Promise.all([
          fetch(`/api/products/${id}/media`),
          fetch(`/api/products/${id}/variants`),
        ]);

      if (!existingMediaResponse.ok) {
        throw new Error(
          await readErrorMessage(
            existingMediaResponse,
            'خطا در دریافت رسانه‌های محصول'
          )
        );
      }
      if (!existingVariantsResponse.ok) {
        throw new Error(
          await readErrorMessage(
            existingVariantsResponse,
            'خطا در دریافت واریانت‌ها'
          )
        );
      }

      const existingMediaData = await readJsonResponse<{
        media: MediaItem[];
      }>(existingMediaResponse, 'خطا در دریافت رسانه‌های محصول');
      const existingVariantsData = await readJsonResponse<{
        variants?: Variant[];
      }>(existingVariantsResponse, 'خطا در دریافت واریانت‌ها');

      const allExistingMedia = existingMediaData.media || [];
      const existingVariantsFromDB = existingVariantsData.variants || [];

      // Step 3: Sync variants first (need IDs for new variant media)
      const variantIdMapping: Record<string, string> = {}; // tempId -> realId

      // Separate existing and new variants
      const existingVariants = variantManager.variants.filter(
        (v) => !v.id.startsWith('variant-')
      );
      const newVariants = variantManager.variants.filter((v) =>
        v.id.startsWith('variant-')
      );

      // Helper: Check if variant properties changed
      const variantPropsChanged = (
        current: (typeof existingVariants)[0],
        original: (typeof originalVariants)[0] | undefined
      ) => {
        if (!original) return true;
        return (
          current.name !== original.name ||
          current.sku !== original.sku ||
          current.color !== original.color ||
          current.size !== original.size ||
          current.material !== original.material ||
          current.priceAdjust !== original.priceAdjust ||
          current.stock !== original.stock ||
          current.isActive !== original.isActive
        );
      };

      // Delete variants that were removed (in parallel)
      const variantsToDelete = existingVariantsFromDB.filter(
        (oldVariant) =>
          !variantManager.variants.find((v) => v.id === oldVariant.id)
      );
      if (variantsToDelete.length > 0) {
        await Promise.all(
          variantsToDelete.map((v) =>
            fetch(`/api/products/${id}/variants/${v.id}`, {
              method: 'DELETE',
            })
          )
        );
      }

      // Update changed variants in parallel
      const variantsToUpdate = existingVariants.filter((variant) => {
        const original = originalVariants.find((v) => v.id === variant.id);
        return variantPropsChanged(variant, original);
      });

      if (variantsToUpdate.length > 0) {
        await Promise.all(
          variantsToUpdate.map((variant) =>
            fetch(`/api/products/${id}/variants/${variant.id}`, {
              method: 'PUT',
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
            })
          )
        );
      }

      // Map existing variant IDs
      existingVariants.forEach((variant) => {
        variantIdMapping[variant.id] = variant.id;
      });

      // Create new variants (sequentially to get IDs, but this is typically few)
      for (const variant of newVariants) {
        const variantResponse = await fetch(`/api/products/${id}/variants`, {
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
            order: variant.order,
            isActive: variant.isActive,
          }),
        });

        const variantData = await readJsonResponse<{
          error?: string;
          variant?: { id?: string };
        }>(variantResponse, 'خطا در ایجاد واریانت');
        if (!variantResponse.ok) {
          throw new Error(variantData.error || 'خطا در ایجاد واریانت');
        }
        const variantId = variantData.variant?.id;
        if (variantId) {
          variantIdMapping[variant.id] = variantId;
        }
      }

      // Step 4: Batch sync ALL media (product-level + variant media) in a single request
      // This is the key optimization - instead of N sequential requests, we do ONE batch request
      const mediaOperations = {
        delete: [] as string[],
        add: [] as Array<{
          variantId?: string;
          type: string;
          url: string;
          alt?: string;
          order?: number;
          isDefault?: boolean;
        }>,
        update: [] as Array<{
          id: string;
          isDefault?: boolean;
        }>,
      };

      // Calculate product-level media changes
      const existingProductMedia = allExistingMedia.filter(
        (m: MediaItem) => !m.variantId
      );

      // Media to delete (product-level)
      for (const oldMedia of existingProductMedia) {
        const stillExists = productMedia.media.find(
          (m) => m.id === oldMedia.id
        );
        if (!stillExists) {
          mediaOperations.delete.push(oldMedia.id);
        }
      }

      // Media to add (product-level)
      for (const mediaItem of productMedia.media) {
        if (mediaItem.id.startsWith('new-')) {
          mediaOperations.add.push({
            type: mediaItem.type,
            url: mediaItem.url,
            alt: mediaItem.alt,
            order: mediaItem.order,
            isDefault: mediaItem.isDefault,
          });
        }
      }

      // Media to update isDefault (product-level)
      for (const mediaItem of productMedia.media) {
        if (mediaItem.id.startsWith('new-')) continue;
        const oldMedia = existingProductMedia.find(
          (m: MediaItem) => m.id === mediaItem.id
        );
        if (oldMedia && oldMedia.isDefault !== mediaItem.isDefault) {
          mediaOperations.update.push({
            id: mediaItem.id,
            isDefault: mediaItem.isDefault,
          });
        }
      }

      // Calculate variant media changes
      for (const variant of variantManager.variants) {
        const realVariantId = variantIdMapping[variant.id] || variant.id;
        const isNewVariant = variant.id.startsWith('variant-');

        // Get existing variant media from DB
        const existingVariantMedia = allExistingMedia.filter(
          (m: MediaItem) => m.variantId === variant.id
        );

        // For existing variants, find deleted media
        if (!isNewVariant) {
          for (const oldMedia of existingVariantMedia) {
            const stillExists = variant.media?.find(
              (m) => m.id === oldMedia.id
            );
            if (!stillExists) {
              mediaOperations.delete.push(oldMedia.id);
            }
          }
        }

        // Add new variant media
        if (variant.media) {
          for (const mediaItem of variant.media) {
            if (mediaItem.id.startsWith('new-')) {
              mediaOperations.add.push({
                variantId: realVariantId,
                type: mediaItem.type,
                url: mediaItem.url,
                alt: mediaItem.alt,
                order: mediaItem.order,
                isDefault: mediaItem.isDefault,
              });
            }
          }

          // Update isDefault for existing variant media
          if (!isNewVariant) {
            for (const mediaItem of variant.media) {
              if (mediaItem.id.startsWith('new-')) continue;
              const oldMedia = existingVariantMedia.find(
                (m: MediaItem) => m.id === mediaItem.id
              );
              if (oldMedia && oldMedia.isDefault !== mediaItem.isDefault) {
                mediaOperations.update.push({
                  id: mediaItem.id,
                  isDefault: mediaItem.isDefault,
                });
              }
            }
          }
        }
      }

      // Execute batch media sync if there are any operations
      if (
        mediaOperations.delete.length > 0 ||
        mediaOperations.add.length > 0 ||
        mediaOperations.update.length > 0
      ) {
        const batchSyncResponse = await fetch(`/api/products/${id}/media`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mediaOperations),
        });

        if (!batchSyncResponse.ok) {
          throw new Error(
            await readErrorMessage(
              batchSyncResponse,
              'خطا در همگام‌سازی رسانه‌ها'
            )
          );
        }
      }

      // Step 5: Reorder variants only if order changed
      const orderChanged =
        variantManager.variants.some((variant) => {
          const original = originalVariants.find((v) => v.id === variant.id);
          return !original || original.order !== variant.order;
        }) || newVariants.length > 0;

      if (orderChanged && variantManager.variants.length > 0) {
        const variantOrders = variantManager.variants.map((v) => ({
          id: variantIdMapping[v.id] || v.id,
          order: v.order,
        }));

        await fetch(`/api/products/${id}/variants/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantOrders,
          }),
        });
      }

      router.push('/admin/products');
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'خطا در ذخیره محصول';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-slate-400">
          در حال بارگذاری...
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'مدیریت محصولات', href: '/admin/products' },
          { label: 'ویرایش محصول' },
        ]}
      />

      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 text-right">
          ویرایش محصول
        </h1>
      </div>

      {errorMessage && (
        <Alert
          type="error"
          className="mb-4"
          onClose={() => setErrorMessage('')}
        >
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Basic Information */}
        <Card padding="sm">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4 text-right">
            اطلاعات پایه
          </h2>

          <ProductFormFields
            formData={formData}
            selectedTags={selectedTags}
            variants={variantManager.variants}
            errors={errors}
            disabled={isSaving}
            onChange={handleChange}
            onTagsChange={setSelectedTags}
          />
        </Card>

        {/* Media */}
        <Card padding="sm">
          <MediaManager
            media={productMedia.media}
            onMediaSelect={productMedia.handleMediaSelect}
            onSetDefault={productMedia.setDefaultMedia}
            onRemove={productMedia.removeMedia}
            showBrowser={showMediaBrowser}
            onOpenBrowser={() => setShowMediaBrowser(true)}
            onCloseBrowser={() => setShowMediaBrowser(false)}
            disabled={isSaving}
            title="تصاویر و ویدیو محصول"
          />
        </Card>

        {/* Variants */}
        <Card padding="sm">
          <VariantManager
            variants={variantManager.variants}
            showVariantForm={variantManager.showVariantForm}
            editingVariantId={variantManager.editingVariantId}
            variantForm={variantManager.variantForm}
            variantMedia={variantManager.variantMedia}
            onVariantFormChange={variantManager.handleVariantFormChange}
            onAddOrUpdate={variantManager.addOrUpdateVariant}
            onEdit={variantManager.editVariant}
            onDelete={variantManager.deleteVariant}
            onCancel={variantManager.cancelVariantEdit}
            onShowForm={() => variantManager.setShowVariantForm(true)}
            onSetVariantMedia={variantManager.setVariantMedia}
            onReorder={variantManager.reorderVariants}
            disabled={isSaving}
          />
        </Card>

        {/* Submit Buttons */}
        <Card padding="sm">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.back()}
              disabled={isSaving}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              ذخیره تغییرات
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
