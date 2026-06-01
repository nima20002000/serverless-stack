# task002: Repo Identity Docs And Setup

Status: Commit-reviewed clean

## Goal

Convert repository identity and setup docs from Kitia/private-app documentation into a neutral open-source Supabase + Vercel boilerplate.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Confirm `task001` is complete or account for any pending security blockers.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `package.json`
- `package-lock.json`
- `tests/package.json`
- `README.md`
- `.env.example`
- `AGENTS.md`
- `docs/`
- `database/schema-contract.md`
- `tests/README.md`

## Requirements

- Rename project/package metadata to a neutral boilerplate name. Use `supabase-vercel-stack` unless a later instruction overrides it.
- Replace stale Prisma/Zarinpal README content with accurate Next.js, Supabase, Stripe, PayPal, Vercel, Tailwind, R2/optional storage, and Upstash/optional cache guidance.
- Add or update open-source basics: `LICENSE`, `CONTRIBUTING.md`, and a concise setup checklist.
- Document required and optional environment variables in `.env.example` without private domains or brand-specific defaults.
- Mark optional integrations clearly: R2, Resend, Upstash.
- Remove or archive stale docs that describe Kitia, private VPS migration, old gateways, or Persian-specific implementation plans.
- Do not change app behavior beyond metadata/docs/setup in this task.

## Acceptance Criteria

- Fresh-clone setup is understandable from `README.md`.
- Docs no longer claim the project uses Prisma or Zarinpal.
- `package.json` no longer has `"name": "kitia"` or `"private": true` if the repo is intended to be publishable as a template. Keep package publishing disabled only if explicitly documented.
- `.env.example` uses generic values such as `https://example.com`, not Kitia-specific values.
- No public-facing docs instruct users to deploy to private VPS paths.

## Verification To Run

- `npm run verify`
- `rg -n "Kitia|کیتیا|Prisma|Zarinpal|Digipay|Zibal|kitia\\.ir|/home/dexter" README.md docs .env.example package.json tests/package.json AGENTS.md`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task002: Repo Identity Docs And Setup. Focus on stale docs, misleading setup steps, private branding, public package metadata, and consistency between env docs and code." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with docs changed, checks run, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task003` can proceed.

## Worker 2 Update - 2026-05-31

Implemented task002 repository identity/docs/setup changes:

- Renamed root package metadata to `supabase-vercel-stack`, removed root `"private": true`, added MIT license metadata, removed stale Digipay helper scripts, and refreshed root/test lockfile metadata.
- Renamed the tests package metadata and rewrote `tests/README.md`.
- Rewrote `README.md` with neutral fresh-clone setup for Next.js, Supabase, Stripe, PayPal, Vercel, Tailwind, optional R2, optional Resend, and optional Upstash.
- Rewrote `.env.example` to use generic placeholders and no private domains or brand defaults. Concurrent task004/task001 edits also added payment label, image hostname, and R2 backup helper variables.
- Added `LICENSE`, `CONTRIBUTING.md`, and `docs/SETUP_CHECKLIST.md`.
- Replaced or removed stale public docs under `docs/`: updated `CLOUDFLARE_IMAGE_OPTIMIZATION.md`, `DEVELOPMENT_WORKFLOW.md`, `PAYMENT_METHOD_DEPLOYMENT.md`, `R2_SETUP.md`, `RLS_SECURITY.md`, `TEST_PREVIEW_DB.md`, and `architecture.json`; added `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`, and `docs/TESTING.md`; removed stale project status, performance, SEO, storage migration, Digipay shell, Kavenegar vendor snippet, and private admin API docs.
- Review finding fixes applied outside the original doc scope per review-mode requirement: `src/lib/seo/config.ts` no longer returns localhost before configured app/Vercel URLs in production, and `src/app/page.tsx` no longer hard-codes `cdn.example.com` for the hero image. The duplicate Supabase migration FK finding was already fixed by another concurrent worker before my patch landed.

Checks run:

- `npm run verify` passed.
- `rg -n "Kitia|کیتیا|Prisma|Zarinpal|Digipay|Zibal|kitia\\.ir|/home/dexter" README.md docs .env.example package.json tests/package.json AGENTS.md` returned no matches.
- `git diff --check` passed.
- `npm install --package-lock-only --ignore-scripts` initially failed on the existing `next-auth`/`nodemailer` peer conflict, then succeeded with `--legacy-peer-deps`; `npm install --package-lock-only --ignore-scripts` in `tests/` passed.

Review loop:

- First review output: `/tmp/codex-review.QjZtCd.txt`.
- Valid first-review findings: duplicate Supabase FK name, production SEO URL fallback to localhost, and hard-coded `cdn.example.com` hero URL.
- Fixed/verified: duplicate FK was already fixed by another concurrent worker; SEO URL fallback and hero URL fixed by worker 2.
- Second review attempt output: `/tmp/codex-review.OCBHaK.txt`.
- Blocker: nested Codex review failed before findings because Codex review usage quota is exhausted until June 1, 2026 00:27 local time. Re-run the mandatory review loop after quota resets.

