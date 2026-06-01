import { useState } from 'react';
import type {
  Variant,
  VariantFormData,
  MediaItem,
} from '@/types/product-admin';

/**
 * Custom hook for managing product variants
 * Handles: adding, updating, editing, deleting variants
 */
export function useVariantManager(initialVariants: Variant[] = []) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormData>({
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
      alert('Variant name is required.');
      return;
    }

    if (editingVariantId) {
      // Update existing variant (preserve order)
      setVariants(
        variants.map((v) =>
          v.id === editingVariantId
            ? {
                ...variantForm,
                id: editingVariantId,
                order: v.order,
                media: variantMedia,
              }
            : v
        )
      );
      setEditingVariantId(null);
    } else {
      // Add new variant at the end
      const newOrder =
        variants.length > 0 ? Math.max(...variants.map((v) => v.order)) + 1 : 0;

      const newVariant: Variant = {
        ...variantForm,
        id: `variant-${Date.now()}`,
        order: newOrder,
        media: variantMedia,
      };
      setVariants([...variants, newVariant]);
    }

    // Reset form
    resetVariantForm();
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
    if (confirm('Delete this product variant?')) {
      const deletedVariant = variants.find((v) => v.id === variantId);
      if (!deletedVariant) return;

      // Remove variant and renumber remaining ones
      const updatedVariants = variants
        .filter((v) => v.id !== variantId)
        .map((v) => ({
          ...v,
          order: v.order > deletedVariant.order ? v.order - 1 : v.order,
        }));

      setVariants(updatedVariants);
    }
  };

  const reorderVariants = (startIndex: number, endIndex: number) => {
    const result = Array.from(variants);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    // Update order field for all variants
    const reordered = result.map((variant, index) => ({
      ...variant,
      order: index,
    }));

    setVariants(reordered);
  };

  const resetVariantForm = () => {
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

  const cancelVariantEdit = resetVariantForm;

  return {
    variants,
    setVariants,
    showVariantForm,
    setShowVariantForm,
    editingVariantId,
    variantForm,
    variantMedia,
    setVariantMedia,
    handleVariantFormChange,
    addOrUpdateVariant,
    editVariant,
    deleteVariant,
    reorderVariants,
    cancelVariantEdit,
  };
}
