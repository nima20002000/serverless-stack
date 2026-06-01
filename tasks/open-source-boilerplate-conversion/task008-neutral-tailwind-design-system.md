# task008: Neutral Tailwind Design System

Status: Commit-reviewed clean

## Goal

Create a clean, neutral Tailwind design system for the boilerplate and consolidate duplicated UI component systems.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Confirm `task006` and `task007` are complete.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `src/components/ui/`
- `src/components/ui-v4/`
- `src/app/globals.css`
- `tailwind.config.ts`
- `.storybook/`
- `src/components/layout/Header.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/AdminThemeGate.tsx`

## Requirements

- Consolidate `src/components/ui` and `src/components/ui-v4` into one canonical UI surface or clearly re-export one from the other.
- Remove Kitia-specific rose/pink/girlish design language from component internals and stories.
- Define neutral Tailwind tokens for background, foreground, border, muted, primary, danger, success, warning, and focus states.
- Keep components accessible: labels, focus rings, disabled states, loading states, semantic variants.
- Keep card radius restrained and avoid nested card patterns.
- Ensure components work in LTR and RTL.
- Update Storybook stories if Storybook remains part of the boilerplate.

## Acceptance Criteria

- There is one obvious UI component import path for app code.
- Component styles are neutral and not dominated by Kitia rose/pink branding.
- Core components exist: Button, Input, Select, Alert, Modal, Card, Badge/Pill, Skeleton, Toast, Pagination/Search where needed.
- Existing pages still import valid UI components.

## Verification To Run

- `npm run verify`
- `npm run lint`
- `npm run build`
- `npm run build-storybook` if Storybook remains installed and configured.
- `rg -n "Kitia|کیتیا|girlish|rose|pink|BYekan|fa-IR" src/components src/app/globals.css tailwind.config.ts .storybook`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task008: Neutral Tailwind Design System. Focus on duplicated UI systems, broken imports, accessibility regressions, non-neutral branding, RTL/LTR support, and visual consistency." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with component decisions, checks run, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task009` can proceed.

## Completion Update - 2026-05-31

- Component decision: `@/components/ui` is now the canonical app import surface. Added canonical `Badge`, `Pill`, `Toast`, and `index.ts` exports; moved app/shared imports off `@/components/ui-v4`; kept `src/components/ui-v4` as a compatibility implementation layer.
- Design tokens: replaced the root Tailwind/global rose/BYekan defaults with neutral CSS-variable tokens for `background`, `foreground`, `border`, `muted`, `primary`, `danger`, `success`, `warning`, and `ring`/focus states. Core UI components now use restrained radii, token-based focus rings, disabled/loading states, and logical text/alignment classes for LTR/RTL.
- Stories: removed duplicate `ui-v4` stories and refreshed canonical `src/components/ui` stories with neutral English examples. Storybook config now filters Storybook's broken Vite mocker-runtime injection because these stories do not use module mocks.
- Checks run:
  - `npm run verify` passed.
  - `npm run lint` blocked by existing ESLint 9 flat-config absence (`eslint.config.js` missing).
  - `npm run build` blocked by existing Next 16/Turbopack + webpack config incompatibility.
  - `npm run build-storybook` passed after Storybook config cleanup.
  - Task-owned scrub `rg -n "rose|pink|girlish|Kitia|کیتیا|BYekan|fa-IR|[\\u0600-\\u06FF]" src/components/ui src/components/ui-v4 .storybook src/app/globals.css tailwind.config.ts` passed with no matches.
  - Required broad scrub still reports rose styling in product/cart/wishlist/profile/admin/public components owned by task009-task011, not in the canonical UI system.
  - `git diff --check` passed.
- Review loop:
  - First completed review output: `/tmp/codex-review.BueC6M.txt`.
  - Valid task008 finding fixed: canonical `src/components/ui/Input.tsx` now exposes `icon` and `iconPosition` and forwards props to `InputV4`.
  - Second review rerun was attempted and wrote partial output to `/tmp/codex-review.e0Ggjr.txt`, but it hung while reviewing unrelated concurrent task diffs in the shared dirty worktree; the stuck process was stopped so no background task008 review remains.
  - Other findings in the first review concerned root layout placeholder preloads and CI workflow coverage from other task scopes/concurrent workers; not changed under task008 ownership.
- Task009 can proceed functionally from the design-system surface. Strict process gate should rerun task008 review-mode once the shared worktree is quieter.

