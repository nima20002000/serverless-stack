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
