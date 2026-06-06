# Currency Contract

Date: 2026-06-06
Scope: `NIM-147`

The storefront stores catalog prices, discounts, gateway amounts, and
transaction amounts as numeric major-unit values in the configured store
currency. Example: `19.99` means 19.99 USD when
`NEXT_PUBLIC_SITE_CURRENCY=USD`, and `1999` means 1999 JPY when
`NEXT_PUBLIC_SITE_CURRENCY=JPY`.

The current task does not introduce exchange rates or per-product currencies.
Changing store currency is an operator configuration change; existing persisted
prices are not automatically converted.

Configuration:

- `NEXT_PUBLIC_SITE_LOCALE`: locale used for number and date formatting.
- `NEXT_PUBLIC_SITE_CURRENCY`: ISO 4217 store currency code.
- `NEXT_PUBLIC_SITE_CURRENCY_DISPLAY`: `symbol`, `narrowSymbol`, `code`, or
  `name`.
- `STRIPE_CURRENCY`: optional provider override, defaults to site currency.
- `PAYPAL_CURRENCY`: optional provider override, defaults to site currency.

Runtime contract:

- UI display calls shared formatting helpers backed by `Intl.NumberFormat`.
- Provider requests convert major-unit amounts at the payment boundary.
- Stripe receives integer minor units using the configured currency precision.
- PayPal receives a string amount with the configured currency precision.
- Webhook/capture reconciliation compares both amount and currency.

Verification:

```bash
npm --prefix tests run test:unit -- unit/utils/format.test.ts unit/lib/payment-currency.test.ts unit/api/transactions/create-status.test.ts
npm --prefix tests run test:unit -- unit/components/currency-display-surfaces.test.tsx unit/lib/email-client.test.ts unit/utils/format.test.ts unit/lib/payment-currency.test.ts
E2E_SITE_CURRENCY=JPY E2E_SITE_LOCALE=ja-JP E2E_SITE_CURRENCY_DISPLAY=code npm --prefix tests run test:e2e:chromium -- journeys/currency-display.spec.ts
```
