# task011: Admin Dashboard Neutralization

Status: Commit-reviewed clean

## Goal

Convert the admin dashboard into a neutral boilerplate admin UI with English copy, shared formatting, and no Kitia/Persian assumptions.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Confirm design system and copy cleanup tasks are complete.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/products/page.tsx`
- `src/app/admin/products/new/page.tsx`
- `src/app/admin/products/[id]/edit/page.tsx`
- `src/app/admin/categories/page.tsx`
- `src/app/admin/promo-codes/page.tsx`
- `src/app/admin/settings/page.tsx`
- `src/app/admin/transactions/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/users/[id]/page.tsx`
- `src/components/admin/`
- `src/services/admin-service.ts`
- `src/services/settings-service.ts`

## Requirements

- Replace Persian admin copy with clear English defaults.
- Remove Kitia-specific settings defaults, labels, placeholders, and assumptions.
- Use shared UI components and formatting utilities.
- Ensure transaction/payment fields show Stripe/PayPal provider metadata clearly.
- Ensure product/category/tag/promo/user management still uses existing API contracts.
- Keep admin layout dense, predictable, and work-focused.
- Avoid unnecessary data model changes in this UI task.

## Acceptance Criteria

- Admin UI contains no Persian text, Kitia branding, `fa-IR`, Toman labels, or private domains.
- Admin pages compile and keep existing route/API usage.
- Tables, forms, filters, pagination, bulk actions, and modals use neutral English labels.
- Payment provider/status fields are readable and not tied to removed providers.

## Verification To Run

- `npm run verify`
- `npm run lint`
- `npm run build`
- `npm run test:unit -- admin`
- `npm run test:integration -- admin`
- `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|fa-IR|تومان|Zarinpal|Digipay|Zibal" src/app/admin src/components/admin src/services/admin-service.ts src/services/settings-service.ts`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task011: Admin Dashboard Neutralization. Focus on broken admin workflows, stale provider/brand text, formatting regressions, access-control assumptions, and UI consistency." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with admin areas changed, checks run, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task012` can proceed.

## Completion Update

- 2026-05-31 worker H: Neutralized admin dashboard copy, alignment, labels, empty states, confirmations, status badges, and form helper text across admin dashboard, products, categories, promo codes, settings, transactions, users, and shared admin components. Removed admin slug-generation Persian character assumptions, replaced placeholder `text`/`details` fragments with English, switched admin UI alignment to LTR-friendly defaults, and kept product/category/tag/promo/user API contracts unchanged.
- Transaction admin rows and the transaction detail modal now show Stripe/PayPal provider labels plus provider references, Stripe payment intent IDs, PayPal order IDs, invoice numbers, and copy affordances with neutral English copy.
- Admin services now return neutral English errors; focused admin-service unit expectations were updated to match the new service messages.
- Checks run: `npm run verify` passed; admin scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|fa-IR|تومان|Zarinpal|Digipay|Zibal" src/app/admin src/components/admin src/services/admin-service.ts src/services/settings-service.ts` passed with no matches; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- admin` passed (8 files / 90 tests); `git diff --check` passed.
- Blocked checks: `npm run lint` is blocked by the existing missing ESLint 9 `eslint.config.*` flat config. `npm run build` is blocked by the existing Next 16 Turbopack/webpack config incompatibility. `npm run test:integration -- admin` is blocked without a reachable local/test Supabase database; with `sb_secret_...`-format placeholder env it fails at `Failed to connect to Supabase: Unknown error`.
- Review loop: attempted the mandatory Codex review command. Partial output was saved at `/tmp/codex-review.xfT51G.txt`; the nested review hung without producing findings while other long-running `codex review --uncommitted` processes were active on the shared dirty worktree, so worker H stopped only the task011 review process. Re-run task011 review-mode when the worktree/review backlog is quieter.
- task012 can proceed functionally from the admin surface, but the strict workflow gate should wait for a completed task011 review-mode pass.

## Finalization Update - 2026-06-01 worker M

Finalized the admin surface as part of the combined tasks009-011 pass. Fixed remaining valid admin/public management regressions where API/service messages and tests still contained broken placeholder English, including admin products, categories, tags, promo codes, settings, stats, users, transactions, bulk operations, product reorder, R2 browser, and product/media/variant management routes. Updated matching focused unit expectations and admin/product/category/promo/settings E2E selectors.

Additional checks run by worker M:

- `npm run verify` passed.
- `npm run lint` passed.
- `npm run build` passed with placeholder Supabase/Auth/Stripe/PayPal env.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- admin` passed (8 files / 90 tests).
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- products promo categories tags wishlist search` passed (17 files / 146 tests).
- Admin scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|fa-IR|تومان|Zarinpal|Digipay|Zibal" src/app/admin src/components/admin src/services/admin-service.ts src/services/settings-service.ts` returned no matches.
- Placeholder-copy scrub over scoped source/tests returned no matches.
- `timeout 90s bash -lc 'NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=sb_secret_placeholder npm run test:integration -- admin'` was attempted and failed because no reachable local/test Supabase instance is available: `Failed to connect to Supabase: Unknown error`.
- `git diff --check` passed.

