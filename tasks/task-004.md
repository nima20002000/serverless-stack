# Task 004 - Refactor Transaction Service to New Schema

## Goal
Make transaction creation and lookup compatible with new payment fields and enum values.

## Scope
- Remove writes/reads of legacy gateway columns.
- Introduce provider-neutral transaction references.
- Ensure status transitions remain idempotent.

## Steps
1. Update transaction create/update methods to use `stripe*` / `paypal*` / `paymentProviderRef`.
2. Remove authority/ticket/trackId lookup methods tied to legacy providers.
3. Enforce allowed methods `STRIPE|PAYPAL` at API boundary.
4. Add idempotency guards for repeated webhook callbacks.

## Edge Cases
- Duplicate webhook delivery updates the same transaction.
- Provider callback arrives before transaction row is persisted.
- Payment succeeds but order finalization fails midway.

## Acceptance Criteria
- No service method references legacy payment columns.
- Transaction lookup and update logic works for both Stripe and PayPal.
- Repeated callback processing is safe and no double-finalization occurs.

## Rollback
- Re-enable previous transaction service implementation behind feature branch if provider adapters are not yet stable.

## Completion Notes (2026-02-07)
- Status: Completed
- Completed implementation:
  - Refactored transaction lookup to provider-neutral API:
    - added `getTransactionByProviderRef(...)` in `src/services/transaction-service.ts`
    - removed legacy service lookups tied to provider naming (`authority`/`ticket`/`trackId` methods).
  - Removed legacy payment-column writes from verify callbacks:
    - `src/app/api/transactions/verify-digipay/route.ts` no longer writes `digipayTrackingCode`.
    - `src/app/api/transactions/verify-zibal/route.ts` no longer writes `zibalRefNumber`.
    - all verify routes now update status through `updateTransactionStatus(...)`.
  - Added idempotent status-transition behavior in `updateTransactionStatus(...)`:
    - guarded `COMPLETED` transitions from re-application.
    - guarded `FAILED` transitions to pending-only.
    - returned `statusChanged` flag so callback handlers skip stock/notification/account-link side effects on repeated deliveries.
  - Tightened payment method boundary normalization in `src/app/api/transactions/create/route.ts`:
    - explicit gateway map to canonical DB methods (`STRIPE|PAYPAL`).
    - unknown method values are rejected with `400`.
- Verification:
  - `rg -n "digipayTrackingCode|zibalRefNumber|zarinpalAuthority|zibalTrackId|digipayTicket" src` (no matches)
  - `rg -n "getTransactionByAuthority|getTransactionByDigipayTicket|getTransactionByZibalTrackId" src` (no matches)
  - `rg -n "statusChanged" src/app/api/transactions/verify/route.ts src/app/api/transactions/verify-digipay/route.ts src/app/api/transactions/verify-zibal/route.ts src/services/transaction-service.ts` (matches found in all expected files)
  - `npm run build` (pass)
