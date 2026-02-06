# Public Schema Contract (Payments + Auth Cleanup)

## Scope
- Schema: `public`
- Objects in parity checksum: tables, columns, enums, indexes
- Target payment model: `STRIPE` and `PAYPAL`

## Canonical Parity Checksum
- `64bfc501fb2132f33b5a3eadab3dfc27534f8470e49d361b673e366ace1092ee`
- Source snapshots:
  - `database/schema-dumps/preview-public-metadata-canonical.txt`
  - `database/schema-dumps/production-public-metadata-canonical.txt`

## Required `PaymentMethod` Enum Values
- `STRIPE`
- `PAYPAL`

## Required `transactions` Columns
- `paymentMethod`
- `stripePaymentIntentId`
- `stripeCheckoutSessionId`
- `stripeChargeId`
- `paypalOrderId`
- `paypalCaptureId`
- `paymentProviderRef`
- `paymentMetadata`

## Forbidden Legacy Artifacts
- Table: `public.otp_verifications`
- `transactions` columns:
  - `zarinpalAuthority`
  - `zarinpalRefId`
  - `digipayTicket`
  - `digipayTrackingCode`
  - `zibalTrackId`
  - `zibalRefNumber`

## Verification Command
Run this before local/predeploy releases:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql
```
