# task007: English Copy And Validation Cleanup

Status: Commit-reviewed clean

## Goal

Replace Persian UI, API, email-facing, and validation text with neutral English defaults, and remove Iran-only phone/name validation assumptions.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Confirm `task006` established shared formatting/locale utilities.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `src/app/`
- `src/components/`
- `src/services/`
- `src/lib/auth/options.ts`
- `src/services/user-service/validation.ts`
- `src/components/checkout/CheckoutForm.tsx`
- `src/components/profile/ProfileEditForm.tsx`
- `src/lib/email/client.ts`
- `tests/unit/utils/persian.test.ts`

## Requirements

- Replace Persian visible UI strings with concise English defaults.
- Replace API error messages with English messages that are safe to expose.
- Replace auth credential labels and errors with neutral English labels.
- Replace Iran-only phone validation with generic configurable phone validation using existing `libphonenumber-js` where appropriate.
- Keep names valid for international users. Do not require Persian characters.
- Remove Persian digit-specific utility tests or rewrite them as generic normalization tests only if the utility remains useful.
- Keep RTL support through direction config, not Persian content.

## Acceptance Criteria

- `rg -n "[\\u0600-\\u06FF]" src` returns no default UI/API/email Persian strings. Exceptions require explicit justification in the task update.
- Phone validation accepts reasonable international formats and does not require `09xxxxxxxxx`.
- Auth, checkout, profile, cart, product, admin, and payment result flows use English copy.
- Tests no longer expect Persian messages.

## Verification To Run

- `npm run verify`
- `npm run lint`
- `npm run build`
- `npm run test:unit`
- `rg -n "[\\u0600-\\u06FF]" src tests`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task007: English Copy And Validation Cleanup. Focus on remaining Persian default text, broken validation behavior, unsafe API messages, test drift, and user-facing copy quality." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with copy/validation areas changed, checks run, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task008` can proceed.

## Completion Update - 2026-05-31 Worker C

- Replaced Persian UI/API/email/test-facing text across `src` and `tests` with neutral English defaults; `rg -n "[\\u0600-\\u06FF]" src tests` is clean with no exceptions. Added a root `.ignore` so ripgrep does not scan local dependency installs under `tests/node_modules`.
- Preserved task006 locale/formatting foundations where present (`src/config/site.ts`, `src/lib/utils/format.ts`) and updated copy to use the neutral boilerplate identity.
- Replaced Iran-only phone/name behavior with generic text utilities in `src/lib/utils/text.ts`; phone validation now uses `libphonenumber-js` with `NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY` or `US` as the default country for national formats, and accepts E.164 numbers such as `+12125551234`.
- Updated auth, checkout, profile, cart, product/admin/payment-result/API/email-facing copy and rewrote affected unit expectations so tests no longer expect Persian messages.
- Checks run:
  - `npm run verify` passed.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit` passed (67 files / 635 tests).
  - `rg -n "[\\u0600-\\u06FF]" src tests` returned no matches.
  - `git diff --check` passed.
  - `npm run lint` remains blocked by existing ESLint 9 flat-config absence.
  - `npm run build` remains blocked by existing Next 16/Turbopack plus webpack config incompatibility.
- Mandatory review-mode attempt output: `/tmp/codex-review.bDLIes.txt`. The nested review started but did not produce findings or a clean completion; multiple concurrent `codex review --uncommitted` jobs were hanging on the very large shared worktree diff, so the task007 review process tree was killed after several minutes with no final review result. Re-run the task007 review loop after the concurrent review backlog clears.
- `task008` can proceed functionally from the English/default-locale surface, but strict workflow should re-run task007 review mode to completion first.

## Finalization Update - 2026-06-01 Worker L

- Fixed one valid task007 finding surfaced by the partial combined review: `getUserByPhone` now normalizes formatted phone input before querying, so phone lookup behavior matches create/profile/auth normalization.
- Added unit coverage for formatted phone lookups through `getUserByPhone('+1 (212) 555-1234')` and `getUserByIdentifier('+1 (212) 555-1234')`.
- Reconfirmed the Persian/default-copy scrub is clean: `rg -n "[\\u0600-\\u06FF]" src tests` returned no matches.
- Reconfirmed app code does not import `@/components/ui-v4` directly: `rg -n "@/components/ui-v4|components/ui-v4" src .storybook tests` returned no matches.
- Verification run during finalization:
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- services/user-service.test.ts services/auth-service.test.ts utils/text.test.ts` passed: 3 files / 25 tests.
  - Full `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit` passed: 67 files / 639 tests.
  - `npm run verify`, `npm run lint`, production build with placeholder Stripe/PayPal env, `npm run build-storybook`, and `git diff --check` passed.
