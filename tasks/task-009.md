# Task 009 - Test Suite Migration and Local Verification

## Goal
Update tests to match new schema and payment architecture, then verify locally.

## Scope
- Remove or rewrite OTP/Kavenegar/legacy gateway tests.
- Add Stripe/PayPal focused unit/integration tests.
- Keep CI deterministic via mocks where needed.

## Steps
1. Replace legacy gateway fixtures and mocks.
2. Remove `otp_verifications` test setup/cleanup logic.
3. Add webhook idempotency tests for both providers.
4. Add contract tests for transaction state transitions.
5. Run local test matrix and capture known failures.

## Edge Cases
- Flaky tests due to webhook timing/race conditions.
- Tests accidentally using production credentials.
- Snapshot tests tied to old Persian labels for removed methods.

## Acceptance Criteria
- No tests reference removed columns or OTP table.
- Critical payment flow tests pass locally.
- CI config includes required Stripe/PayPal test env vars.

## Rollback
- Temporarily mark non-critical flaky tests and keep payment core tests as blocking.
