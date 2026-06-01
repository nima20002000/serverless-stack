# task006: Locale Direction And Currency Foundation

Status: Finalized with review blocker

## Goal

Replace Persian-first locale, font, date, currency, and direction assumptions with configurable English-default settings that still support both LTR and RTL layouts.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `src/app/layout.tsx`
- `src/app/globals.css`
- `tailwind.config.ts`
- `config/tailwind.config.ts`
- `src/config/site.ts`
- `src/lib/utils/format.ts`
- `src/store/cart-store.ts`
- `src/lib/utils/persian.ts`
- files importing `date-fns-jalali`
- `package.json`
- `public/fonts/BYekan.ttf`

## Requirements

- Create or update a central locale/site configuration for `language`, `direction`, `locale`, `currency`, and display name.
- Default to English, LTR, and USD, while preserving an easy path to set RTL direction.
- Replace hard-coded `lang="fa"` and `dir="rtl"` with config-driven values.
- Replace `fa-IR`, `fa_IR`, Toman strings, and Jalali date formatting with config-driven or standard `Intl` formatting.
- Remove `date-fns-jalali` and `BYekan.ttf` if no longer used.
- Rename `src/lib/utils/persian.ts` to a neutral utility module or split digit/phone/name helpers into generic utilities.
- Keep CSS compatible with both LTR and RTL. Prefer logical spacing/alignment where feasible.

## Acceptance Criteria

- App default renders as English/LTR without Persian font dependency.
- Currency formatting works from one shared utility.
- Date formatting no longer depends on Jalali defaults.
- `rg -n "fa-IR|fa_IR|date-fns-jalali|BYekan|تومان|ریال|lang=\"fa\"|dir=\"rtl\"" src package.json tailwind.config.ts config/tailwind.config.ts public` returns no default Persian-first assumptions. Intentional RTL support may remain if config-driven and documented.

## Verification To Run

- `npm install` or `npm ci` if dependencies changed.
- `npm run verify`
- `npm run lint`
- `npm run build`
- `npm run test:unit -- format`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task006: Locale Direction And Currency Foundation. Focus on hard-coded Persian locale/currency/font assumptions, broken formatting, RTL/LTR regressions, and dependency cleanup." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with locale/formatting changes, checks run, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task007` can proceed.

## Completion Update

2026-05-31 task006 worker B:

- Added central English/LTR/USD defaults in `src/config/site.ts` for language, direction, locale, currency, display name, and time zone; `src/app/layout.tsx` now uses config-driven `lang`/`dir` and metadata.
- Reworked `src/lib/utils/format.ts` around shared `Intl` helpers for currency, number, date, and date-time formatting; updated price/date/count call sites away from `fa-IR`, Toman strings, and Jalali formatting.
- Replaced `src/lib/utils/persian.ts` with neutral `src/lib/utils/text.ts`, updated auth/checkout/profile imports and renamed the unit test to `tests/unit/utils/text.test.ts`.
- Removed the BYekan font dependency from CSS/Tailwind/public fonts and removed `date-fns-jalali` from `package.json`/`package-lock.json`; kept explicit `axios` dependency present for the PayPal client.
- Also fixed valid review-mode findings encountered in the shared worktree: restored the fixed-header spacer, avoided importing the full UI barrel from `RootLayout`, aligned the E2E smoke test with English/LTR defaults, and cleaned legacy service-worker cache prefixes.

Checks:

- `npm install --package-lock-only --ignore-scripts --legacy-peer-deps` passed.
- `npm run verify` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- format` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- text` passed.
- `git diff --check` passed.
- Required scrub `rg -n "fa-IR|fa_IR|date-fns-jalali|BYekan|تومان|تومن|ریال|lang=\"fa\"|dir=\"rtl\"|B Yekan" src package.json package-lock.json tailwind.config.ts config/tailwind.config.ts public` returned no matches.
- `npm run lint` remains blocked by the existing missing ESLint 9 flat config.
- `npm run build` remains blocked by the existing Next 16 Turbopack/webpack config conflict.
- Targeted `npx tsc --noEmit --pretty false | rg "src/app/layout.tsx|src/components/home/FeaturesSection.tsx|src/components/checkout/PromoCodeInput.tsx|tests/e2e/smoke.spec.ts"` returned no matches, but full typecheck still has repo-wide pre-existing issues.

Review-mode:

- First review output: `/tmp/codex-review.rOCS6z.txt`; valid findings fixed or already fixed by concurrent workers: promo input icon props and fixed header spacer.
- Second review output: `/tmp/codex-review.NTSvIk.txt`; valid findings fixed or already fixed by concurrent workers: RootLayout UI barrel import, smoke test locale defaults, Card `style` prop support, and seeded image assets.
- Third review output: `/tmp/codex-review.moACf5.txt`; fixed the service-worker legacy cache cleanup and confirmed middleware rate-limit copy was already fixed. One remaining finding asks `.github/workflows/deploy.yml` to add build/typecheck validation; this is outside task006 ownership and conflicts with the currently documented repo-wide build blocker, so it is left for CI/release readiness work.

