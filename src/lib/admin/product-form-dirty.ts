import type {
  MediaItem,
  ProductFormData,
  Tag,
  Variant,
  VariantFormData,
} from '@/types/product-admin';

export type VariantDraftState = {
  showVariantForm: boolean;
  editingVariantId: string | null;
  form: VariantFormData;
  media: MediaItem[];
};

export type ProductFormSnapshotInput = {
  formData: ProductFormData;
  selectedTags: Tag[];
  productMedia: MediaItem[];
  variants: Variant[];
  variantDraft: VariantDraftState;
};

export type ProductFormSnapshot = {
  formData: ProductFormData;
  selectedTagIds: string[];
  productMedia: NormalizedMediaItem[];
  variants: NormalizedVariant[];
  variantDraft: NormalizedVariantDraft | null;
};

type NormalizedMediaItem = {
  id: string;
  type: MediaItem['type'];
  url: string;
  alt: string;
  order: number;
  isDefault: boolean;
  variantId: string | null;
};

type NormalizedVariant = {
  id: string;
  name: string;
  sku: string;
  color: string;
  size: string;
  material: string;
  priceAdjust: string;
  stock: string;
  order: number;
  isActive: boolean;
  media: NormalizedMediaItem[];
};

type NormalizedVariantDraft = {
  editingVariantId: string | null;
  form: VariantFormData;
  media: NormalizedMediaItem[];
};

const defaultVariantForm: VariantFormData = {
  name: '',
  sku: '',
  color: '',
  size: '',
  material: '',
  priceAdjust: '0',
  stock: '0',
  isActive: true,
};

function normalizeText(value: string | null | undefined): string {
  return value ?? '';
}

function normalizeFormData(formData: ProductFormData): ProductFormData {
  return {
    name: formData.name,
    description: formData.description,
    price: formData.price,
    discountPercent: formData.discountPercent,
    stock: formData.stock,
    hasVariants: formData.hasVariants,
    isFeatured: formData.isFeatured,
    isActive: formData.isActive,
    categoryId: formData.categoryId ?? null,
  };
}

function normalizeVariantForm(form: VariantFormData): VariantFormData {
  return {
    name: form.name,
    sku: form.sku,
    color: form.color,
    size: form.size,
    material: form.material,
    priceAdjust: form.priceAdjust,
    stock: form.stock,
    isActive: form.isActive,
  };
}

function normalizeMediaItem(media: MediaItem): NormalizedMediaItem {
  return {
    id: media.id,
    type: media.type,
    url: media.url,
    alt: normalizeText(media.alt),
    order: media.order,
    isDefault: !!media.isDefault,
    variantId: media.variantId ?? null,
  };
}

function normalizeMedia(media: MediaItem[]): NormalizedMediaItem[] {
  return media.map(normalizeMediaItem).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
}

function normalizeVariant(variant: Variant): NormalizedVariant {
  return {
    id: variant.id,
    name: variant.name,
    sku: normalizeText(variant.sku),
    color: normalizeText(variant.color),
    size: normalizeText(variant.size),
    material: normalizeText(variant.material),
    priceAdjust: variant.priceAdjust,
    stock: variant.stock,
    order: variant.order,
    isActive: variant.isActive,
    media: normalizeMedia(variant.media ?? []),
  };
}

function findEditedVariant(
  editingVariantId: string | null,
  variants: NormalizedVariant[]
): NormalizedVariant | null {
  if (!editingVariantId) return null;
  return variants.find((variant) => variant.id === editingVariantId) ?? null;
}

function isVariantDraftMeaningful(
  draft: VariantDraftState,
  variants: NormalizedVariant[]
): boolean {
  if (!draft.showVariantForm) return false;

  const normalizedDraftForm = normalizeVariantForm(draft.form);
  const normalizedDraftMedia = normalizeMedia(draft.media);
  const editedVariant = findEditedVariant(draft.editingVariantId, variants);

  if (editedVariant) {
    return (
      normalizedDraftForm.name !== editedVariant.name ||
      normalizedDraftForm.sku !== editedVariant.sku ||
      normalizedDraftForm.color !== editedVariant.color ||
      normalizedDraftForm.size !== editedVariant.size ||
      normalizedDraftForm.material !== editedVariant.material ||
      normalizedDraftForm.priceAdjust !== editedVariant.priceAdjust ||
      normalizedDraftForm.stock !== editedVariant.stock ||
      normalizedDraftForm.isActive !== editedVariant.isActive ||
      stableStringify(normalizedDraftMedia) !==
        stableStringify(editedVariant.media)
    );
  }

  return (
    stableStringify(normalizedDraftForm) !==
      stableStringify(defaultVariantForm) || normalizedDraftMedia.length > 0
  );
}

function normalizeVariantDraft(
  draft: VariantDraftState,
  variants: NormalizedVariant[]
): NormalizedVariantDraft | null {
  if (!isVariantDraftMeaningful(draft, variants)) return null;

  return {
    editingVariantId: draft.editingVariantId,
    form: normalizeVariantForm(draft.form),
    media: normalizeMedia(draft.media),
  };
}

export function createProductFormSnapshot(
  input: ProductFormSnapshotInput
): ProductFormSnapshot {
  const variants = input.variants.map(normalizeVariant).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });

  return {
    formData: normalizeFormData(input.formData),
    selectedTagIds: input.selectedTags
      .map((tag) => tag.id)
      .sort((a, b) => a.localeCompare(b)),
    productMedia: normalizeMedia(input.productMedia),
    variants,
    variantDraft: normalizeVariantDraft(input.variantDraft, variants),
  };
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

export function isProductFormDirty(
  initialSnapshot: ProductFormSnapshot | null,
  currentSnapshot: ProductFormSnapshot
): boolean {
  if (!initialSnapshot) return false;
  return stableStringify(initialSnapshot) !== stableStringify(currentSnapshot);
}