Review-mode status:

- Combined tasks009-011 review attempt before final copy fixes produced partial transcript `/tmp/codex-review.8DaFNL.txt`; wrapper log `/tmp/codex-review-task009-011-wrapper.log` was empty.
- Combined rerun after source/unit fixes produced partial transcript `/tmp/codex-review.5nzj35.txt`; wrapper log `/tmp/codex-review-task009-011-final-rerun.log` was empty.
- Final short combined rerun produced partial transcript `/tmp/codex-review.p8B9Sn.txt`; wrapper log `/tmp/codex-review-task009-011-final-short.log` was empty.
- None of the worker M review transcripts reached a final findings section. The scoped issues visible in the partial transcripts were fixed, and a process-table check showed no task009-011 review process left running.

## Commit-Based Review Finalization - 2026-06-01

- Final reviewed task commit: `79c547c` (`task011: neutralize admin dashboard`).
- Review target was the exact task011 commit, not uncommitted files and not the full branch.
- Review output paths:
  - `tasks/open-source-boilerplate-conversion/reviews/task011-round1.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task011-round2.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task011-round3.txt`
- Round 1 reviewed commit `dc7ed9c` and found valid Unicode slug regressions in inline category and tag creation.
- The round 1 findings were fixed into task011 by making generated slugs preserve Unicode letters and numbers for language-neutral LTR/RTL catalog data.
- Round 2 reviewed commit `c84badf` and found valid placeholder or misleading admin API messages.
- The round 2 findings were fixed into task011 by replacing self-role, self-delete, promo validation, and related bulk-user guard messages with actionable English responses and updating matching admin unit tests.
- Round 3 reviewed final commit `79c547c` and returned no valid findings.
- Checks run for the final task011 state:
  - `git diff --check 79c547c^ 79c547c` passed.
  - `npm run verify` passed.
  - `npm run lint -- --quiet` passed.
  - `npx tsc --noEmit --pretty false` passed after the production build regenerated `.next/types`.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- admin` passed: 8 files / 90 tests.
  - Admin scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|fa-IR|تومان|Zarinpal|Digipay|Zibal|details Account details Delete text|\\berror: 'details'\\b" src/app/admin src/components/admin src/services/admin-service.ts src/services/settings-service.ts` returned no matches.
  - Production build with placeholder Supabase/Auth/Stripe/PayPal env passed.
  - `timeout 90s bash -lc 'NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=sb_secret_placeholder npm run test:integration -- admin'` was attempted and failed because no reachable local/test Supabase instance is available: `Failed to connect to Supabase: Unknown error`.
- Remaining task011 blockers: none from commit-based review. The only unpassed task011 check is environment-blocked by local Supabase availability.
- Task012 is next in the sequential commit-based review queue.
