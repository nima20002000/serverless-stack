# Sequential Implementation Plan

## Task Execution
- [x] Task 001 - Lock app/DB contract and baseline checks
- [x] Task 002 - Regenerate Supabase types and unblock compilation
- [x] Task 003 - Remove OTP and SMS runtime dependencies
- [x] Task 004 - Refactor transaction service to new schema
- [ ] Task 005 - Implement Stripe payment flow
- [ ] Task 006 - Implement PayPal payment flow
- [ ] Task 007 - Checkout UI and API contract update
- [ ] Task 008 - Admin/Profile payment visibility update
- [ ] Task 009 - Test suite migration and local verification
- [ ] Task 010 - Deployment readiness, runbooks, and cutover

## Verification Requirements
- [x] Schema parity verified between preview and production for public objects in scope
- [x] Build succeeds after each non-trivial milestone
- [ ] Critical payment flow tests pass locally
- [x] Task files updated only after each task is fully verified
- [x] Descriptive git commit created after each completed task

## Review Notes
- Task 001 complete: fixed production drift (`idx_promo_codes_code`, `idx_transactions_promo`), regenerated schema dumps, committed canonical parity checksum and SQL validator.
- Task 002 complete: validated regenerated Supabase types, confirmed no legacy payment/OTP table references in generated type contracts, and re-verified clean `npm run build`.
- Task 003 complete: removed OTP routes/UI/services and SMS confirmation runtime calls, moved auth/checkout/profile flows to password-only paths, and re-verified clean `npm run build`.
- Task 004 complete: converted transaction lookup/update to provider-neutral service methods, removed legacy callback-column writes, added idempotent status-change guards for callback replays, and re-verified clean `npm run build`.
