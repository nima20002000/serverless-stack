# Task 001 - Lock App-DB Contract and Baseline Checks

## Goal
Create a single source of truth for the new schema (Stripe/PayPal + no OTP table) before refactoring app logic.

## Scope
- Confirm production and preview schema parity.
- Capture current table/enum/index contract used by application code.
- Prevent accidental drift while refactors are in progress.

## Steps
1. Snapshot schema metadata from both databases (tables, columns, enums, indexes).
2. Compare preview vs production and resolve any drift immediately.
3. Record expected transaction columns and `PaymentMethod` enum values (`STRIPE`, `PAYPAL`).
4. Add a quick SQL validation script for local/predeploy checks.

## Edge Cases
- One database has a partially applied migration.
- Enum values differ by order or casing.
- Index exists in one environment but not the other.
- Legacy columns reintroduced by an accidental migration.

## Acceptance Criteria
- Preview and production return identical schema checksums for `public` objects in scope.
- Validation script fails fast if legacy columns/tables are detected.
- Schema contract document is committed and referenced by later tasks.

## Rollback
- Stop refactor rollout and reconcile schema differences first; no app deploy until parity is restored.

## Completion Notes (2026-02-06)
- Status: Completed
- Preview and production parity verified for `public` tables/columns/enums/indexes with identical canonical checksum:
  - `64bfc501fb2132f33b5a3eadab3dfc27534f8470e49d361b673e366ace1092ee`
- Drift resolved:
  - Added missing production indexes `idx_promo_codes_code` and `idx_transactions_promo` (idempotent SQL applied to both environments).
- Contract artifacts committed:
  - `database/schema-contract.md`
  - `database/schema-dumps/preview-public-metadata-canonical.txt`
  - `database/schema-dumps/production-public-metadata-canonical.txt`
  - `database/schema-dumps/public-schema-parity-checksums.txt`
  - `scripts/db/validate_payment_schema.sql`
- Validation script verified against both environments with `DO` success.
