import { expect, test } from '@playwright/test';

test.describe('client observability reporting', () => {
  test('sends a controlled fallback warning report from the browser', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'sendBeacon', {
        configurable: true,
        value: undefined,
      });
    });

    const reports: unknown[] = [];
    await page.route('**/api/fallback-warnings', async (route) => {
      reports.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/');
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            typeof (
              window as typeof window & {
                __reportFallbackWarning?: unknown;
              }
            ).__reportFallbackWarning
        )
      )
      .toBe('function');

    await page.evaluate(() => {
      (
        window as typeof window & {
          __reportFallbackWarning?: (report: {
            name: string;
            primary: string;
            fallback: string;
            reason?: string;
            context?: Record<string, unknown>;
          }) => void;
        }
      ).__reportFallbackWarning?.({
        name: 'e2e-controlled-fallback',
        primary: 'primary browser path',
        fallback: 'reported fallback path',
        reason: 'controlled e2e trigger',
        context: { token: 'must be redacted by the API' },
      });
    });

    await expect.poll(() => reports.length).toBe(1);
    expect(reports[0]).toMatchObject({
      name: 'e2e-controlled-fallback',
      primary: 'primary browser path',
      fallback: 'reported fallback path',
      reason: 'controlled e2e trigger',
      path: expect.any(String),
    });
  });
});
