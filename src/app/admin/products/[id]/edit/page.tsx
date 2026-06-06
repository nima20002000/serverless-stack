'use client';

import { useState, useEffect, use, useMemo } from 'react';
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
  type ProductFormSnapshot,
} from '@/lib/admin/product-form-dirty';
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

function useUnwrappedParams(params: Promise<{ id: string }>): { id: string } {
  return use(params);
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
  const { id } = useUnwrappedParams(params);
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
  const [initialSnapshot, setInitialSnapshot] =
    useState<ProductFormSnapshot | null>(null);

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
      if (!response.ok) throw new Error('Product not found');

      const data = await response.json();
      const product = data.product;
      const nextFormData = {
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        discountPercent: product.discountPercent?.toString() || '',
        stock: product.stock.toString(),
        hasVariants: product.hasVariants || false,
        isFeatured: product.isFeatured || false,
        isActive: product.isActive,
        categoryId: product.categoryId || null,
      };

      setFormData(nextFormData);

      // Load existing media (product-level only, not variant media)
      let nextProductMedia: MediaItem[] = [];
      if (product.media) {
        nextProductMedia = product.media.filter((m: MediaItem) => !m.variantId);
      }
      productMedia.setMedia(nextProductMedia);

      // Load existing tags
      let nextSelectedTags: Tag[] = [];
      if (product.tags) {
        nextSelectedTags = product.tags;
      }
      setSelectedTags(nextSelectedTags);

      // Load existing variants with their media (sorted by order)
      let nextVariants: Variant[] = [];
      if (product.variants) {
        nextVariants = product.variants
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
            swatchImageUrl: v.swatchImageUrl || null,
            swatchCrop: v.swatchCrop || null,
          }));
      }
      variantManager.setVariants(nextVariants);
      setOriginalVariants(nextVariants); // Store original state for comparison

      setInitialSnapshot(
        createProductFormSnapshot({
          formData: nextFormData,
          selectedTags: nextSelectedTags,
          productMedia: nextProductMedia,
          variants: nextVariants,
          variantDraft: {
            showVariantForm: false,
            editingVariantId: null,
            form: variantManager.variantForm,
            media: [],
          },
        })
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unable to load product';
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

    if (!formData.stock || parseInt(formData.stock) < 0) {
      newErrors.stock = 'Stock must be zero or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
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
        'Unable to update product'
      );

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update product');
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
            'Unable to load product media'
          )
        );
      }
      if (!existingVariantsResponse.ok) {
        throw new Error(
          await readErrorMessage(
            existingVariantsResponse,
            'Unable to load variants'
          )
        );
      }

      const existingMediaData = await readJsonResponse<{
        media: MediaItem[];
      }>(existingMediaResponse, 'Unable to load product media');
      const existingVariantsData = await readJsonResponse<{
        variants?: Variant[];
      }>(existingVariantsResponse, 'Unable to load variants');

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
          current.isActive !== original.isActive ||
          current.swatchImageUrl !== original.swatchImageUrl ||
          JSON.stringify(current.swatchCrop || null) !==
            JSON.stringify(original.swatchCrop || null)
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

      // Update changed variants using batch API (single request instead of N parallel requests)
      const variantsToUpdate = existingVariants.filter((variant) => {
        const original = originalVariants.find((v) => v.id === variant.id);
        return variantPropsChanged(variant, original);
      });

      if (variantsToUpdate.length > 0) {
        const batchUpdateResponse = await fetch(
          `/api/products/${id}/variants`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              variants: variantsToUpdate.map((variant) => ({
                id: variant.id,
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

        if (!batchUpdateResponse.ok) {
          throw new Error(
            await readErrorMessage(
              batchUpdateResponse,
              'Unable to update variants'
            )
          );
        }
      }

      // Map existing variant IDs
      existingVariants.forEach((variant) => {
        variantIdMapping[variant.id] = variant.id;
      });

      // Create new variants in batch (single API call instead of N sequential calls)
      if (newVariants.length > 0) {
        const batchResponse = await fetch(`/api/products/${id}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variants: newVariants.map((variant) => ({
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
              swatchImageUrl: variant.swatchImageUrl || null,
              swatchCrop: variant.swatchCrop || null,
            })),
          }),
        });

        const batchData = await readJsonResponse<{
          error?: string;
          idMapping?: Record<string, string>;
        }>(batchResponse, 'Unable to create variants');

        if (!batchResponse.ok) {
          throw new Error(batchData.error || 'Unable to create variants');
        }

        // Merge the ID mapping from batch creation
        if (batchData.idMapping) {
          Object.assign(variantIdMapping, batchData.idMapping);
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
            await readErrorMessage(batchSyncResponse, 'Unable to sync media')
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

      unsavedChangesGuard.allowedPush('/admin/products');
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unable to save product';
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
        <div className="text-gray-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', href: '/admin/products' },
          { label: 'Edit Product' },
        ]}
      />

      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 text-left">
          Edit Product
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
            title="Media and Video Product"
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
            disabled={isSaving}
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
              disabled={isSaving}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Save changes
            </Button>
          </div>
        </Card>
      </form>
      {unsavedChangesGuard.dialog}
    </div>
  );
}
