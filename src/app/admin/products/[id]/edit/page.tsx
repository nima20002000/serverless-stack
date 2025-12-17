'use client';

import { useState, useEffect } from 'react';
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
import type { ProductFormData, Tag, MediaItem, Variant } from '@/types/product-admin';

interface EditProductPageProps {
  params: { id: string };
}

export default function EditProductPage({ params }: EditProductPageProps) {
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

  // Media management (product-level)
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const productMedia = useMediaManager();

  // Variant management
  const variantManager = useVariantManager();

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}?includeRelations=true`);
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
        const productMediaItems = product.media.filter((m: MediaItem) => !m.variantId);
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
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'خطا در بارگذاری محصول';
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

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
      // Step 1: Update product basic info
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          discountPercent: formData.discountPercent ? parseInt(formData.discountPercent) : null,
          stock: formData.hasVariants ? 0 : parseInt(formData.stock),
          hasVariants: formData.hasVariants,
          isFeatured: formData.isFeatured,
          isActive: formData.isActive,
          categoryId: formData.categoryId,
          tagIds: selectedTags.map(t => t.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در به‌روزرسانی محصول');
      }

      // Step 2: Sync media (delete old product-level media and add new ones)
      // Get existing product-level media
      const existingMediaResponse = await fetch(`/api/products/${params.id}/media`);
      const existingMediaData = await existingMediaResponse.json();
      const existingProductMedia = existingMediaData.media.filter((m: MediaItem) => !m.variantId);

      // Delete old product-level media that are not in current media state
      for (const oldMedia of existingProductMedia) {
        const stillExists = productMedia.media.find(m => m.id === oldMedia.id);
        if (!stillExists) {
          await fetch(`/api/products/${params.id}/media/${oldMedia.id}`, {
            method: 'DELETE',
          });
        }
      }

      // Add new product-level media (those with temporary IDs starting with 'new-')
      for (const mediaItem of productMedia.media) {
        if (!mediaItem.id.startsWith('new-')) continue; // Only save new media

        await fetch(`/api/products/${params.id}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: mediaItem.type,
            url: mediaItem.url,
            alt: mediaItem.alt,
            order: mediaItem.order,
            isDefault: mediaItem.isDefault,
          }),
        });
      }

      // Update isDefault for existing product-level media (only if changed)
      for (const mediaItem of productMedia.media) {
        if (mediaItem.id.startsWith('new-')) continue; // Skip new media

        // Check if isDefault actually changed
        const oldMedia = existingProductMedia.find((m: MediaItem) => m.id === mediaItem.id);
        if (oldMedia && oldMedia.isDefault !== mediaItem.isDefault) {
          await fetch(`/api/products/${params.id}/media/${mediaItem.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isDefault: mediaItem.isDefault,
            }),
          });
        }
      }

      // Step 3: Sync variants
      const existingVariantsResponse = await fetch(`/api/products/${params.id}/variants`);
      const existingVariantsData = await existingVariantsResponse.json();
      const existingVariantsFromDB = existingVariantsData.variants || [];

      // Delete variants that were removed
      for (const oldVariant of existingVariantsFromDB) {
        const stillExists = variantManager.variants.find(v => v.id === oldVariant.id);
        if (!stillExists) {
          await fetch(`/api/products/${params.id}/variants/${oldVariant.id}`, {
            method: 'DELETE',
          });
        }
      }

      // Fetch all product media once (to avoid N+1 query pattern)
      const allProductMediaResponse = await fetch(`/api/products/${params.id}/media`);
      const allProductMediaData = await allProductMediaResponse.json();
      const allProductMedia = allProductMediaData.media || [];

      // Update or create variants
      // Track created variant IDs for reordering later
      const variantIdMapping: Record<string, string> = {}; // tempId -> realId

      // Separate existing and new variants
      const existingVariants = variantManager.variants.filter(v => !v.id.startsWith('variant-'));
      const newVariants = variantManager.variants.filter(v => v.id.startsWith('variant-'));

      // Step 3.1: Update all existing variants in parallel (basic info only, no media yet)
      await Promise.all(
        existingVariants.map(variant =>
          fetch(`/api/products/${params.id}/variants/${variant.id}`, {
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

      // Map existing variant IDs
      existingVariants.forEach(variant => {
        variantIdMapping[variant.id] = variant.id;
      });

      // Step 3.2: Sync media for existing variants
      for (const variant of existingVariants) {
        // Sync variant media - use cached media data
        const existingVariantMedia = allProductMedia.filter((m: MediaItem) => m.variantId === variant.id);

        // Delete old variant media
        for (const oldMedia of existingVariantMedia) {
          const stillExists = variant.media?.find(m => m.id === oldMedia.id);
          if (!stillExists) {
            await fetch(`/api/products/${params.id}/media/${oldMedia.id}`, {
              method: 'DELETE',
            });
          }
        }

        // Add new variant media (temporary IDs starting with 'new-')
        if (variant.media) {
          for (const mediaItem of variant.media) {
            if (!mediaItem.id.startsWith('new-')) continue; // Only save new media

            await fetch(`/api/products/${params.id}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                variantId: variant.id,
                type: mediaItem.type,
                url: mediaItem.url,
                alt: mediaItem.alt,
                order: mediaItem.order,
                isDefault: mediaItem.isDefault,
              }),
            });
          }

          // Update isDefault for existing variant media (only if changed)
          for (const mediaItem of variant.media) {
            if (mediaItem.id.startsWith('new-')) continue; // Skip new media

            // Check if isDefault actually changed
            const oldMedia = existingVariantMedia.find((m: MediaItem) => m.id === mediaItem.id);
            if (oldMedia && oldMedia.isDefault !== mediaItem.isDefault) {
              await fetch(`/api/products/${params.id}/media/${mediaItem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  isDefault: mediaItem.isDefault,
                }),
              });
            }
          }
        }
      }

      // Step 3.3: Create new variants
      for (const variant of newVariants) {
        // Create new variant (including order)
        const variantResponse = await fetch(`/api/products/${params.id}/variants`, {
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

        const variantData = await variantResponse.json();
        const variantId = variantData.variant?.id;

        // Map temporary ID to real database ID
        if (variantId) {
          variantIdMapping[variant.id] = variantId;
        }

        // Add variant media
        if (variantId && variant.media && variant.media.length > 0) {
          for (const mediaItem of variant.media) {
            await fetch(`/api/products/${params.id}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                variantId: variantId,
                type: mediaItem.type,
                url: mediaItem.url,
                alt: mediaItem.alt,
                order: mediaItem.order,
                isDefault: mediaItem.isDefault,
              }),
            });
          }
        }
      }

      // Step 4: Reorder all variants in a single transaction
      // This ensures the order is persisted correctly
      if (variantManager.variants.length > 0) {
        const variantOrders = variantManager.variants.map(v => ({
          id: variantIdMapping[v.id] || v.id, // Use real ID from mapping
          order: v.order,
        }));

        await fetch(`/api/products/${params.id}/variants/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantOrders,
          }),
        });
      }

      router.push('/admin/products');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'خطا در ذخیره محصول';
      setErrorMessage(errorMsg);
    } finally {
      setIsSaving(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">در حال بارگذاری...</div>
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

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 text-right">
          ویرایش محصول
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
        <Card>
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
        <Card>
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
        <Card>
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              ذخیره تغییرات
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
