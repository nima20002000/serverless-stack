import { describe, expect, it } from 'vitest';
import {
  createProductFormSnapshot,
  isProductFormDirty,
  type ProductFormSnapshotInput,
} from '@/lib/admin/product-form-dirty';
import { DEFAULT_SWATCH_CROP } from '@/lib/variant-swatch';

function baseInput(
  overrides: Partial<ProductFormSnapshotInput> = {}
): ProductFormSnapshotInput {
  return {
    formData: {
      name: 'Everyday tote',
      description: 'A durable canvas tote.',
      price: '42',
      discountPercent: '',
      stock: '10',
      hasVariants: false,
      isFeatured: false,
      isActive: true,
      categoryId: 'bags',
    },
    selectedTags: [
      { id: 'tag-new', name: 'New', slug: 'new' },
      { id: 'tag-bag', name: 'Bag', slug: 'bag' },
    ],
    productMedia: [
      {
        id: 'media-1',
        type: 'IMAGE',
        url: '/products/tote.jpg',
        alt: 'Tote',
        order: 0,
        isDefault: true,
      },
    ],
    variants: [
      {
        id: 'variant-blue',
        name: 'Blue',
        sku: 'TOTE-BLUE',
        color: '#0000ff',
        size: '',
        material: 'Canvas',
        priceAdjust: '0',
        stock: '5',
        order: 0,
        isActive: true,
        media: [],
      },
      {
        id: 'variant-red',
        name: 'Red',
        sku: 'TOTE-RED',
        color: '#ff0000',
        size: '',
        material: 'Canvas',
        priceAdjust: '2',
        stock: '3',
        order: 1,
        isActive: true,
        media: [
          {
            id: 'media-red',
            type: 'IMAGE',
            url: '/products/tote-red.jpg',
            alt: 'Red tote',
            order: 0,
            isDefault: true,
            variantId: 'variant-red',
          },
        ],
      },
    ],
    variantDraft: {
      showVariantForm: false,
      editingVariantId: null,
      form: {
        name: '',
        sku: '',
        color: '',
        size: '',
        material: '',
        priceAdjust: '0',
        stock: '0',
        isActive: true,
        swatchImageUrl: '',
        swatchCrop: DEFAULT_SWATCH_CROP,
      },
      media: [],
    },
    ...overrides,
  };
}

function snapshot(input: ProductFormSnapshotInput) {
  return createProductFormSnapshot(input);
}

describe('product form dirty snapshots', () => {
  it('does not mark equivalent state dirty when tag order changes', () => {
    const initial = snapshot(baseInput());
    const current = snapshot(
      baseInput({
        selectedTags: [
          { id: 'tag-bag', name: 'Bag', slug: 'bag' },
          { id: 'tag-new', name: 'New', slug: 'new' },
        ],
      })
    );

    expect(isProductFormDirty(initial, current)).toBe(false);
  });

  it('detects meaningful base field, tag, and media changes', () => {
    const initial = snapshot(baseInput());

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            formData: { ...baseInput().formData, name: 'Weekend tote' },
          })
        )
      )
    ).toBe(true);

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            selectedTags: [{ id: 'tag-new', name: 'New', slug: 'new' }],
          })
        )
      )
    ).toBe(true);

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            productMedia: [
              ...baseInput().productMedia,
              {
                id: 'new-media',
                type: 'IMAGE',
                url: '/products/extra.jpg',
                alt: '',
                order: 1,
                isDefault: false,
              },
            ],
          })
        )
      )
    ).toBe(true);
  });

  it('detects variant reorder, variant field, and variant media changes', () => {
    const input = baseInput();
    const initial = snapshot(input);

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            variants: input.variants.map((variant) =>
              variant.id === 'variant-red'
                ? { ...variant, order: 0 }
                : { ...variant, order: 1 }
            ),
          })
        )
      )
    ).toBe(true);

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            variants: input.variants.map((variant) =>
              variant.id === 'variant-blue'
                ? { ...variant, stock: '7' }
                : variant
            ),
          })
        )
      )
    ).toBe(true);

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            variants: input.variants.map((variant) =>
              variant.id === 'variant-red' ? { ...variant, media: [] } : variant
            ),
          })
        )
      )
    ).toBe(true);
  });

  it('detects variant swatch image and crop changes', () => {
    const input = baseInput();
    const initial = snapshot(input);

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            variants: input.variants.map((variant) =>
              variant.id === 'variant-blue'
                ? {
                    ...variant,
                    swatchImageUrl: '/products/tote-blue.jpg',
                    swatchCrop: { x: 20, y: 70, zoom: 2 },
                  }
                : variant
            ),
          })
        )
      )
    ).toBe(true);
  });

  it('ignores an empty add-variant form but detects filled draft values', () => {
    const initial = snapshot(baseInput());

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            variantDraft: {
              ...baseInput().variantDraft,
              showVariantForm: true,
            },
          })
        )
      )
    ).toBe(false);

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            variantDraft: {
              ...baseInput().variantDraft,
              showVariantForm: true,
              form: {
                ...baseInput().variantDraft.form,
                name: 'Green',
              },
            },
          })
        )
      )
    ).toBe(true);
  });

  it('detects changed draft edits for an existing variant only when content differs', () => {
    const initial = snapshot(baseInput());
    const redVariant = baseInput().variants[1];

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            variantDraft: {
              showVariantForm: true,
              editingVariantId: redVariant.id,
              form: {
                name: redVariant.name,
                sku: redVariant.sku || '',
                color: redVariant.color || '',
                size: redVariant.size || '',
                material: redVariant.material || '',
                priceAdjust: redVariant.priceAdjust,
                stock: redVariant.stock,
                isActive: redVariant.isActive,
                swatchImageUrl: redVariant.swatchImageUrl || '',
                swatchCrop: redVariant.swatchCrop || DEFAULT_SWATCH_CROP,
              },
              media: redVariant.media || [],
            },
          })
        )
      )
    ).toBe(false);

    expect(
      isProductFormDirty(
        initial,
        snapshot(
          baseInput({
            variantDraft: {
              showVariantForm: true,
              editingVariantId: redVariant.id,
              form: {
                name: redVariant.name,
                sku: redVariant.sku || '',
                color: redVariant.color || '',
                size: redVariant.size || '',
                material: redVariant.material || '',
                priceAdjust: redVariant.priceAdjust,
                stock: '9',
                isActive: redVariant.isActive,
                swatchImageUrl: redVariant.swatchImageUrl || '',
                swatchCrop: redVariant.swatchCrop || DEFAULT_SWATCH_CROP,
              },
              media: redVariant.media || [],
            },
          })
        )
      )
    ).toBe(true);
  });
});
