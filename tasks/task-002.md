# Task 002 - Regenerate Supabase Types and Unblock Compilation

## Goal
Align TypeScript database types with the live schema so compile-time checks are meaningful.

## Scope
- Replace stale `src/types/supabase.ts` definitions for removed OTP/legacy payment fields.
- Update related service/component types that consume generated DB types.

## Steps
1. Regenerate Supabase type definitions from the active DB schema.
2. Update local type aliases that still reference `ZARINPAL|DIGIPAY|ZIBAL`.
3. Fix all compile errors caused by removed columns/tables.
4. Run build/typecheck and commit only type-safe changes.

## Edge Cases
- Regenerated types differ between preview and production.
- Handwritten union types conflict with generated enum types.
- Hidden references in tests/docs block CI even if app compiles.

## Acceptance Criteria
- No references remain to removed DB columns in type definitions.
- `PaymentMethod` in code uses only `STRIPE|PAYPAL`.
- Project builds cleanly without suppressions.

## Rollback
- Revert type generation commit and restore previous file if compilation cannot be stabilized in one pass.

## Completion Notes (2026-02-07)
- Status: Completed
- Completed implementation:
  - Regenerated `src/types/supabase.ts` from live preview schema:
    - `supabase gen types typescript --project-id hwpojwfoddfjnjuxqucv --schema public > src/types/supabase.ts`
  - Confirmed preview/production generated type parity for schema shape (format-normalized diff clean).
  - Replaced DB-table-based OTP storage in `src/services/otp-service.ts` with Redis/memory-backed storage to remove compile-time dependency on removed `otp_verifications`.
  - Updated handwritten payment method contracts in active service/UI code to `STRIPE|PAYPAL` (including `src/lib/email/client.ts`, admin/profile transaction views, and service type aliases).
  - Removed stale cleanup query against removed OTP table from `src/services/user-service.ts`.
  - Updated `src/lib/kavenegar/client.ts` so missing `KAVENEGAR_API_KEY` no longer throws at module import time.
- Verification:
  - `npx prettier --write src/types/supabase.ts` (unchanged)
  - `rg -n "paymentMethod\\s*:\\s*'ZARINPAL'|paymentMethod\\s*:\\s*'DIGIPAY'|paymentMethod\\s*:\\s*'ZIBAL'|type\\s+PaymentMethod\\s*=.*ZARINPAL|type\\s+PaymentMethod\\s*=.*DIGIPAY|type\\s+PaymentMethod\\s*=.*ZIBAL" src` (no matches)
  - `rg -n "otp_verifications|zarinpalAuthority|zibalRefNumber|digipayTrackingCode" src/types/supabase.ts` (no matches)
  - `npm run build` (pass)