Task007 can proceed functionally on copy cleanup. Strict review-mode cleanliness is not achieved because the nested reviewer continues to report cross-task CI/release findings from the shared dirty worktree.

## Finalization Update - 2026-06-01 Worker L

- Re-inspected the current locale/direction/currency surface after later task work. No additional task006 code fixes were needed.
- Confirmed `src/config/site.ts`, `src/app/layout.tsx`, and shared formatting utilities still default to English/LTR/USD through config-driven language, direction, locale, and currency values.
- Current scrubs passed with no matches:
  - `rg -n "fa-IR|fa_IR|date-fns-jalali|BYekan|تومان|تومن|ریال|lang=\"fa\"|dir=\"rtl\"|B Yekan" src package.json package-lock.json tailwind.config.ts config/tailwind.config.ts public`
  - `rg -n "[\\u0600-\\u06FF]" src tests`
- Verification run during finalization:
  - `npm run verify` passed.
  - `npm run lint` passed.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- utils/format.test.ts utils/text.test.ts` passed.
  - Full `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit` passed: 67 files / 639 tests.
  - Production build with placeholder Stripe/PayPal env passed.
  - `npm run build-storybook` passed with existing Vite/Storybook warnings.
  - `git diff --check` passed.
- Combined tasks006-008 review-mode attempts:
  - First finalization attempt wrote partial transcript `/tmp/codex-review.87xOEC.txt` and empty wrapper log `/tmp/codex-review-task006-008-wrapper.log`; it stopped before a completed findings section but exposed one valid task007 phone lookup normalization issue, fixed by Worker L.
  - Post-fix attempt wrote partial transcript `/tmp/codex-review.91f4qK.txt` and empty wrapper log `/tmp/codex-review-task006-008-final-wrapper.log`; it stopped before a completed findings section, with unrelated concurrent review processes still active on the machine. No task006 finding was available to fix, and no tasks006-008 review process was left running.

Task006 is functionally complete. Strict review-mode cleanliness remains blocked by incomplete nested review output on the large shared dirty worktree.

## Commit-Based Review Finalization - 2026-06-01

Scope: task006 only, following the revised commit-based workflow.

Final task006 code commit:
- `d7d6019` - `task006: add neutral locale and currency foundation`

Review loop:
- Rounds 1-16 reviewed successive task006 commits and produced valid findings that were folded back into the task006 commit.
- Round 17 reviewed final commit `d7d6019` and returned no discrete regressions.

Review output paths:
- `tasks/open-source-boilerplate-conversion/reviews/task006-round1.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round2.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round3.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round4.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round5.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round6.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round7.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round8.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round9.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round10.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round11.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round12.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round13.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round14.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round15.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round16.txt`
- `tasks/open-source-boilerplate-conversion/reviews/task006-round17.txt`

Fixes folded into final task006:
- Centralized neutral site config now owns language, direction, locale, display currency, display name, and time zone.
- Shared formatting uses `Intl`, the configured currency, and the configured time zone.
- Stripe and PayPal default currencies now derive from `NEXT_PUBLIC_SITE_CURRENCY` when provider-specific currency env vars are unset.
- Persian/Jalali/BYekan dependencies and active defaults were removed from the task006 surface.
- Neutral `text` utilities preserve explicit RTL support and legacy `09...` phone compatibility while defaulting national phone parsing to `US`.
- Email, promo, cart, structured-data, metadata, smoke-test, and relevant unit expectations were updated with the task006 contract.

Checks run after final amend:
- `git diff --check d7d6019^ d7d6019` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run lint -- --quiet` passed on the replayed branch.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run test:unit -- utils/format.test.ts utils/text.test.ts services/user-service.test.ts services/auth-service.test.ts` passed.
- `npm run build` passed on the replayed branch.
- Scrub passed with no matches: `rg -n "date-fns-jalali|fa-IR|fa_IR|BYekan|تومان|تومن|ریال|lang=\"fa\"|dir=\"rtl\"|B Yekan" src package.json package-lock.json tests/package.json tests/package-lock.json tailwind.config.ts config/tailwind.config.ts public --glob '!node_modules'`.

Remaining notes:
- A broad final-head unit run currently has one `tests/unit/services/user-service-queries.test.ts` expectation mismatch introduced by task007's later phone fixture change. That belongs to the upcoming task007 commit-based review loop, not task006.
- Task006 is commit-reviewed clean. Task007 can proceed.
