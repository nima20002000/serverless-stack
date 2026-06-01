# task004: Harden Stripe PayPal Payment Flow

Status: Commit-reviewed clean

## Goal

Make Stripe and PayPal the complete, reliable, documented payment implementation for the boilerplate.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Confirm `task003` removed legacy providers.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `src/app/api/transactions/create/route.ts`
- `src/app/api/transactions/webhook-stripe/route.ts`
- `src/app/api/transactions/webhook-paypal/route.ts`
- `src/app/api/transactions/paypal/capture/route.ts`
- `src/app/api/transactions/status/route.ts`
- `src/lib/stripe/client.ts`
- `src/lib/paypal/client.ts`
- `src/lib/payments/finalize-successful-transaction.ts`
- `src/services/transaction-service.ts`
- `database/schema-contract.md`
- `scripts/db/validate_payment_schema.sql`
- `tests/unit/api/transactions/webhook-stripe.test.ts`
- `tests/unit/api/transactions/webhook-paypal.test.ts`
- `tests/integration/payment-verification.test.ts`

## Requirements

- Ensure transaction creation accepts only `STRIPE` and `PAYPAL` and returns provider-specific redirect identifiers safely.
- Ensure Stripe webhook handling is signature-verified, idempotent, amount/currency checked, and updates transaction/provider fields consistently.
- Ensure PayPal capture and webhook paths are idempotent, amount/currency checked, and safe against mismatched order IDs.
- Replace hard-coded `Kitia order` labels with configurable neutral site/order labels.
- Keep amount conversion correct for zero-decimal currencies.
- Document webhook URLs and required env vars in README or payment docs.
- Add or update tests for invalid provider, webhook signature failure, duplicate webhook/capture, amount mismatch, currency mismatch, and pending status polling.

## Acceptance Criteria

- Only `STRIPE` and `PAYPAL` are accepted in payment API contracts.
- Payment success is finalized exactly once even if webhooks or captures are retried.
- Payment failure/cancel keeps cart recovery behavior intact.
- Payment docs describe local webhook testing and Vercel deployment.

## Verification To Run

- `npm run verify`
- `npm run lint`
- `npm run build`
- `npm run test:unit -- transactions`
- `npm run test:integration -- payment-verification`
- `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql` when a configured database is available.
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task004: Harden Stripe PayPal Payment Flow. Focus on payment idempotency, webhook verification, amount/currency checks, transaction state transitions, provider metadata, and tests." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with payment behavior changed, tests/checks run, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task005` can proceed.

## Completion Update - 2026-05-31

Implemented task004 payment hardening:

- Added centralized provider normalization so transaction creation accepts only `STRIPE` and `PAYPAL`, defaulting missing provider input to `STRIPE` and rejecting unsupported/non-string providers before payment creation.
- Added configurable neutral provider order labels via `PAYMENT_SITE_NAME`, replacing hard-coded `Kitia order`/`Kitia Order` labels in Stripe and PayPal checkout creation.
- Hardened Stripe completion/failure handlers with provider-reference checks for checkout session and payment intent IDs before status updates/finalization.
- Hardened PayPal webhook and capture amount checks to reuse the same zero-decimal conversion as order creation.
- Changed PayPal webhook metadata and amount/currency mismatches into handled no-op responses instead of throwing unhandled route errors.
- Preserved/merged existing `paymentMetadata` in `updateTransactionStatus` while adding provider refs/capture/charge IDs, so PayPal capture does not wipe existing provider metadata.
- Added `axios` as an explicit runtime dependency for the PayPal client after legacy-provider dependency cleanup removed the transitive copy.
- Added/updated focused tests for invalid provider rejection, Stripe signature failure, Stripe amount/currency/provider-ref mismatch, PayPal signature failure, PayPal amount/currency/metadata mismatch, duplicate PayPal capture, capture amount mismatch, and pending status polling.
- Updated Stripe/PayPal deployment docs with webhook URLs, local webhook testing, `PAYMENT_SITE_NAME`, PayPal capture route, idempotent capture behavior, and failure/cart-recovery smoke checks.