## Finalization Update - 2026-06-01 Worker L

- Re-inspected the current neutral Tailwind/UI system after later task work. No additional task008 code fixes were needed.
- Confirmed `@/components/ui` remains the canonical app import surface; direct `@/components/ui-v4` imports are absent outside canonical wrapper internals.
- Current task-owned design scrub passed with no matches:
  - `rg -n "rose|pink|girlish|Kitia|کیتیا|BYekan|fa-IR|[\\u0600-\\u06FF]" src/components/ui src/components/ui-v4 .storybook src/app/globals.css tailwind.config.ts`
- Verification run during finalization:
  - `npm run verify` passed.
  - `npm run lint` passed.
  - Full `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit` passed: 67 files / 639 tests.
  - Production build with placeholder Stripe/PayPal env passed.
  - `npm run build-storybook` passed with existing Vite sourcemap, `"use client"`, Browserslist, and chunk-size warnings.
  - `git diff --check` passed.
- Combined tasks006-008 review-mode attempts:
  - First finalization attempt wrote partial transcript `/tmp/codex-review.87xOEC.txt` and empty wrapper log `/tmp/codex-review-task006-008-wrapper.log`; it stopped before a completed findings section and surfaced no task008 finding.
  - Post-fix attempt wrote partial transcript `/tmp/codex-review.91f4qK.txt` and empty wrapper log `/tmp/codex-review-task006-008-final-wrapper.log`; it stopped before a completed findings section. No task008 finding was available to fix, and no tasks006-008 review process was left running.

Task008 was functionally complete at this point, but strict review-mode cleanliness was still blocked by incomplete nested review output on the large shared dirty worktree. The later commit-based finalization below supersedes that blocker for task008.

## Commit-Based Review Finalization - 2026-06-01

- Final reviewed task commit: `b7e7c0a` (`task008: neutralize Tailwind design system`).
- Review target was the exact task008 commit, not uncommitted files and not the full branch.
- Review output paths:
  - `tasks/open-source-boilerplate-conversion/reviews/task008-round1.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task008-round2.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task008-round3.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task008-round4.txt`
- Round 4 reviewed final commit `b7e7c0a` and returned no valid findings.
- Review fixes folded into the final task commit:
  - Migrated remaining task008-era `PillV4` callers to the canonical `@/components/ui/Pill` import and supported neutral tones, so the isolated task008 commit typechecks before later storefront work.
  - Replaced placeholder API rate-limit fallback copy and product-variant admin alert/confirm copy.
  - Restored blob animation utilities that were still referenced by the task008-era products hero.
  - Changed `SearchBar` icon and clear-button positioning to logical `start`/`end` and `ps`/`pe` classes for RTL mirroring.
  - Preserved legacy build-version key migration while storing the neutral cache key.
  - Changed the modal backdrop away from `bg-foreground/30`, which was too light in dark mode.
  - Generated unique input IDs unless callers explicitly pass an `id`, avoiding duplicate DOM IDs for repeated field names.
- Checks run for the final task008 state:
  - `git diff --check b7e7c0a^ b7e7c0a` passed.
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run verify` passed.
  - `npm run lint -- --quiet` passed.
  - `rg -n "rose|pink|girlish|Kitia|کیتیا|BYekan|fa-IR|[\\u0600-\\u06FF]" src/components/ui src/components/ui-v4 .storybook src/app/globals.css tailwind.config.ts` returned no matches.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US STRIPE_SECRET_KEY=sk_test_placeholder NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder STRIPE_WEBHOOK_SECRET=whsec_placeholder PAYPAL_CLIENT_ID=paypal-client-id-placeholder PAYPAL_CLIENT_SECRET=paypal-client-secret-placeholder PAYPAL_WEBHOOK_ID=paypal-webhook-id-placeholder PAYPAL_ENV=sandbox PAYMENT_SITE_NAME="Supabase Vercel Stack" npm run build` passed.
  - `npm run build-storybook` passed with existing Vite sourcemap, `"use client"`, Browserslist, and chunk-size warnings.
- Attempted focused hook test:
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- unit/hooks/useVersionCheck.test.tsx` did not run because the current Vitest config includes `unit/**/*.test.ts` and excludes `.test.tsx` files. No passing result is claimed for that command.
- Remaining task008 blockers: none from the commit-based review. Broader release scrub still belongs to later task/release-readiness commits.
