# task003: Remove Legacy Iranian Payment Providers

Status: Commit-reviewed clean

## Goal

Remove Zarinpal, Digipay, Zibal, and any Snappay remnants from runtime code, dependencies, middleware, docs, and tests while preserving the Stripe/PayPal payment model.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Read previous task updates.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `src/app/api/transactions/verify/route.ts`
- `src/app/api/transactions/verify-digipay/route.ts`
- `src/app/api/transactions/verify-zibal/route.ts`
- `src/lib/zarinpal/client.ts`
- `src/lib/digipay/`
- `src/lib/zibal/client.ts`
- `src/components/payment/`
- `src/components/checkout/DigipayGuidanceModal.tsx`
- `src/config/constants.ts`
- `src/middleware.ts`
- `package.json`
- `tests/e2e/helpers/payment.ts`
- `tests/unit/middleware.test.ts`
- `tests/integration/middleware-rate-limiting.test.ts`

## Requirements

- Delete legacy provider API routes, clients, badges, modal/guidance UI, surcharge UI, and config constants.
- Remove legacy dependencies such as `zarinpal-node-sdk` and any dependency that only exists for removed providers.
- Keep `axios` only if PayPal still needs it; if PayPal is refactored to `fetch` in a later task, that later task may remove it.
- Remove middleware exemptions for legacy verification endpoints.
- Remove or rewrite tests that mock or expect legacy gateways.
- Ensure no checkout or product UI references Digipay surcharge/installments or legacy provider badges.
- Ensure migrations/schema comments do not imply legacy providers are active. Historic migration filenames may remain if changing migration history is unsafe, but active docs must state the current providers.

## Acceptance Criteria

- `rg -i "zarinpal|digipay|zibal|snappay|mydigipay|zarinpal\\.com|zibal\\.ir" src package.json tests README.md docs .env.example` returns no active runtime references. Historic migration notes may be documented separately if retained.
- Only Stripe and PayPal transaction routes remain for provider callbacks.
- App compiles conceptually without imports from removed provider files.
- Package dependencies no longer include old gateway SDKs.

## Verification To Run

- `npm install` or `npm ci` if dependencies are not installed and package files changed.
- `npm run verify`
- `npm run lint`
- `npm run build`
- `rg -i "zarinpal|digipay|zibal|snappay|mydigipay|zarinpal\\.com|zibal\\.ir" src package.json tests README.md docs .env.example`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task003: Remove Legacy Iranian Payment Providers. Focus on stale provider imports, middleware gaps, dependency cleanup, deleted route fallout, and tests/docs still mentioning removed gateways." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with removed files, dependency changes, checks run, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task004` can proceed.

## Completion Update - 2026-05-31

Worker: task003 / worker agent 3

Removed legacy provider runtime files:

- Deleted callback routes:
  - `src/app/api/transactions/verify/route.ts`
  - `src/app/api/transactions/verify-digipay/route.ts`
  - `src/app/api/transactions/verify-zibal/route.ts`
- Deleted legacy clients:
  - `src/lib/zarinpal/client.ts`
  - `src/lib/digipay/client.ts`
  - `src/lib/digipay/shell-client.ts`
  - `src/lib/zibal/client.ts`
- Deleted legacy UI:
  - `src/components/payment/*`
  - `src/components/checkout/DigipayGuidanceModal.tsx`
  - `src/components/layout/InstallmentBanner.tsx`
- Deleted legacy provider doc artifact:
  - `docs/digipay-shell.txt`

Updated runtime/tests/docs:

- Removed legacy provider constants from `src/config/constants.ts`.
- Removed legacy callback rate-limit exemptions from `src/middleware.ts`; Stripe/PayPal webhook and PayPal capture exemptions remain.
- Removed gateway badge and installment/surcharge UI from layout/footer/product/home/page surfaces.
- Rewrote active E2E payment helpers/tests from removed gateway mocks to Stripe/PayPal names.
- Rebased middleware tests to expect only active Stripe/PayPal callback exemptions.
- Scrubbed active README/docs/tests references covered by task003 acceptance.
- Added `axios` as an explicit dependency because `src/lib/paypal/client.ts` still imports it after the legacy SDK removal.
- Fixed the nested review's valid concurrent-worktree finding in `supabase/migrations/20260531190011_initial_public_schema.sql` by removing a duplicate `promo_codes` FK constraint.

