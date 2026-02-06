# Task 006 - Implement PayPal Payment Flow

## Goal
Add end-to-end PayPal support (order create/capture + webhook lifecycle handling).

## Scope
- PayPal API client setup.
- Create/capture endpoints.
- Webhook validation and transaction synchronization.

## Steps
1. Add PayPal client module with environment-aware endpoints.
2. Implement create order and capture order APIs.
3. Persist `paypalOrderId` and `paypalCaptureId`.
4. Add webhook endpoint and event mapping.
5. Add strict validation of amount/currency/custom metadata.

## Edge Cases
- Buyer abandons flow after order creation.
- Capture succeeds but webhook delayed.
- Duplicate capture attempts.
- Webhook references unknown order ID.

## Acceptance Criteria
- PayPal sandbox payment can be completed locally.
- Captured payments transition transaction to `COMPLETED` exactly once.
- Unknown/invalid webhook payloads are ignored safely.

## Rollback
- Disable PayPal selection in checkout while keeping DB schema unchanged.

## Completion Notes (2026-02-07)
- Status: Completed
- Completed implementation:
  - Added PayPal API client module in `src/lib/paypal/client.ts`:
    - environment-aware API routing via `PAYPAL_ENV` (`sandbox`/`live`).
    - OAuth token acquisition and caching using `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`.
    - order create (`/v2/checkout/orders`) and capture (`/v2/checkout/orders/{id}/capture`) support.
    - webhook signature verification via PayPal verify-signature API using `PAYPAL_WEBHOOK_ID`.
    - strict amount parsing/formatting helpers for PayPal currency validation.
  - Extended transaction creation in `src/app/api/transactions/create/route.ts`:
    - implemented `PAYPAL` gateway branch.
    - creates PayPal order and returns approval URL.
    - persists `paymentProviderRef` + `paypalOrderId` + provider metadata.
  - Added PayPal capture endpoint in `src/app/api/transactions/paypal/capture/route.ts`:
    - supports browser return flow (`GET`) and API capture (`POST`).
    - validates order/transaction mapping, amount/currency, and metadata (`custom_id`/`invoice_id`).
    - updates transaction to `COMPLETED` idempotently and triggers one-time fulfillment finalization.
  - Added PayPal webhook endpoint in `src/app/api/transactions/webhook-paypal/route.ts`:
    - validates webhook signature before processing.
    - maps completion and failure lifecycle events to transaction status updates.
    - validates amount/currency/custom metadata on completion events.
    - ignores unknown/invalid payloads safely and handles duplicate deliveries idempotently.
  - Updated `src/services/transaction-service.ts`:
    - `updateTransactionStatus(...)` now persists `paypalCaptureId` column (not metadata-only).
  - Updated `src/middleware.ts`:
    - exempted PayPal callback endpoints from rate limiting:
      - `/api/transactions/paypal/capture`
      - `/api/transactions/webhook-paypal`
- Verification:
  - `npm run build` (pass)
  - build output confirms both new endpoints:
    - `/api/transactions/paypal/capture`
    - `/api/transactions/webhook-paypal`
