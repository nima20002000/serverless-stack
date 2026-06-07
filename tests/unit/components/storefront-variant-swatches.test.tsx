// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductCard from '@/components/products/ProductCard';
import ProductDetail from '@/components/products/ProductDetail';

const mocks = vi.hoisted(() => ({
  addItem: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  direction: 'ltr',
}));

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src?: string;
    alt?: string;
    className?: string;
  }) => <img src={src || ''} alt={alt || ''} className={className} />,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    back: mocks.back,
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/components/providers/I18nProvider', () => ({
  useTranslations: () => (key: string) =>
    ({
      'products.addToCart': 'Add to Cart',
      'products.adding': 'Adding...',
      'products.outOfStock': 'Out of stock',
      'products.backToProducts': 'Back to products',
    })[key] || key,
  useTextDirection: () => mocks.direction,
}));

vi.mock('@/store/cart-store', () => ({
  useCartStore: <T,>(
    selector: (state: { addItem: typeof mocks.addItem }) => T
  ) => selector({ addItem: mocks.addItem }),
}));

vi.mock('@/store/toast-store', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/wishlist/WishlistButton', () => ({
  WishlistButton: () => <button type="button">Wishlist</button>,
}));

vi.mock('@/components/products/ProductGallery', () => ({
  default: ({
    productName,
    selectedVariant,
  }: {
    productName: string;
    selectedVariant?: { name?: string; media?: Array<{ url: string }> } | null;
  }) => (
    <figure aria-label={`${productName} gallery`}>
      <span>{selectedVariant?.name || 'Product media'}</span>
      <span>{selectedVariant?.media?.[0]?.url || 'product-image'}</span>
    </figure>
  ),
}));

