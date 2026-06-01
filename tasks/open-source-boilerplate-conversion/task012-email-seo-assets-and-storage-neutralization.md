# task012: Email SEO Assets And Storage Neutralization

Status: Commit-reviewed clean

## Goal

Remove Kitia/Persian/private assumptions from emails, SEO metadata, structured data, assets, favicon, storage helpers, and optional CDN/image optimization docs.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `src/lib/email/client.ts`
- `src/lib/seo/config.ts`
- `src/lib/seo/structured-data.ts`
- `src/lib/seo/alt-text.ts`
- `src/lib/seo/og-images.ts`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/app/layout.tsx`
- `public/`
- `src/lib/cloudflare-images-client.ts`
- `src/lib/storage/`
- `scripts/check-r2-bucket.mjs`
- `docs/R2_SETUP.md`
- `docs/R2_STORAGE_READY.md`
- `docs/CLOUDFLARE_IMAGE_OPTIMIZATION.md`

## Requirements

- Rewrite email templates to English, neutral branding, LTR default, configurable site name, and shared currency/date formatting.
- Remove Persian/Kitia metadata, structured data, OG text/images, and private CDN preloads.
- Replace favicon/logo assets with neutral boilerplate assets or documented placeholders.
- Remove `BYekan` font asset if not already removed.
- Make Cloudflare R2/image optimization docs generic and optional.
- Ensure storage scripts use env vars and placeholders, not private bucket/domain defaults.
- Keep no secret values in docs/scripts.

## Acceptance Criteria

- Emails, SEO metadata, JSON-LD, sitemap/robots, and assets are neutral and configurable.
- No public asset or metadata references Kitia, private domains, Persian defaults, or removed providers.
- Optional Cloudflare/R2 setup is documented generically.

## Verification To Run

- `npm run verify`
- `npm run lint`
- `npm run build`
- `npm run test:unit -- email`
- `npm run test:unit -- storage`
- `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|BYekan|Zarinpal|Digipay|Zibal" src/lib/email src/lib/seo src/app/sitemap.ts src/app/robots.ts src/app/layout.tsx public src/lib/storage scripts docs`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task012: Email SEO Assets And Storage Neutralization. Focus on stale brand/private metadata, broken email templates, storage config safety, asset references, and optional integration docs." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with email/SEO/asset/storage changes, checks run, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task013` can proceed.

## Completion Update

- 2026-05-31 worker I: Rewrote transactional email templates in `src/lib/email/client.ts` to neutral English LTR/RTL-aware HTML and text using `siteConfig`, shared `formatPrice`, and shared `formatDateTime`; removed placeholder/brand copy from OTP, buyer confirmation, and admin notification subjects/bodies.
- Neutralized SEO/metadata assets by replacing stale OG fallback behavior with `/images/og-default.svg`, making product/organization/site JSON-LD use `siteConfig`, `siteLocale`, absolute asset URLs, `Home` breadcrumbs, `/logo.svg`, and neutral product image fallback assets.
- Replaced the product-specific favicon with neutral stack assets, regenerated `public/favicon.ico`, added `public/logo.svg`, added `public/images/og-default.svg`, and preserved/removal state for `public/fonts/BYekan.ttf`.
- Neutralized R2/storage surfaces by requiring `R2_BUCKET_NAME`, removing the `kitia-products` fallback, returning safe generic storage errors, normalizing generated public URLs, updating upload validators, making `scripts/check-r2-bucket.mjs` environment-only/generic, and documenting optional R2/Image Resizing/release scanning setup with placeholders only.
- Updated focused unit expectations for neutral email subjects and storage validation messages.
- Checks run: `npm run verify` passed; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- email` passed; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- storage` passed; required scoped scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|BYekan|Zarinpal|Digipay|Zibal" src/lib/email src/lib/seo src/app/sitemap.ts src/app/robots.ts src/app/layout.tsx public src/lib/storage scripts docs` passed with no matches; `git diff --check` passed.
- Blocked checks: `npm run lint` still fails before linting because ESLint 9 cannot find `eslint.config.(js|mjs|cjs)`; `npm run build` still fails on the existing Next 16/Turbopack custom webpack configuration conflict and invalid `next.config.js` keys `optimizeFonts`/`swcMinify`.
- Review loop: attempted the mandatory command. Output path is `/tmp/codex-review.wluA6R.txt`. The review started and traversed the full shared dirty worktree but hung before emitting findings or a completion line, matching the concurrent-review blocker noted by earlier workers; the task012 review process tree was stopped after several minutes. Re-run task012 review-mode when the worktree/review backlog is quieter.
- task013 can proceed functionally from task012 changes, but strict release readiness should rerun task012 review-mode to clean completion first.

