import type { Page } from '@playwright/test';

/**
 * Mock Zarinpal payment gateway - both redirect AND verification API
 *
 * This mocks:
 * 1. User redirect to Zarinpal payment page -> redirects back with Status=OK
 * 2. Server-side verification API call -> returns successful verification response
 */
export async function mockZarinpalSuccess(page: Page): Promise<void> {
  // Mock the user-facing redirect to Zarinpal payment page (both sandbox and production)
  await page.route('**/*zarinpal.com/pg/StartPay/**', async (route) => {
    const url = new URL(route.request().url());
    // Authority is in the path: /pg/StartPay/{Authority}
    const pathParts = url.pathname.split('/');
    const authority = pathParts[pathParts.length - 1];

    if (!authority) {
      throw new Error(
        'No Authority found in Zarinpal redirect URL. ' +
          `URL: ${route.request().url()}`
      );
    }

    console.log(
      `[E2E Mock] Intercepted Zarinpal redirect, Authority: ${authority}`
    );

    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    await route.fulfill({
      status: 302,
      headers: {
        Location: `${baseURL}/api/transactions/verify?Authority=${authority}&Status=OK`,
      },
    });
  });

  // Mock the server-side Zarinpal verification API call
  // This is called by our verify endpoint to confirm payment with Zarinpal
  await page.route(
    '**/api.zarinpal.com/pg/v4/payment/verify.json',
    async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      console.log(`[E2E Mock] Intercepted Zarinpal verification API call`, {
        authority: postData?.authority,
        amount: postData?.amount,
      });

      // Return successful verification response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            code: 100, // Success code
            ref_id: `E2E-REF-${Date.now()}`, // Mock reference ID
            card_pan: '6219***1234',
            card_hash: 'mock-card-hash',
            fee_type: 'Merchant',
            fee: 0,
          },
          errors: [],
        }),
      });
    }
  );

  // Also mock sandbox API endpoint
  await page.route(
    '**/sandbox.zarinpal.com/pg/v4/payment/verify.json',
    async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      console.log(
        `[E2E Mock] Intercepted Zarinpal SANDBOX verification API call`,
        {
          authority: postData?.authority,
          amount: postData?.amount,
        }
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            code: 100,
            ref_id: `E2E-SANDBOX-REF-${Date.now()}`,
            card_pan: '6219***1234',
            card_hash: 'mock-card-hash',
            fee_type: 'Merchant',
            fee: 0,
          },
          errors: [],
        }),
      });
    }
  );
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
    zarinpal: '**/*zarinpal.com/pg/StartPay/**', // Match both sandbox and production
    digipay: '**/mydigipay.com/**',
    zibal: '**/zibal.ir/**',
  };

  const pattern = patterns[gateway];

  await page.route(pattern, async (route) => {
    const url = new URL(route.request().url());
    let identifier: string | null = null;

    if (gateway === 'zarinpal') {
      // Authority is in the path: /pg/StartPay/{Authority}
      const pathParts = url.pathname.split('/');
      identifier = pathParts[pathParts.length - 1];
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
