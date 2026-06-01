# task010: Checkout Auth Profile Redesign

Status: Commit-reviewed clean

## Goal

Neutralize and polish checkout, auth, profile, cart recovery, and payment result experiences around Stripe and PayPal.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Confirm payment and locale tasks are complete.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `src/app/checkout/page.tsx`
- `src/components/checkout/CheckoutForm.tsx`
- `src/components/checkout/PromoCodeInput.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/profile/wishlist/page.tsx`
- `src/components/profile/`
- `src/app/payment/success/page.tsx`
- `src/app/payment/failure/page.tsx`
- `src/app/payment/verify/page.tsx`
- `src/store/checkout-store.ts`
- `src/store/cart-store.ts`

## Requirements

- Redesign checkout with neutral Stripe/PayPal method selection and clear secure payment messaging.
- Remove Persian and country-specific checkout fields/validation unless configurable.
- Ensure failure/cancel/pending payment pages preserve cart recovery behavior.
- Auth pages should use neutral English copy, generic credentials, and the shared design system.
- Profile transaction history should use neutral formatting, provider labels, and date/currency utilities.
- Promo code UI should be neutral and not assume Persian formatting.
- Keep create-account-after-checkout behavior if it still works; otherwise document and simplify it safely.

## Acceptance Criteria

- Checkout sends only `STRIPE` or `PAYPAL`.
- Payment result pages are English, neutral, and handle `PENDING`, `COMPLETED`, `FAILED`, canceled, and missing-code cases.
- Auth/profile pages contain no Persian text or Kitia branding.
- Phone, postal code, and address fields are not Iran-only unless deliberately configurable.

## Verification To Run

- `npm run verify`
- `npm run lint`
- `npm run build`
- `npm run test:unit -- checkout`
- `npm run test:unit -- user`
- `npm run test:unit -- auth`
- `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|fa-IR|تومان|09\\\\d" src/app/checkout src/components/checkout src/app/'(auth)' src/app/profile src/components/profile src/app/payment src/store`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task010: Checkout Auth Profile Redesign. Focus on checkout/provider contract, cart recovery, auth/profile regressions, validation behavior, stale Persian/Kitia copy, and accessibility." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with updated flows, checks run, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task011` can proceed.

## Completion Update - 2026-05-31 worker G

Implemented task010 checkout/auth/profile/payment-result polish. Checkout now uses an explicit `STRIPE`/`PAYPAL` provider state and sends only that uppercase value to `/api/transactions/create`; the UI has neutral Stripe/PayPal labels, secure provider messaging, generic address/postal handling, neutral promo code copy, and no Iran-only postal-code truncation. Auth/profile pages and owned auth/profile/user transaction API/service messages were scrubbed to neutral English. Profile transaction history now uses the shared date/currency formatters, neutral provider/status labels, and neutral invoice/total copy. Payment success/failure/verify pages now handle completed, pending, failed, canceled, and missing-code returns in English; cart and checkout form data are cleared only after confirmed `COMPLETED` status, while failed/pending/missing-code flows keep cart recovery available.

Checks run:

- `npm run verify` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- checkout` passed (1 file / 4 tests).
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- user` passed (16 files / 96 tests).
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- auth` passed (4 files / 14 tests).
- Required scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|fa-IR|تومان|09\\\\d" src/app/checkout src/components/checkout src/app/'(auth)' src/app/profile src/components/profile src/app/payment src/store` returned no matches.
- Additional owned API/service scrub over `src/app/api/auth`, `src/app/api/user/profile`, `src/app/api/user/password`, `src/app/api/user/transactions`, and auth/profile services returned no matches.
- `git diff --check` passed.
- `npm run lint` remains blocked by the existing missing ESLint 9 flat config (`eslint.config.js`).
- `npm run build` remains blocked by the existing Next 16 Turbopack/webpack config conflict after prebuild verification succeeds.

Review-mode status:

- First task010 review attempt hung with no final findings; partial output file `/tmp/codex-review.JCXk7j.txt`.
- Second timeout-bounded attempt produced `/tmp/codex-review.obPMWR.txt` and timed out after 180 seconds. Its partial transcript exposed one valid task010 issue: `CheckoutForm` accepted `RefObject<HTMLFormElement>` while `useRef<HTMLFormElement>(null)` passes `RefObject<HTMLFormElement | null>`. Fixed by widening the prop type and reran the checkout unit test plus `git diff --check`.
- Final timeout-bounded attempt after the fix produced `/tmp/codex-review.GWXfdn.txt` and timed out after 120 seconds. It did not reach final findings; partial output shows unrelated existing type issues in admin/routes/request-utils, and the prior checkout ref issue is shown as fixed.

Task011 could proceed functionally from task010's checkout/auth/profile surface at this point. The earlier strict review-mode blocker is superseded by the commit-based finalization below.

## Finalization Update - 2026-06-01 worker M

Finalized task010 in the combined tasks009-011 pass. No additional checkout provider-contract or cart-recovery code changes were required after inspection; the finalization sweep did clean related user/wishlist/promo API messages and E2E expectations that affect checkout/auth/profile-adjacent recovery and promo flows.

Additional checks run by worker M:

- `npm run verify` passed.
- `npm run lint` passed.
- `npm run build` passed with placeholder Supabase/Auth/Stripe/PayPal env.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- checkout` passed (1 file / 4 tests).
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- auth` passed (4 files / 15 tests).
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- user` passed (16 files / 99 tests).
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- promo` passed (3 files / 29 tests).
- Required checkout/auth/profile/payment scrub returned no matches.
- `git diff --check` passed.

Review-mode status:

- Worker M attempted combined focused review-mode runs covering tasks009-011 at `/tmp/codex-review.8DaFNL.txt`, `/tmp/codex-review.5nzj35.txt`, and `/tmp/codex-review.p8B9Sn.txt`.
- The wrapper logs `/tmp/codex-review-task009-011-wrapper.log`, `/tmp/codex-review-task009-011-final-rerun.log`, and `/tmp/codex-review-task009-011-final-short.log` were empty because the wrapper did not print `review_output=...`.
- The partial transcripts did not reach final findings sections; worker M fixed the scoped copy regressions visible in the transcripts and verified no task009-011 review process remained running.

## Commit-Based Review Finalization - 2026-06-01

- Final reviewed task commit: `23a627f` (`task010: redesign checkout auth profile flows`).
- Review target was the exact task010 commit, not uncommitted files and not the full branch.
- Review output paths:
  - `tasks/open-source-boilerplate-conversion/reviews/task010-round1.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task010-round2.txt`
- Round 1 reviewed commit `c210809` and found a valid E2E locator drift issue for the redesigned checkout submit button.
- The finding was fixed into task010 by updating the task-scoped guest checkout E2E payment-button locators to match `Pay`, legacy `Payment`, and Persian-era labels.
- Round 2 reviewed final commit `23a627f` and returned no valid findings.
- Checks run for the final task010 state:
  - `git diff --check 23a627f^ 23a627f` passed.
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run verify` passed.
  - `npm run lint -- --quiet` passed.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- checkout user auth` passed: 21 files / 118 tests.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm --prefix tests run test:e2e -- --list tests/e2e/journeys/guest-checkout.spec.ts` passed and listed 21 tests.
  - `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|fa-IR|تومان|09\\\\d" src/app/checkout src/components/checkout src/app/'(auth)' src/app/profile src/components/profile src/app/payment src/store` returned no matches.
  - Production build with placeholder Supabase/Auth/Stripe/PayPal env passed.
- Remaining task010 blockers: none from the commit-based review. Task011 is next in the sequential commit-based review queue.
