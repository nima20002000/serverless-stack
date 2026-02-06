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
