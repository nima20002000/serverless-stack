import { useState } from 'react';
import type { Variant, VariantFormData, MediaItem } from '@/types/product-admin';

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
    if (confirm('آیا از حذف این نوع محصول اطمینان دارید؟')) {
      setVariants(variants.filter(v => v.id !== variantId));
    }
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
    cancelVariantEdit,
  };
}