function renderElement(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('storefront variant swatches', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED = 'false';
    mocks.addItem.mockClear();
    mocks.push.mockClear();
    mocks.back.mockClear();
    mocks.direction = 'ltr';
    vi.clearAllMocks();
  });

  it('renders card image swatches, disables out-of-stock swatches, and falls back to the product image for swatch-only variants', () => {
    const rendered = renderElement(
      <ProductCard
        product={{
          id: 'card-swatch-product',
          name: 'Card swatch product',
          description: 'Card swatch description',
          price: 100,
          stock: 9,
          images: ['/media/product-default.jpg'],
          isActive: true,
          hasVariants: true,
          variants: [
            {
              id: 'image-only',
              name: 'Image only swatch',
              priceAdjust: 0,
              stock: 4,
              isActive: true,
              swatchImageUrl: '/media/swatch-only.jpg',
              swatchCrop: { x: 18, y: 72, zoom: 2 },
            },
            {
              id: 'media-backed',
              name: 'Media backed swatch',
              color: '#2563eb',
              priceAdjust: 5,
              stock: 3,
              isActive: true,
              swatchImageUrl: '/media/media-backed-swatch.jpg',
              swatchCrop: { x: 50, y: 50, zoom: 1 },
              media: [
                {
                  id: 'variant-media',
                  type: 'IMAGE',
                  url: '/media/variant-blue.jpg',
                  alt: 'Blue variant',
                  order: 0,
                },
              ],
            },
            {
              id: 'sold-out',
              name: 'Sold out swatch',
              color: '#111827',
              priceAdjust: 0,
              stock: 0,
              isActive: true,
              swatchImageUrl: '/media/sold-out.jpg',
            },
            {
              id: 'size-only',
              name: 'Size Medium',
              size: 'M',
              priceAdjust: 0,
              stock: 6,
              isActive: true,
            },
          ],
        }}
      />
    );

    const image = rendered.container.querySelector('img') as HTMLImageElement;
    expect(image.src).toContain('/media/variant-blue.jpg');

    const imageOnlySwatch = rendered.container.querySelector(
      'button[aria-label="Image only swatch"]'
    ) as HTMLButtonElement;
    expect(imageOnlySwatch).not.toBeNull();
    expect(imageOnlySwatch.getAttribute('aria-pressed')).toBe('false');
    expect(imageOnlySwatch.className).toContain('focus-visible:ring-blue-500');
    const imageOnlySwatchFill = imageOnlySwatch.querySelector(
      'span'
    ) as HTMLSpanElement;
    expect(imageOnlySwatchFill.style.backgroundImage).toContain(
      '/media/swatch-only.jpg'
    );
    expect(imageOnlySwatchFill.style.backgroundPosition).toBe('18% 72%');

    const soldOutSwatch = rendered.container.querySelector(
      'button[aria-label="Sold out swatch (Out of stock)"]'
    ) as HTMLButtonElement;
    expect(soldOutSwatch.disabled).toBe(true);

    act(() => {
      imageOnlySwatch.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(imageOnlySwatch.getAttribute('aria-pressed')).toBe('true');
    expect(image.src).toContain('/media/product-default.jpg');
    expect(rendered.container.textContent).toContain('M');

    rendered.unmount();
  });

  it('uses selected variant media for product-detail cart items and product media for swatch-only variants', () => {
    const product = {
      id: 'detail-swatch-product',
      name: 'Detail swatch product',
      description: 'Detail swatch description',
      price: 100,
      stock: 9,
      images: ['/media/legacy-product.jpg'],
      isActive: true,
      hasVariants: true,
      media: [
        {
          id: 'product-video',
          type: 'VIDEO' as const,
          url: '/media/product-video.mp4',
          alt: 'Product video',
          order: 0,
        },
        {
          id: 'product-media',
          type: 'IMAGE' as const,
          url: '/media/product-default.jpg',
          alt: 'Product default',
          order: 1,
        },
      ],
      variants: [
        {
          id: 'swatch-only',
          name: 'Swatch only',
          priceAdjust: 0,
          stock: 4,
          isActive: true,
          swatchImageUrl: '/media/stale-swatch.jpg',
          swatchCrop: { x: 30, y: 70, zoom: 2 },
        },
        {
          id: 'variant-media',
          name: 'Variant media',
          priceAdjust: 5,
          stock: 3,
          isActive: true,
          swatchImageUrl: '/media/variant-swatch.jpg',
          swatchCrop: { x: 50, y: 50, zoom: 1 },
          media: [
            {
              id: 'variant-video',
              type: 'VIDEO' as const,
              url: '/media/variant-video.mp4',
              alt: 'Variant video',
              order: 0,
            },
            {
              id: 'variant-media-image',
              type: 'IMAGE' as const,
              url: '/media/variant-detail.jpg',
              alt: 'Variant detail',
              order: 1,
            },
          ],
        },
      ],
    };

    const mediaBackedRender = renderElement(
      <ProductDetail product={product} />
    );

    const variantMedia = mediaBackedRender.container.querySelector(
      'button[aria-label="Variant media"]'
    ) as HTMLButtonElement;
    const mediaBackedAddButton = Array.from(
      mediaBackedRender.container.querySelectorAll('button')
    ).find((button) => button.textContent === 'Add to Cart') as
      | HTMLButtonElement
      | undefined;
    expect(mediaBackedAddButton).toBeDefined();

    act(() => {
      mediaBackedAddButton!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(variantMedia.getAttribute('aria-pressed')).toBe('true');
    expect(mocks.addItem).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variantId: 'variant-media',
        image: '/media/variant-detail.jpg',
      }),
      1
    );
    mediaBackedRender.unmount();
    mocks.addItem.mockClear();

    const swatchOnlyRender = renderElement(<ProductDetail product={product} />);
    const swatchOnly = swatchOnlyRender.container.querySelector(
      'button[aria-label="Swatch only"]'
    ) as HTMLButtonElement;
    const swatchOnlyAddButton = Array.from(
      swatchOnlyRender.container.querySelectorAll('button')
    ).find((button) => button.textContent === 'Add to Cart') as
      | HTMLButtonElement
      | undefined;
    expect(swatchOnlyAddButton).toBeDefined();

    act(() => {
      swatchOnly.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });
    act(() => {
      swatchOnlyAddButton!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(mocks.addItem).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variantId: 'swatch-only',
        image: '/media/product-default.jpg',
      }),
      1
    );

    swatchOnlyRender.unmount();
  });
});
