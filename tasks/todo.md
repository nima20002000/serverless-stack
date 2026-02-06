# Sequential Implementation Plan

## Task Execution
- [x] Task 001 - Lock app/DB contract and baseline checks
- [ ] Task 002 - Regenerate Supabase types and unblock compilation
- [ ] Task 003 - Remove OTP and SMS runtime dependencies
- [ ] Task 004 - Refactor transaction service to new schema
- [ ] Task 005 - Implement Stripe payment flow
- [ ] Task 006 - Implement PayPal payment flow
- [ ] Task 007 - Checkout UI and API contract update
- [ ] Task 008 - Admin/Profile payment visibility update
- [ ] Task 009 - Test suite migration and local verification
- [ ] Task 010 - Deployment readiness, runbooks, and cutover

## Verification Requirements
- [x] Schema parity verified between preview and production for public objects in scope
- [ ] Build succeeds after each non-trivial milestone
- [ ] Critical payment flow tests pass locally
- [ ] Task files updated only after each task is fully verified
- [ ] Descriptive git commit created after each completed task

## Review Notes
- Task 001 complete: fixed production drift (`idx_promo_codes_code`, `idx_transactions_promo`), regenerated schema dumps, committed canonical parity checksum and SQL validator.
