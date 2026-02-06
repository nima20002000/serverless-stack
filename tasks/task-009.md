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

## Completion Notes (2026-02-07)
- Status: Completed
- Completed implementation:
  - Replaced legacy payment verification coverage with Stripe/PayPal suites:
    - added `tests/unit/api/transactions/webhook-stripe.test.ts`.
    - added `tests/unit/api/transactions/webhook-paypal.test.ts`.
    - rewrote `tests/integration/payment-verification.test.ts` for Stripe/PayPal idempotency behavior.
  - Removed obsolete OTP/legacy gateway tests that no longer match runtime routes/services:
    - deleted `tests/unit/api/auth/send-otp.test.ts`.
    - deleted `tests/unit/api/auth/verify-otp.test.ts`.
    - deleted `tests/unit/api/auth/checkout-verify-otp.test.ts`.
    - deleted `tests/unit/api/user/reset-password-otp.test.ts`.
    - deleted `tests/unit/services/otp-service.test.ts`.
    - deleted `tests/unit/services/sms-service.test.ts`.
    - deleted `tests/unit/api/transactions/verify.test.ts`.
    - deleted `tests/unit/api/transactions/verify-digipay.test.ts`.
    - deleted `tests/unit/api/transactions/verify-zibal.test.ts`.
    - deleted legacy gateway library tests:
      - `tests/unit/lib/zarinpal.test.ts`
      - `tests/unit/lib/zibal.test.ts`
      - `tests/unit/lib/digipay.test.ts`
      - `tests/unit/lib/digipay-shell.test.ts`
    - deleted `tests/integration/otp-service.test.ts`.
  - Added transaction status transition contract assertions in `tests/unit/services/transaction-service.test.ts`:
    - validates `statusChanged` behavior for first-time completion.
    - validates idempotent completion no-op.
    - validates failed transition guard (`PENDING` only).
  - Updated active test fixtures and middleware expectations to current architecture:
    - migrated old payment enums/columns in integration/unit tests to `STRIPE|PAYPAL` and provider-ref fields.
    - updated middleware tests to remove OTP endpoint assumptions and validate current `/api/auth/*` behavior.
    - removed Kavenegar connectivity dependency from `tests/integration/setup.ts`.
  - Updated CI/test env templates for provider migration:
    - `tests/.env.example` now documents Stripe/PayPal test vars.
    - `.github/workflows/deploy-staging.yml` and `.github/workflows/deploy.yml` now inject Stripe/PayPal envs.
- Acceptance criteria check:
  - no unit/integration tests reference removed columns or OTP table:
    - `rg -n "otp_verifications|zarinpalAuthority|zarinpalRefId|zibalTrackId|digipayTrackingCode|digipayTicket" tests/unit tests/integration` (no matches)
  - critical payment flow tests pass locally:
    - `timeout 360 env NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co' NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test' SUPABASE_SECRET_KEY='sb_secret_test' npx vitest run --config vitest.config.ts unit/services/transaction-service.test.ts unit/api/transactions/webhook-stripe.test.ts unit/api/transactions/webhook-paypal.test.ts unit/middleware.test.ts integration/payment-verification.test.ts` (pass)
  - CI config now includes Stripe/PayPal env vars in both staging and production deploy workflows.
- Known non-blocking note captured during matrix:
  - `tests/unit/lib/email-client.test.ts` currently has a Vitest v4 constructor-mock compatibility failure in existing Resend mocking style; payment-core matrix and build are unaffected.
