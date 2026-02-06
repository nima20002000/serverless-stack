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