## Finalization Update - 2026-06-01 Worker N

- Re-inspected the current email, SEO, asset, storage, R2 docs/script, CI, and release-readiness surfaces for task012/task013 scope. No additional task012 code fixes were needed.
- Checks rerun for task012 scope: `npm run verify` passed; `npm run lint` passed; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- email storage` passed (4 files / 15 tests); scoped scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|BYekan|Zarinpal|Digipay|Zibal|Snappay|sb_secret|sb_publishable_[A-Za-z0-9]|/home/dexter|nimarezapoor" src/lib/email src/lib/seo src/app/sitemap.ts src/app/robots.ts src/app/layout.tsx public src/lib/storage scripts docs .github tests package.json tests/package.json README.md SECURITY.md CONTRIBUTING.md -g '!package-lock.json' -g '!tests/package-lock.json'` returned no matches; `git diff --check` passed.
- Additional release checks covering task012/task013 interactions: full `npm run test:unit` passed (67 files / 637 tests); `npm run build` passed on retry after a transient `.next/lock` collision with another build; `npm run build-storybook` passed with existing Vite/Storybook warnings only; `npm audit --omit=dev` passed with 0 vulnerabilities.
- Combined task012/task013 review-mode attempt: ran the focused review command through `timeout --kill-after=15s 300s`. The wrapper log is `/tmp/codex-review-task012-013-finalization-wrapper.txt` and the partial nested review transcript is `/tmp/codex-review.dtdRGz.txt`. The review timed out before a completed findings section; no valid task012 finding was available to fix. Confirmed no task012/task013 review process was left running afterward.
- Remaining blockers: strict review-mode cleanliness still requires a completed task012/task013 nested review pass. Live integration/E2E/storage validation still requires a dedicated configured test environment.

## Commit-Based Review Finalization - 2026-06-01

- Final reviewed task commit: `7405ef4` (`task012: neutralize email SEO assets and storage`).
- Review target was the exact task012 commit, not uncommitted files and not the full branch.
- Review output paths:
  - `tasks/open-source-boilerplate-conversion/reviews/task012-round1.txt`
  - `tasks/open-source-boilerplate-conversion/reviews/task012-round2.txt`
- Round 1 reviewed commit `4cc6b55` and found two valid issues: the default Open Graph image used SVG instead of a crawler-safe bitmap, and R2 public URL generation could return bare object keys when `R2_PUBLIC_URL` was missing.
- The round 1 findings were fixed into task012 by adding `public/images/og-default.png`, pointing default OG/structured-data fallback images to the PNG, making R2 public URL generation fail explicitly without `R2_PUBLIC_URL`, and adding storage adapter coverage for that guard.
- Round 2 reviewed final commit `7405ef4` and returned no valid findings.
- Checks run for the final task012 state:
  - `git diff --check 7405ef4^ 7405ef4` passed.
  - `npm run verify` passed.
  - `npm run lint -- --quiet` passed.
  - `npx tsc --noEmit --pretty false` passed after the production build regenerated `.next/types`.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- email storage` passed: 4 files / 16 tests.
  - Required task012 scrub returned no matches.
  - Production build with placeholder Supabase/Auth/Stripe/PayPal env passed.
- Remaining task012 blockers: none from the commit-based review.
- Task013 is next in the sequential commit-based review queue.