Checks run:

- `npm install --package-lock-only` failed: existing `next-auth` / `nodemailer` peer dependency conflict.
- `npm install --package-lock-only --legacy-peer-deps` failed: `prepare` script could not find `husky`.
- `npm install --package-lock-only --legacy-peer-deps --ignore-scripts` passed.
- `npm install --legacy-peer-deps --ignore-scripts` passed to install missing local dependencies.
- `npm install axios@^1.16.1 --save --legacy-peer-deps --ignore-scripts` passed.
- `npm run verify` passed.
- `rg -i "zarinpal|digipay|zibal|snappay|mydigipay|zarinpal\\.com|zibal\\.ir" src package.json tests README.md docs .env.example` passed with no matches.
- `git diff --check` passed.
- `npm run lint` blocked by existing ESLint 9 setup issue: repo has `.eslintrc.json` but no `eslint.config.*`.
- `npm run build` blocked by existing Next.js 16/Turbopack config issue: current `next.config.js` has a `webpack` config and no `turbopack` config.

Review loop:

- First nested review completed: `/tmp/codex-review.FRUk9F.txt`.
- Valid findings fixed:
  - Added explicit `axios` dependency for PayPal.
  - Removed duplicate `promo_codes` FK constraint from the initial Supabase migration.
- Second nested review attempt failed before findings because Codex review usage quota is exhausted: `/tmp/codex-review.ydGJ23.txt`.
- Required follow-up: rerun the mandatory task003 review loop after quota resets and fix any new valid findings.

Known issues / readiness:

- No active legacy provider references remain in the task003 acceptance scan.
- Strict workflow gate: task004 should wait for a successful task003 review rerun if enforcing the mandatory review loop.
- Functional handoff: Stripe/PayPal-only cleanup is in place, so task004 can proceed from the code state if the team accepts the review quota caveat.

## Finalization Update - 2026-06-01

Worker: finalization worker K

Task003 inspection/fixes:

- Re-ran the task003 active-provider scrub and confirmed no active Zarinpal, Digipay, Zibal, Snappay, mydigipay, `zarinpal.com`, or `zibal.ir` references in `src`, `package.json`, `tests`, `README.md`, `docs`, or `.env.example`.
- Confirmed the legacy transaction verification routes and legacy provider client/UI files remain deleted.
- No additional task003 runtime/provider cleanup was required.

Checks run:

- `npm run verify` - passed.
- `rg -i "zarinpal|digipay|zibal|snappay|mydigipay|zarinpal\\.com|zibal\\.ir" src package.json tests README.md docs .env.example` - passed with no matches.
- `git diff --check` - passed before task/handoff updates.
- `npm run lint` - passed.
- `npm run build` - passed after waiting for a concurrent stale Next build lock/process to clear.

Review-mode:

- Combined tasks003-005 review attempt: `/tmp/codex-review.l7bSmo.txt`; incomplete because the nested reviewer ran unit tests without required Supabase env vars and stopped before findings.
- Combined tasks003-005 review retry with placeholder local env: `/tmp/codex-review.4RqsXG.txt`; incomplete before a final review result because the nested reviewer hit an unrelated shared-worktree full-unit failure in `tests/unit/services/product-service.test.ts` (`Stock text` expectation vs `Not enough stock available`), which is outside task003-005 and outside this worker's allowed edit scope.
- Wrapper logs: `/tmp/codex-review-task003-005-K-wrapper.txt` and `/tmp/codex-review-task003-005-K-rerun-wrapper.txt` were empty because the review wrapper did not print a `review_output=` line before the nested runs ended.
- No task003-specific review findings were produced.

Readiness:

