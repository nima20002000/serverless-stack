// @vitest-environment jsdom
import React, { useState } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VariantManager from '@/components/admin/VariantManager';
import { DEFAULT_SWATCH_CROP } from '@/lib/variant-swatch';
import type { MediaItem, VariantFormData } from '@/types/product-admin';

vi.mock('@/components/admin/MediaManager', () => ({
  default: () => <div data-testid="media-manager" />,
}));

const productMedia: MediaItem[] = [
  {
    id: 'media-blue',
    type: 'IMAGE',
    url: '/media/blue.jpg',
    alt: 'Blue fabric',
    order: 0,
    isDefault: true,
  },
];

function createVariantForm(overrides: Partial<VariantFormData> = {}) {
  return {
    name: 'Blue',
    sku: '',
    color: '',
    size: '',
    material: '',
    priceAdjust: '0',
    stock: '5',
    isActive: true,
    swatchImageUrl: '',
    swatchCrop: DEFAULT_SWATCH_CROP,
    ...overrides,
  };
}

function renderVariantManager(initialForm: VariantFormData) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const onAddOrUpdate = vi.fn();

  function Harness() {
    const [variantForm, setVariantForm] = useState(initialForm);
    const [variantMedia, setVariantMedia] = useState<MediaItem[]>([]);

    return (
      <VariantManager
        variants={[]}
        showVariantForm
        editingVariantId={null}
        variantForm={variantForm}
        variantMedia={variantMedia}
        productMedia={productMedia}
        onVariantFormChange={(event) => {
          const { name, value, type } = event.target;
          const checked = (event.target as HTMLInputElement).checked;
          setVariantForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
          }));
        }}
        onSetVariantForm={setVariantForm}
        onAddOrUpdate={onAddOrUpdate}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCancel={vi.fn()}
        onShowForm={vi.fn()}
        onSetVariantMedia={setVariantMedia}
      />
    );
  }

  act(() => {
    root.render(<Harness />);
  });

  return {
    container,
    onAddOrUpdate,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('VariantManager swatch accessibility', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('exposes selected swatch state and disables saving when the selected image fails to load', () => {
    const rendered = renderVariantManager(
      createVariantForm({
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 25, y: 60, zoom: 2 },
      })
    );

    const selectedButton = rendered.container.querySelector(
      'button[aria-label="Use Blue fabric as swatch"]'
    ) as HTMLButtonElement;
    expect(selectedButton).not.toBeNull();
    expect(selectedButton.getAttribute('aria-pressed')).toBe('true');

    const image = selectedButton.querySelector('img') as HTMLImageElement;
    act(() => {
      image.dispatchEvent(new Event('error'));
    });

    const warning = rendered.container.querySelector(
      '#variant-swatch-image-warning'
    );
    expect(warning?.textContent).toContain(
      'Selected swatch image could not be loaded'
    );
    expect(selectedButton.getAttribute('aria-describedby')).toBe(
      'variant-swatch-image-warning'
    );
    expect(
      rendered.container.querySelector('button[disabled]')?.textContent
    ).toContain('Add');

    rendered.unmount();
  });

  it('keeps saving disabled until the selected swatch image is verified loaded', () => {
    const rendered = renderVariantManager(
      createVariantForm({
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 25, y: 60, zoom: 2 },
      })
    );

    expect(rendered.container.textContent).toContain(
      'Checking selected swatch image before saving.'
    );
    expect(
      rendered.container.querySelector('button[disabled]')?.textContent
    ).toContain('Add');

    const selectedButton = rendered.container.querySelector(
      'button[aria-label="Use Blue fabric as swatch"]'
    ) as HTMLButtonElement;
    const image = selectedButton.querySelector('img') as HTMLImageElement;
    Object.defineProperty(image, 'naturalWidth', {
      configurable: true,
      value: 24,
    });
    Object.defineProperty(image, 'naturalHeight', {
      configurable: true,
      value: 24,
    });

    act(() => {
      image.dispatchEvent(new Event('load'));
    });

    expect(rendered.container.textContent).not.toContain(
      'Checking selected swatch image before saving.'
    );
    expect(
      Array.from(rendered.container.querySelectorAll('button[disabled]')).some(
        (button) => button.textContent?.includes('Add')
      )
    ).toBe(false);

    rendered.unmount();
  });

  it('renders an accessible empty state when no swatch images are available', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <VariantManager
          variants={[]}
          showVariantForm
          editingVariantId={null}
          variantForm={createVariantForm()}
          variantMedia={[]}
          productMedia={[]}
          onVariantFormChange={vi.fn()}
          onSetVariantForm={vi.fn()}
          onAddOrUpdate={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onCancel={vi.fn()}
          onShowForm={vi.fn()}
          onSetVariantMedia={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain(
      'Add product or variant images before choosing a swatch.'
    );
    expect(
      container.querySelector('[aria-label="Variant swatch image choices"]')
    ).toBeNull();

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('treats zero-dimension image loads as unsafe for crop saving', () => {
    const rendered = renderVariantManager(
      createVariantForm({
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 25, y: 60, zoom: 2 },
      })
    );

    const selectedButton = rendered.container.querySelector(
      'button[aria-label="Use Blue fabric as swatch"]'
    ) as HTMLButtonElement;
    const image = selectedButton.querySelector('img') as HTMLImageElement;

    act(() => {
      image.dispatchEvent(new Event('load'));
    });

    expect(rendered.container.textContent).toContain(
      'Selected swatch image could not be loaded'
    );
    expect(
      rendered.container.querySelector('button[disabled]')?.textContent
    ).toContain('Add');

    rendered.unmount();
  });
});