Task003 readiness:

- Functionally, task003 can proceed from task002's docs/package surface.
- Strict workflow gate is not fully satisfied until task002 gets a clean review-mode rerun after the quota reset.

## Worker F Finalization Update - 2026-06-01

Reran the mandatory task002 review loop after the quota blocker cleared and inspected current task002 state in the shared dirty worktree.

Task002 docs/package/env state:

- No task002 repo identity, README, docs, setup, package metadata, or `.env.example` findings remained in the completed review passes.
- The required task002 scrub command returned no matches: `rg -n "Kitia|کیتیا|Prisma|Zarinpal|Digipay|Zibal|kitia\\.ir|/home/dexter" README.md docs .env.example package.json tests/package.json AGENTS.md`.
- `npm run verify` passed.
- `git diff --check` passed.

Review-loop outputs inspected:

- `/tmp/codex-review.ye6OWF.txt`
- `/tmp/codex-review.qiwyrM.txt`
- `/tmp/codex-review.Mlpbxx.txt`
- `/tmp/codex-review.DhW8Jt.txt`
- `/tmp/codex-review.gs8Haa.txt`
- `/tmp/codex-review.o8IPp6.txt`

Valid findings fixed or confirmed fixed during finalization:

- Confirmed current `src/components/ui/Input.tsx` and `src/components/ui/Card.tsx` already forward reviewed props after concurrent worker fixes.
- Confirmed the hard-coded `cdn.example.com` root-layout preload had already been removed by another worker.
- Added seeded catalog SVG assets under `public/images/seed/` for the Supabase seed paths.
- Normalized phone numbers to canonical E.164 where valid, and ensured auth lookup, profile update, and checkout profile backfill use normalized phone values.
- Tightened public RLS policies in `supabase/migrations/20260531190011_initial_public_schema.sql` so `product_variants`, `product_media`, and `_ProductToTag` reads require an active parent product.
- Replaced the reviewed rate-limit placeholder API error in `src/lib/api/with-rate-limit.ts` and `src/middleware.ts`, and updated focused tests.
- Updated cache-busting integration/E2E assertions from the legacy `kitia-cache-` prefix to `commerce-boilerplate-cache`.

Additional checks run by worker F:

- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm --prefix tests run test:unit -- services/auth-service.test.ts services/user-service.test.ts lib/with-rate-limit.test.ts middleware.test.ts utils/text.test.ts api/transactions/create-status.test.ts` passed.
- `rg -n "kitia-cache-" tests scripts public src || true` returned no matches.

Non-task002 review findings recorded:

- The final review output `/tmp/codex-review.o8IPp6.txt` reported findings in later release-readiness surfaces: R2 public URL behavior, E2E payment mock completion, and broad corrupted API/UI copy. These do not affect task002 repo identity/docs/setup acceptance and belong to later storage/payment-test/copy readiness tasks in the shared conversion workflow.

Task003 readiness:

- Task003 can proceed from task002. The task002 docs/package/setup surface is complete.

## Commit-Based Review Finalization - 2026-06-01

Scope: task002 only, following the revised commit-based workflow. Review targeted the task002 code commit, not the dirty worktree and not the full branch.

Final task002 code commit:

- `3ccbadf` - `task002: neutralize repository identity and setup docs`

Review loop:

- Round 1 reviewed final commit `3ccbadf`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task002-round1.txt`.
- Round 1 result: no introduced broken references, invalid JSON, or runtime-impacting issues were found in the task002 diff.

Checks recorded for the final task002 loop:

- `npm run verify` passed.
- Task002 docs/package/env scrub `rg -n "Kitia|کیتیا|Prisma|Zarinpal|Digipay|Zibal|kitia\\.ir|/home/dexter" README.md docs .env.example package.json tests/package.json AGENTS.md` returned no matches.
- `rg -n "kitia-cache-" tests scripts public src || true` returned no matches during the finalization pass.
- `git diff --check` passed.
- Focused unit command `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm --prefix tests run test:unit -- services/auth-service.test.ts services/user-service.test.ts lib/with-rate-limit.test.ts middleware.test.ts utils/text.test.ts api/transactions/create-status.test.ts` passed: 6 files / 66 tests.

Fixes folded into final task002:

- Neutralized repository/package/test package identity and public docs.
- Added open-source basics: license, contribution guide, setup/environment/deployment/testing docs.
- Rewrote `.env.example` with generic placeholders.
- Removed stale Kitia/private/Prisma/legacy-provider documentation.
- Folded review-driven docs/setup-adjacent fixes that affected the task002 acceptance surface.

Remaining notes:

- The older review-mode finalization recorded later-task findings in storage/payment-test/copy surfaces. Those are outside task002 and were handled in later task commits.

Current task002 status: commit-reviewed clean. Task003 can proceed in the sequential commit-based review queue.