- Functional task003 state is complete.
- Strict review gate remains incomplete due review/tooling/shared-worktree blockers, not due a task003 finding.

## Commit-Based Review Finalization - 2026-06-01

Final task commit: `ca9787d` (`task003: remove legacy Iranian payment providers`)

Review outputs:

- `tasks/open-source-boilerplate-conversion/reviews/task003-round1.txt`
  - Target: commit `d492486`.
  - Valid findings: deleted legacy provider components/configs/helpers still had active imports/callers.
- `tasks/open-source-boilerplate-conversion/reviews/task003-round2.txt`
  - Target: commit `4a1551e`.
  - Valid finding: Stripe E2E success mock redirected without completing payment finalization.
- `tasks/open-source-boilerplate-conversion/reviews/task003-round3.txt`
  - Target: commit `f733e05`.
  - Valid findings: middleware rate-limit expectation drift and PayPal approval mock host mismatch.
- `tasks/open-source-boilerplate-conversion/reviews/task003-round4.txt`
  - Target: commit `2d88248`.
  - Valid finding: deleted legacy callback paths remained exempt from middleware rate limiting.
- `tasks/open-source-boilerplate-conversion/reviews/task003-round5.txt`
  - Target: commit `84a2c13`.
  - Valid findings: E2E payment helpers bypassed real finalization and could not reinstall capture routing after clearing mocks.
- `tasks/open-source-boilerplate-conversion/reviews/task003-round6.txt`
  - Target: commit `08a8be1`.
  - Valid finding: PayPal webhook signature verification could be skipped by `E2E_TEST=true` alone.
  - Fix folded into task003: PayPal E2E webhook bypass now requires `E2E_PAYPAL_WEBHOOK_BYPASS_SECRET` and matching `x-e2e-paypal-webhook-secret`; Playwright E2E config passes the private test secret to the dev server and test process.
- `tasks/open-source-boilerplate-conversion/reviews/task003-round7.txt`
  - Target: commit `ca9787d`.
  - Result: no introduced blocking issues found; removed legacy provider code has no remaining references and Stripe/PayPal paths still build.

Checks run for the final task003 commit/review loop:

- `git diff --check -- src/app/api/transactions/webhook-paypal/route.ts tests/e2e/helpers/payment.ts tests/e2e/playwright.config.ts` passed.
- `npx tsc --noEmit --pretty false` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service SUPABASE_SECRET_KEY=service NEXTAUTH_SECRET=test STRIPE_SECRET_KEY=sk_test STRIPE_WEBHOOK_SECRET=whsec_test PAYPAL_CLIENT_ID=test PAYPAL_CLIENT_SECRET=test PAYPAL_WEBHOOK_ID=webhook npm --prefix tests run test:unit -- unit/middleware.test.ts unit/api/transactions/webhook-stripe.test.ts unit/api/transactions/webhook-paypal.test.ts` passed.
- `npm run verify` passed.
- Nested review also ran `npm run lint`, `npx tsc --noEmit --pretty false`, `npm --prefix tests exec tsc -- --noEmit --pretty false -p tsconfig.json`, and `npm run build`; those passed in the current branch state during review.

Review fixes included in final task003 commit:

- Removed active references to deleted legacy provider UI/config/helper exports.
- E2E Stripe/PayPal success and failure mocks now post synthetic events to the real webhook routes before browser redirect handling instead of directly marking transactions complete/failed.
- `clearPaymentMocks(page)` now clears the page from the capture-route WeakSet so capture routing can be reinstalled on the same page after `page.unrouteAll()`.
- Middleware rate-limit tests stayed aligned with the task003-era middleware response.
- Deleted legacy callback paths are no longer exempted from middleware rate limiting.
- PayPal E2E approval matching covers normal PayPal approval subdomains.
- PayPal E2E webhook signature bypass requires a private E2E-only shared secret and cannot be triggered by `E2E_TEST=true` alone.

Remaining blockers:

- None for task003's commit-based review gate. Task004 can proceed under the sequential commit-review workflow.
