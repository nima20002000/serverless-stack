import type { Page } from '@playwright/test';

/**
 * Mock Zarinpal payment gateway redirect
 * Intercepts redirect to Zarinpal and simulates success callback
 */
export async function mockZarinpalSuccess(page: Page): Promise<void> {
  await page.route('**/zarinpal.com/**', async (route) => {
    const url = new URL(route.request().url());
    const authority = url.searchParams.get('Authority');

    if (!authority) {
      throw new Error(
        'No Authority parameter found in Zarinpal redirect URL. ' +
          `URL: ${route.request().url()}`
      );
    }

    console.log(`Intercepted Zarinpal redirect, Authority: ${authority}`);

    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    await route.fulfill({
      status: 302,
      headers: {
        Location: `${baseURL}/api/transactions/verify?Authority=${authority}&Status=OK`,
      },
    });
  });
}

/**
 * Mock Digipay payment gateway redirect
 */
export async function mockDigipaySuccess(page: Page): Promise<void> {
  await page.route('**/mydigipay.com/**', async (route) => {
    const url = new URL(route.request().url());
    const trackId = url.searchParams.get('trackId');

    if (!trackId) {
      throw new Error(
        'No trackId parameter found in Digipay redirect URL. ' +
          `URL: ${route.request().url()}`
      );
    }

    console.log(`Intercepted Digipay redirect, trackId: ${trackId}`);

    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    await route.fulfill({
      status: 302,
      headers: {
        Location: `${baseURL}/api/transactions/verify-digipay?trackId=${trackId}`,
      },
    });
  });
}

/**
 * Mock Zibal payment gateway redirect
 */
export async function mockZibalSuccess(page: Page): Promise<void> {
  await page.route('**/zibal.ir/**', async (route) => {
    const url = new URL(route.request().url());
    // Zibal uses trackId in the URL path: /payment/start/{trackId}
    const pathMatch = url.pathname.match(/\/payment\/start\/(\d+)/);
    const trackId = pathMatch ? pathMatch[1] : url.searchParams.get('trackId');

    if (!trackId) {
      throw new Error(
        'No trackId found in Zibal redirect URL. ' +
          `URL: ${route.request().url()}`
      );
    }

    console.log(`Intercepted Zibal redirect, trackId: ${trackId}`);

    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    await route.fulfill({
      status: 302,
      headers: {
        Location: `${baseURL}/api/transactions/verify-zibal?trackId=${trackId}&success=1`,
      },
    });
  });
}

/**
 * Mock payment gateway failure
 * Simulates a failed payment for any supported gateway
 */
export async function mockPaymentFailure(
  page: Page,
  gateway: 'zarinpal' | 'digipay' | 'zibal'
): Promise<void> {
  const patterns: Record<string, string> = {
    zarinpal: '**/zarinpal.com/**',
    digipay: '**/mydigipay.com/**',
    zibal: '**/zibal.ir/**',
  };

  const pattern = patterns[gateway];

  await page.route(pattern, async (route) => {
    const url = new URL(route.request().url());
    let identifier: string | null = null;

    if (gateway === 'zarinpal') {
      identifier = url.searchParams.get('Authority');
    } else if (gateway === 'digipay') {
      identifier = url.searchParams.get('trackId');
    } else if (gateway === 'zibal') {
      const pathMatch = url.pathname.match(/\/payment\/start\/(\d+)/);
      identifier = pathMatch ? pathMatch[1] : url.searchParams.get('trackId');
    }

    console.log(`Simulating ${gateway} payment failure`);

    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    let endpoint: string;

    switch (gateway) {
      case 'zarinpal':
        endpoint = `/api/transactions/verify?Authority=${identifier}&Status=NOK`;
        break;
      case 'digipay':
        endpoint = `/api/transactions/verify-digipay?trackId=${identifier}&status=failed`;
        break;
      case 'zibal':
        endpoint = `/api/transactions/verify-zibal?trackId=${identifier}&success=0`;
        break;
    }

    await route.fulfill({
      status: 302,
      headers: {
        Location: `${baseURL}${endpoint}`,
      },
    });
  });
}

/**
 * Mock all payment gateways for success
 * Useful when the test doesn't care which gateway is used
 */
export async function mockAllPaymentGatewaysSuccess(page: Page): Promise<void> {
  await mockZarinpalSuccess(page);
  await mockDigipaySuccess(page);
  await mockZibalSuccess(page);
}

/**
 * Clear all payment gateway mocks
 */
export async function clearPaymentMocks(page: Page): Promise<void> {
  await page.unrouteAll();
}
