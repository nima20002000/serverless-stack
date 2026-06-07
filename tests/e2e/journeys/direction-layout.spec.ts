import { expect, test } from '@playwright/test';

const configuredDirection =
  process.env.E2E_SITE_DIRECTION || process.env.NEXT_PUBLIC_SITE_DIRECTION;
const expectedDirection = configuredDirection === 'rtl' ? 'rtl' : 'ltr';

test.describe('direction-aware layout', () => {
  test('renders configured direction and opens the cart drawer from the logical edge', async ({
    page,
  }) => {
    await page.goto('/en');

    await expect(page.locator('html')).toHaveAttribute(
      'dir',
      expectedDirection
    );

    await page.getByRole('button', { name: 'Cart', exact: true }).click();
    const panel = page.getByTestId('cart-drawer-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-direction', expectedDirection);

    const box = await panel.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (box && viewport) {
      if (expectedDirection === 'rtl') {
        expect(box.x).toBeLessThan(viewport.width / 3);
      } else {
        expect(box.x + box.width).toBeGreaterThan(viewport.width * 0.9);
      }
    }
  });
});
