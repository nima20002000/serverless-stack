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
