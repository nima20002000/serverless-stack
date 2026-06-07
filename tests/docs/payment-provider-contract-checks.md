# Payment Provider Contract Checks

Date: 2026-06-06
Scope: `NIM-159`

Normal local and CI E2E uses mocked payments. Do not report those runs as real
Stripe or PayPal provider E2E. Real provider checks are sandbox-only and require
a disposable Supabase project plus sandbox credentials that are safe to mutate.

## Automated Local Coverage

These tests prove app-side contracts without contacting real providers:

```bash
npm --prefix tests run test:unit -- unit/api/transactions
```

Covered behavior includes unsupported provider rejection, checkout status
polling, Stripe/PayPal webhook signature/header handling, amount and currency
mismatch rejection, provider metadata persistence, capture handling, and
idempotent repeated completion callbacks.

When local or disposable Supabase is running, also run:

```bash
npm --prefix tests run test:integration -- payment-verification.test.ts
```

## Sandbox-Only Checklist

Run these only against dedicated sandbox accounts and a disposable database:

1. Stripe checkout session completes with the expected transaction id in
   metadata, matching amount/currency, saved checkout session id, payment intent
   id, and a single completed finalization.
2. Stripe async failure or expired checkout leaves the transaction failed or
   pending according to the webhook event and does not finalize the order.
3. PayPal order capture verifies the sandbox order amount/currency before
   completion, persists order/capture references, and finalizes once.
4. PayPal webhook validation rejects missing or invalid transmission headers in
   sandbox mode.
5. Replaying the same Stripe or PayPal success event remains idempotent and does
   not double-send order finalization side effects.

Do not run this checklist against production credentials, shared databases, or
shared Redis. Record the provider dashboard event ids and the transaction codes
used for cleanup when a sandbox run is performed.
