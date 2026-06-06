'use client';

import { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import ProductFormFields from '@/components/admin/ProductFormFields';
import MediaManager from '@/components/admin/MediaManager';
import VariantManager from '@/components/admin/VariantManager';
import { useMediaManager } from '@/hooks/useMediaManager';
import { useVariantManager } from '@/hooks/useVariantManager';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import {
  createProductFormSnapshot,
  isProductFormDirty,
} from '@/lib/admin/product-form-dirty';
import type { ProductFormData, Tag } from '@/types/product-admin';
import { toast } from '@/store/toast-store';

const initialProductFormData: ProductFormData = {
  name: '',
  description: '',
  price: '',
  discountPercent: '',
  stock: '',
  hasVariants: false,
  isFeatured: false,
  isActive: true,
  categoryId: null,
};

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

export default function NewProductPage() {
  const [formData, setFormData] = useState<ProductFormData>(
    initialProductFormData
  );
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Media management (product-level)
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const productMedia = useMediaManager();

  // Variant management
  const variantManager = useVariantManager();
  const initialSnapshot = useMemo(
    () =>
      createProductFormSnapshot({
        formData: initialProductFormData,
        selectedTags: [],
        productMedia: [],
        variants: [],
        variantDraft: {
          showVariantForm: false,
          editingVariantId: null,
          form: variantManager.variantForm,
          media: [],
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const currentSnapshot = useMemo(
    () =>
      createProductFormSnapshot({
        formData,
        selectedTags,
        productMedia: productMedia.media,
        variants: variantManager.variants,
        variantDraft: {
          showVariantForm: variantManager.showVariantForm,
          editingVariantId: variantManager.editingVariantId,
          form: variantManager.variantForm,
          media: variantManager.variantMedia,
        },
      }),
    [
      formData,
      productMedia.media,
      selectedTags,
      variantManager.editingVariantId,
      variantManager.showVariantForm,
      variantManager.variantForm,
      variantManager.variantMedia,
      variantManager.variants,
    ]
  );
  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty: isProductFormDirty(initialSnapshot, currentSnapshot),
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Product description is required';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than zero';
    }

    if (formData.discountPercent) {
      const discount = parseInt(formData.discountPercent);
      if (discount < 0 || discount > 100) {
        newErrors.discountPercent = 'Discount must be between 0 and 100';
      }
    }

    // Stock validation - required only if hasVariants is false
    if (!formData.hasVariants) {
      if (!formData.stock || parseInt(formData.stock) < 0) {
        newErrors.stock = 'Stock must be zero or greater';
      }
    }

    // Variant validation - if hasVariants is true, at least one variant is required
    if (formData.hasVariants && variantManager.variants.length === 0) {
      newErrors.variants = 'Add at least one variant';
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
          discountPercent: formData.discountPercent
            ? parseInt(formData.discountPercent)
            : null,
          stock: formData.hasVariants ? 0 : parseInt(formData.stock), // If variants enabled, stock is 0 initially
          hasVariants: formData.hasVariants,
          isFeatured: formData.isFeatured,
          isActive: formData.isActive,
          categoryId: formData.categoryId,
          tagIds: selectedTags.map((t) => t.id),
          images: [], // Keep for backward compatibility
        }),
      });

      const productData = await readJsonResponse<{
        error?: string;
        product?: { id: string };
      }>(productResponse, 'Unable to create product');

      if (!productResponse.ok) {
        throw new Error(productData.error || 'Unable to create product');
      }

      const productId = productData.product?.id;
      if (!productId) {
        throw new Error('Created product ID was not returned');
      }

      // Step 2: Create variants in batch (single API call instead of N+1 requests)
      let variantIdMapping: Record<string, string> = {}; // tempId -> realId

      if (variantManager.variants.length > 0) {
        const variantsToCreate = variantManager.variants.map((variant) => ({
          tempId: variant.id,
          name: variant.name,
          sku: variant.sku || undefined,
          color: variant.color || undefined,
          size: variant.size || undefined,
          material: variant.material || undefined,
          priceAdjust: parseFloat(variant.priceAdjust),
          stock: parseInt(variant.stock),
          order: variant.order,
          isActive: variant.isActive,
        }));

        const variantResponse = await fetch(
          `/api/products/${productId}/variants`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variants: variantsToCreate }),
          }
        );

        const variantData = await readJsonResponse<{
          error?: string;
          idMapping?: Record<string, string>;
        }>(variantResponse, 'Unable to create variants');

        if (!variantResponse.ok) {
          throw new Error(variantData.error || 'Unable to create variants');
        }

        variantIdMapping = variantData.idMapping || {};
      }

      // Step 3: Batch add all media (product-level + variant) in a single request
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

      // Add product-level media
      for (const mediaItem of productMedia.media) {
        mediaOperations.add.push({
          type: mediaItem.type,
          url: mediaItem.url,
          alt: mediaItem.alt,
          order: mediaItem.order,
          isDefault: mediaItem.isDefault,
        });
      }

      // Add variant media
      for (const variant of variantManager.variants) {
        const realVariantId = variantIdMapping[variant.id];
        if (realVariantId && variant.media && variant.media.length > 0) {
          for (const mediaItem of variant.media) {
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
      }

      // Execute batch media sync if there are any media to add
      if (mediaOperations.add.length > 0) {
        const batchSyncResponse = await fetch(
          `/api/products/${productId}/media`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mediaOperations),
          }
        );

        if (!batchSyncResponse.ok) {
          throw new Error(
            await readErrorMessage(batchSyncResponse, 'Unable to add media')
          );
        }
      }

      const swatchVariantsToUpdate = variantManager.variants.filter(
        (variant) => variant.swatchImageUrl && variantIdMapping[variant.id]
      );

      if (swatchVariantsToUpdate.length > 0) {
        const swatchUpdateResponse = await fetch(
          `/api/products/${productId}/variants`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              variants: swatchVariantsToUpdate.map((variant) => ({
                id: variantIdMapping[variant.id],
                name: variant.name,
                sku: variant.sku || undefined,
                color: variant.color || undefined,
                size: variant.size || undefined,
                material: variant.material || undefined,
                priceAdjust: parseFloat(variant.priceAdjust),
                stock: parseInt(variant.stock),
                isActive: variant.isActive,
                swatchImageUrl: variant.swatchImageUrl || null,
                swatchCrop: variant.swatchCrop || null,
              })),
            }),
          }
        );

        if (!swatchUpdateResponse.ok) {
          throw new Error(
            await readErrorMessage(
              swatchUpdateResponse,
              'Unable to save variant swatches'
            )
          );
        }
      }

      unsavedChangesGuard.allowedPush('/admin/products');
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unable to create product';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
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

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', href: '/admin/products' },
          { label: 'Add product' },
        ]}
      />

      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 text-left">
          Add product
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
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4 text-left">
            Basic information
          </h2>

          <ProductFormFields
            formData={formData}
            selectedTags={selectedTags}
            variants={variantManager.variants}
            errors={errors}
            disabled={isLoading}
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
            disabled={isLoading}
            title="Media and Video"
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
            productMedia={productMedia.media}
            onVariantFormChange={variantManager.handleVariantFormChange}
            onSetVariantForm={variantManager.setVariantForm}
            onAddOrUpdate={variantManager.addOrUpdateVariant}
            onEdit={variantManager.editVariant}
            onDelete={variantManager.deleteVariant}
            onCancel={variantManager.cancelVariantEdit}
            onShowForm={() => variantManager.setShowVariantForm(true)}
            onSetVariantMedia={variantManager.setVariantMedia}
            onReorder={variantManager.reorderVariants}
            disabled={isLoading}
            hasVariantsError={errors.variants}
          />
        </Card>

        {/* Submit Buttons */}
        <Card padding="sm">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-start">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={unsavedChangesGuard.guardedBack}
              disabled={isLoading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Create Product
            </Button>
          </div>
        </Card>
      </form>
      {unsavedChangesGuard.dialog}
    </div>
  );
}
