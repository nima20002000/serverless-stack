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