- Combined tasks006-008 review-mode attempts:
  - First finalization attempt wrote partial transcript `/tmp/codex-review.87xOEC.txt` and empty wrapper log `/tmp/codex-review-task006-008-wrapper.log`; it stopped before a completed findings section but exposed the phone lookup normalization issue fixed above.
  - Post-fix attempt wrote partial transcript `/tmp/codex-review.91f4qK.txt` and empty wrapper log `/tmp/codex-review-task006-008-final-wrapper.log`; it stopped before a completed findings section. No further task007 finding was available to fix, and no tasks006-008 review process was left running.

Task007 was functionally complete with the phone lookup review finding fixed at this point, but strict review-mode cleanliness was still blocked by incomplete nested review output on the large shared dirty worktree. The later commit-based finalization below supersedes that blocker for task007.

## Commit-Based Review Finalization - 2026-06-01

- Final reviewed task commit: `b4c554f06005209d1541d0dea44e7a1840041a9d` (`task007: convert copy and validation to English defaults`).
- Review target was the exact task007 commit, not uncommitted files and not the full branch.
- Review output paths:
  - `tasks/open-source-boilerplate-conversion/reviews/task007-round1.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task007-round2.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task007-round3.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task007-round4.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task007-round5.txt`
- Round 5 reviewed final commit `b4c554f06005209d1541d0dea44e7a1840041a9d` and returned no valid findings.
- Review fixes folded into the final task commit:
  - Replaced stale E2E placeholder selectors such as `Payment`, `text`, `Shipping Code text`, `Code 6 text details`, `Product to Cart text`, `Delete of text`, and `text (1)` with current English/Persian-compatible selectors so task007 remains valid before later UI-neutralization commits replay.
  - Fixed wishlist E2E selectors that had been converted to literal `has-text("empty|خالی")` / `has-text("Delete|Clear")` strings instead of real regex or role selectors.
  - Updated checkout, auth, promo, admin, and cart E2E selectors to avoid placeholder copy while still matching the task007-era UI and later neutral UI.
- Checks run for the final task007 state:
  - `git diff --check b4c554f^ b4c554f` passed.
  - `npx tsc --noEmit --pretty false` passed.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run test:unit -- services/wishlist-service.test.ts middleware.test.ts services/user-service-queries.test.ts services/user-service-validation.test.ts services/user-service.test.ts services/auth-service.test.ts utils/text.test.ts` passed: 7 files / 106 tests.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm --prefix tests run test:e2e -- --list` passed and listed 309 tests.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run build` passed.
- Lint note: `npm run lint -- --quiet` failed before linting because the current checked-out toolchain invokes ESLint 9 against `.eslintrc.json` without a flat `eslint.config.*`; `ESLINT_USE_FLAT_CONFIG=false npm run lint -- --quiet` also failed inside the legacy config path with a circular config serialization error. This is recorded as a tooling/config issue for this commit state, not claimed as a passing check.
- Remaining task007 blockers: none from the commit-based review. Later tasks still own broader UI neutralization, CI/lint configuration, and release-readiness gates.
