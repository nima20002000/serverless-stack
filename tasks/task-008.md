# Task 008 - Admin/Profile Payment Visibility Update

## Goal
Make admin and user transaction views compatible with new provider fields.

## Scope
- Replace old payment method badges/labels.
- Remove display of legacy reference columns.
- Add Stripe/PayPal reference visibility.

## Steps
1. Update transaction DTO types in admin/profile pages.
2. Replace provider label maps with `STRIPE|PAYPAL`.
3. Render `stripePaymentIntentId` / `paypalOrderId` where available.
4. Ensure CSV/export/report logic still works.

## Edge Cases
- Historical rows from old providers still exist in backups/imports.
- Mixed data where provider ref is missing due to interrupted flow.
- Long provider IDs breaking table layout.

## Acceptance Criteria
- Admin and profile pages render without runtime/type errors.
- Legacy columns are not referenced anywhere in UI code.
- Provider refs are shown in a copy-friendly format.

## Rollback
- Keep compact fallback rendering for unknown methods as `UNKNOWN` without crashing.

## Completion Notes (2026-02-07)
- Status: Completed
- Completed implementation:
  - Updated admin transaction list rendering in `src/app/admin/transactions/page.tsx`:
    - payment method badge mapping now explicitly supports `STRIPE`/`PAYPAL` and falls back to `UNKNOWN`.
    - added visible provider reference rows for `stripePaymentIntentId` and `paypalOrderId` in table entries.
  - Updated admin transaction detail modal in `src/components/admin/TransactionDetailModal.tsx`:
    - payment method fallback updated to `UNKNOWN` for non-canonical historical values.
    - provider reference fields now render full, non-truncated IDs with `break-all` layout.
    - added copy buttons for `stripePaymentIntentId` and `paypalOrderId` for copy-friendly operations.
  - Updated profile transaction visibility:
    - extended profile transaction DTO typing in `src/app/profile/page.tsx` with provider reference fields.
    - updated `src/components/profile/TransactionHistory.tsx` to display `paymentProviderRef`, `stripePaymentIntentId`, and `paypalOrderId`.
    - payment method fallback updated to `UNKNOWN` to keep historical/partial data safe.
- Acceptance criteria check:
  - admin/profile transaction UIs render with Stripe/PayPal provider metadata and no runtime type mismatches.
  - legacy provider-specific reference columns are not used in the updated admin/profile UI rendering paths.
  - provider references are visible in copy-friendly format (full IDs, no destructive truncation).
  - no CSV/export/report code path exists under current admin transactions implementation; no regression introduced.
- Verification:
  - `npm run build` (pass)