Files changed for task004:

- `.env.example`
- `docs/PAYMENT_METHOD_DEPLOYMENT.md`
- `package.json`
- `package-lock.json`
- `src/app/api/transactions/create/route.ts`
- `src/app/api/transactions/webhook-stripe/route.ts`
- `src/app/api/transactions/webhook-paypal/route.ts`
- `src/app/api/transactions/paypal/capture/route.ts`
- `src/lib/payments/provider-labels.ts`
- `src/lib/payments/providers.ts`
- `src/lib/stripe/client.ts`
- `src/lib/paypal/client.ts`
- `src/services/transaction-service.ts`
- `tests/unit/api/transactions/create-status.test.ts`
- `tests/unit/api/transactions/paypal-capture.test.ts`
- `tests/unit/api/transactions/webhook-stripe.test.ts`
- `tests/unit/api/transactions/webhook-paypal.test.ts`
- `tests/integration/payment-verification.test.ts`

Checks run:

- `npm install --legacy-peer-deps --no-audit --no-fund` and `npm install --prefix tests --legacy-peer-deps --no-audit --no-fund` to restore missing dependencies; `npm ci` was blocked because task003 package changes left the lockfile out of sync, and plain `npm install` hit the existing `next-auth`/`nodemailer` peer conflict.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- transactions` - passed, 7 files / 29 tests.
- `npm run verify` - passed.
- `git diff --check` - passed before task/handoff updates.
- `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql` - skipped because `DATABASE_URL` is not set.
- `npm run test:integration -- payment-verification` with placeholder local env - blocked by integration setup requiring a real-format `sb_secret_...` key and reachable Supabase test database.
- `npm run lint` - blocked before linting because ESLint 9 cannot find `eslint.config.*`; repo currently only has `.eslintrc.json`.
- `npm run build` - blocked in Next config before compilation because Next 16/Turbopack rejects the existing `webpack` config without a `turbopack` config; also warned about stale `optimizeFonts`/`swcMinify` config keys.
- `npx tsc --noEmit` - still fails on existing repo-wide Next 16 route context typing, checkout ref nullability, JSX namespace, and `NextRequest.ip` issues; the task004-relevant missing `axios` failure was fixed.

Review-mode output:

- `/tmp/codex-review.dBcmhp.txt` - review script failed before producing findings because Codex review usage quota was exhausted until June 1, 2026 00:27 local time.

Known issues / follow-up:

- Mandatory clean Codex review loop is not complete due to the external review quota limit. Re-run the task004 review command after quota resets and fix any valid findings.
- Task003 legacy-provider cleanup is concurrently present in the worktree and appears to have removed legacy provider files/routes, but task004 did not revert or otherwise own those changes.
- Strictly, task005 should wait until task004 gets a clean review-mode pass. Functionally, the Stripe/PayPal code/tests/docs changes are in place for task005 to inspect schema/seed readiness.

## Finalization Update - 2026-06-01

Worker: finalization worker K

Task004 inspection/fixes:

- Neutralized the runtime transaction code prefix from `KT-` to `TX-` in `generateTransactionCode()` and direct checkout/payment tests/helpers.
- Cleaned corrupted placeholder English in task004-owned transaction/payment surfaces:
  - `src/app/api/transactions/create/route.ts`
  - `src/app/api/transactions/paypal/capture/route.ts`
  - `src/app/api/transactions/[id]/route.ts`
  - `src/app/api/transactions/status/route.ts`
  - `src/lib/stripe/client.ts`
  - `src/services/transaction-service.ts`
- Updated focused tests for the neutral transaction prefix and cleaned payment/transaction error messages.
- Rechecked Stripe/PayPal provider normalization, webhook/capture amount/currency checks, provider metadata writes, and idempotent completion behavior; no additional payment-flow bug was found.

Files additionally changed by finalization K:

- `src/services/transaction-service.ts`
- `src/app/api/transactions/create/route.ts`
- `src/app/api/transactions/paypal/capture/route.ts`
- `src/app/api/transactions/[id]/route.ts`
- `src/app/api/transactions/status/route.ts`
- `src/lib/stripe/client.ts`
- `tests/unit/api/transactions/create-status.test.ts`
- `tests/unit/api/transactions/paypal-capture.test.ts`
- `tests/unit/api/transactions/webhook-stripe.test.ts`
- `tests/unit/api/transactions/webhook-paypal.test.ts`
- `tests/unit/services/transaction-service.test.ts`
- `tests/integration/payment-verification.test.ts`
- `tests/e2e/journeys/authenticated-checkout.spec.ts`
- `tests/e2e/journeys/guest-checkout.spec.ts`
- `tests/e2e/fixtures/cleanup.ts`
- `tests/utils/assertions.ts`
- `tests/utils/cleanup.ts`

Checks run:

- `npm run verify` - passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- transactions` - passed, 7 files / 29 tests.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- services/transaction-service.test.ts` - passed, 17 tests.
- `npm run lint` - passed.
- `npm run build` - passed after waiting for a concurrent stale Next build lock/process to clear.
- `npm run test:integration -- payment-verification` with placeholder local env - blocked before tests because `SUPABASE_SECRET_KEY=test-secret` is not a real `sb_secret_...` key.
- `git diff --check` - passed before task/handoff updates.

Review-mode:

- Combined tasks003-005 review attempt: `/tmp/codex-review.l7bSmo.txt`; incomplete because the nested reviewer ran unit tests without required Supabase env vars and stopped before findings.
- Combined tasks003-005 review retry with placeholder local env: `/tmp/codex-review.4RqsXG.txt`; incomplete before a final review result because the nested reviewer hit an unrelated shared-worktree full-unit failure in `tests/unit/services/product-service.test.ts` (`Stock text` expectation vs `Not enough stock available`), which is outside task003-005 and outside this worker's allowed edit scope.
- Wrapper logs: `/tmp/codex-review-task003-005-K-wrapper.txt` and `/tmp/codex-review-task003-005-K-rerun-wrapper.txt` were empty because the review wrapper did not print a `review_output=` line before the nested runs ended.
- No task004-specific review findings were produced.

Known remaining blockers:

- Live payment integration verification requires a reachable local/test Supabase database and a real-format Supabase secret key.
- Strict review gate remains incomplete due review/tooling/shared-worktree blockers, not due a task004 finding.

## Commit-Based Review Finalization - 2026-06-01

Final task commit: `86aa77c` (`task004: harden Stripe and PayPal payments`)

Review outputs:

- `tasks/open-source-boilerplate-conversion/reviews/task004-round1.txt`
  - Target: commit `86aa77c`.
  - Result: no actionable regressions identified in provider normalization, Stripe/PayPal webhook verification, capture flow, or transaction status update changes.

Checks run for the final task004 commit/review loop:

- `npm run verify` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service SUPABASE_SECRET_KEY=service NEXTAUTH_SECRET=test NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 STRIPE_SECRET_KEY=sk_test STRIPE_WEBHOOK_SECRET=whsec_test PAYPAL_CLIENT_ID=test PAYPAL_CLIENT_SECRET=test PAYPAL_WEBHOOK_ID=webhook npm --prefix tests run test:unit -- api/transactions/webhook-stripe.test.ts api/transactions/webhook-paypal.test.ts api/transactions/paypal-capture.test.ts api/transactions/create-status.test.ts services/transaction-service.test.ts` passed: 5 files / 35 tests.
- Nested review ran `npm run lint -- --quiet`, `npm run build`, and `git diff --check 86aa77c^ 86aa77c`; those passed during review.

Remaining blockers:

- None for task004's commit-based review gate.
- Live integration verification with `npm run test:integration -- payment-verification` still requires a reachable test Supabase database and real-format Supabase secret key, so it remains an environment requirement rather than a task004 code blocker.
- Task005 can proceed under the sequential commit-review workflow.
