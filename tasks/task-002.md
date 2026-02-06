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

## Progress Update (2026-02-07)
- Status: In progress (handoff checkpoint)
- Completed:
  - Regenerated `src/types/supabase.ts` from live preview schema using Supabase CLI:
    - `supabase gen types typescript --project-id hwpojwfoddfjnjuxqucv --schema public > src/types/supabase.ts`
  - Confirmed preview/production generated types parity for schema shape (format-normalized diff is clean).
  - Replaced DB-table-based OTP storage in `src/services/otp-service.ts` with Redis/memory-backed OTP storage to remove compile-time dependency on removed `otp_verifications` table.
  - Updated legacy payment method unions in key UI/service files to `STRIPE|PAYPAL`.
  - Updated `src/lib/email/client.ts` payment method contract to `STRIPE|PAYPAL`.
  - Removed `otp_verifications` cleanup query from `src/services/user-service.ts`.
  - Updated `src/lib/kavenegar/client.ts` to avoid throwing at module import when `KAVENEGAR_API_KEY` is missing (build-safe behavior).
  - Verified build succeeds:
    - `npm run build` passed after above changes.

## Next Agent Guide
- Continue from this commit with focus on **finishing Task 002 only**:
  1. Audit and remove remaining handwritten legacy payment aliases/usages that still mention `ZARINPAL|DIGIPAY|ZIBAL` where they are part of current app contracts.
  2. Re-check that no type definitions (generated or local aliases) reference removed OTP table/legacy payment columns.
  3. Re-run:
     - `npx prettier --write src/types/supabase.ts` (or regenerate and normalize)
     - `npm run build`
  4. If regenerating from production for parity verification, use:
     - `supabase gen types typescript --project-id lfdlfuscitujmcmviayj --schema public > tmp/supabase-production.ts`
     - `npx prettier --write --ignore-path /dev/null tmp/supabase-production.ts`
     - `diff -u src/types/supabase.ts tmp/supabase-production.ts`
  5. Keep changes scoped to Task 002 and avoid starting Task 003 runtime removals unless strictly needed for Task 002 type/build stability.
