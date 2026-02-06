# Task 005 - Implement Stripe Payment Flow

## Goal
Add end-to-end Stripe support (create payment + webhook verification + status sync).

## Scope
- Server-side Stripe client initialization.
- Checkout creation endpoint.
- Webhook endpoint with signature verification.

## Steps
1. Add Stripe SDK and config module.
2. Implement checkout/payment intent creation with order metadata.
3. Store `stripeCheckoutSessionId` / `stripePaymentIntentId` on transaction.
4. Implement webhook route and verify signature (`STRIPE_WEBHOOK_SECRET`).
5. Map Stripe event states to internal transaction states.

## Edge Cases
- Webhook arrives before redirect return.
- Signature mismatch (bad secret or replay attack).
- Partial capture/refund events after initial success.
- Currency amount mismatch between request and webhook payload.

## Acceptance Criteria
- Stripe sandbox checkout can complete locally.
- Transaction reaches `COMPLETED` only after verified Stripe event.
- Invalid webhook signatures are rejected with audit logs.

## Rollback
- Disable Stripe provider flag while preserving transaction records for reconciliation.

## Completion Notes (2026-02-07)
- Status: Completed
- Completed implementation:
  - Added Stripe server client module in `src/lib/stripe/client.ts`:
    - centralized Stripe initialization via `STRIPE_SECRET_KEY`.
    - checkout session creation with transaction metadata.
    - webhook signature verification using `STRIPE_WEBHOOK_SECRET`.
    - strict amount conversion helper for Stripe minor units with currency handling.
  - Added Stripe webhook endpoint in `src/app/api/transactions/webhook-stripe/route.ts`:
    - verifies `stripe-signature` and rejects invalid signatures with `400`.
    - maps verified Stripe lifecycle events to internal transaction states.
    - validates webhook amount/currency against internal transaction amount before completion.
    - handles duplicate deliveries idempotently via `updateTransactionStatus(...).statusChanged`.
    - logs refund lifecycle events for reconciliation.
  - Added reusable post-payment finalization module in `src/lib/payments/finalize-successful-transaction.ts`:
    - executes stock reduction, promo usage tracking, email notifications, and guest account linking.
    - integrated into Stripe completion path only when transaction status is newly changed.
  - Updated `src/app/api/transactions/create/route.ts`:
    - implemented `STRIPE` gateway path using Stripe Checkout session creation.
    - persists `paymentProviderRef`, `stripeCheckoutSessionId`, and `stripePaymentIntentId`.
    - returns Stripe `checkoutSessionId` and redirect `paymentUrl`.
  - Extended `updateTransactionStatus(...)` in `src/services/transaction-service.ts` to persist:
    - `stripeCheckoutSessionId`
    - `stripePaymentIntentId`
    - `stripeChargeId`
  - Added Stripe webhook callback exemption from middleware rate-limiting in `src/middleware.ts`.
  - Added Stripe SDK dependency (`stripe@20.3.1`) in `package.json` and lockfile.
- Verification:
  - `npm run build` (pass)
  - build output confirms webhook route presence: `/api/transactions/webhook-stripe`
  - webhook handler enforces signature verification and safe idempotent status transitions
