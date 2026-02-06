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
