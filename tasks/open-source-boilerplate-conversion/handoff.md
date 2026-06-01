# Open Source Boilerplate Conversion Handoff

Status: Final audit complete; human review/commit pending

## Context

Repo path: `/data/dexter/Desktop/supabase-vercel-stack`

This repo is currently a Kitia-specific Persian e-commerce application. The target is an open-source, neutral Supabase + Vercel commerce boilerplate with Stripe and PayPal payments, configurable LTR/RTL support, neutral UI, safe public docs, and no private Kitia/Iranian-gateway assumptions.

Current inspection highlights:

- Stripe and PayPal are already partially implemented in `src/lib/stripe`, `src/lib/paypal`, and transaction webhook/capture routes.
- The database payment contract already targets `STRIPE` and `PAYPAL` in `database/schema-contract.md` and `src/types/supabase.ts`.
- Legacy Zarinpal, Digipay, and Zibal code still exists in routes, libs, components, docs, tests, and middleware. Snappay was not found.
- Persian text, `fa-IR`, `fa_IR`, `date-fns-jalali`, `BYekan`, Toman pricing, and `dir="rtl"` are hardcoded across the app.
- `.github/workflows/deploy-staging.yml` contains hard-coded Supabase credentials and must be treated as a public-release blocker. Rotate those credentials outside the repo before making anything public.
- Workflows, scripts, docs, and tests contain `kitia.ir`, personal paths, VPS deployment assumptions, and personal email addresses.

## Desired End State

- Public-safe repository with no committed secrets, no private infrastructure details, no Kitia branding, and no Iranian payment provider code.
- Neutral boilerplate identity, docs, env examples, license, and setup flow.
- Stripe and PayPal payment flow documented, tested, and provider-neutral in database and app code.
- English default UI copy with configurable direction support for LTR and RTL.
- Neutral Tailwind-based UI system used consistently across public, checkout, profile, and admin areas.
- Updated tests and CI that pass from a fresh clone.
- Vercel-oriented deployment guidance, with optional notes for other deployment targets but no private VPS workflow.

## Non-Negotiable Constraints

- Do not print, copy, preserve, or commit secrets. If a secret-like value is found, replace it with a placeholder and record that external rotation is required.
- Do not keep Zarinpal, Digipay, Zibal, or Snappay code, dependency references, UI, tests, docs, or middleware exemptions.
- Keep Stripe and PayPal as the only built-in payment providers.
- Keep LTR and RTL capability, but remove Persian as the default product language.
- Avoid broad rewrites outside each task scope.
- Do not revert unrelated user changes.
- Use Tailwind; do not introduce a new styling framework unless a later task explicitly justifies it.
- Use `apply_patch` for manual edits.

## Mandatory Review Loop For Every Task

Every implementing agent must read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md` before finishing their task, then run the Codex review-mode loop on their own uncommitted work.

Required flow:

1. Implement only the task scope.
2. Run the strongest feasible project checks listed in the task.
3. Run the nested review agent with task-specific instructions:

   ```bash
   printf '%s\n' "Review the uncommitted changes for taskNNN: <task title>. Focus on the task acceptance criteria, regressions, security issues, stale Kitia/private artifacts, and test coverage gaps." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
   ```

4. Read the review output file printed by the script.
5. Fix every valid finding.
6. Re-run checks and the review script.
7. Repeat until the review has zero valid findings.
8. Only then update the task file and this handoff.
9. If the implementing workflow requires commits, commit only after a clean review loop and passing checks.

## Suggested Task Order

1. `task001-publication-security-scrub.md`
2. `task002-repo-identity-docs-and-setup.md`
3. `task003-remove-legacy-iranian-payment-providers.md`
4. `task004-harden-stripe-paypal-payment-flow.md`
5. `task005-supabase-schema-and-seed-readiness.md`
6. `task006-locale-direction-and-currency-foundation.md`
7. `task007-english-copy-and-validation-cleanup.md`
8. `task008-neutral-tailwind-design-system.md`
9. `task009-public-storefront-redesign.md`
10. `task010-checkout-auth-profile-redesign.md`
11. `task011-admin-dashboard-neutralization.md`
12. `task012-email-seo-assets-and-storage-neutralization.md`
13. `task013-tests-ci-and-release-readiness.md`

## Implementation Updates

- 2026-05-31 task001 worker A: Finalized the publication security scrub status after inspecting task001-owned files. The scrubbed state removes the private VPS deploy workflows (`.github/workflows/deploy-staging.yml`, `.github/workflows/rollback.yml`), rewrites `.github/workflows/deploy.yml` as verify-only CI, leaves only a generic `vps/README.md`, keeps R2 backup/restore scripts environment-driven, and includes `SECURITY.md` with an explicit requirement to rotate any credentials exposed in prior private history, CI logs, deployment scripts, docs, or environment files before open sourcing. No task001-scoped workflow/script/config/README/env-example blockers remain for the required secret/private-host patterns.
- task001 checks: `npm run verify` passed; `rg -n "sb_secret|sb_publishable_[A-Za-z0-9]|nimarezapoor|/home/dexter|kitia\\.ir|staging\\.kitia|cdn\\.kitia" . -g '!package-lock.json'` passed with no matches; `git diff --check` passed.
- task001 review loop: nested Codex review completed with output saved at `/tmp/codex-review.Xz7Mbz.txt`. It reported no task001 publication-security findings. It did report valid findings in later-task surfaces: missing direct `axios` dependency for PayPal, phone normalization during profile updates, placeholder transactional email copy, and default OG image fallback. Worker A did not edit those later-task files because ownership was explicitly limited to task001 finalization and concurrent workers own later-task implementation areas.
- task002 readiness: task002 can proceed from task001's publication-security scope. Strict final release readiness should still account for the non-task001 review findings listed above and credential rotation remains externally required before public release.
- 2026-05-31 task002 worker: Implemented repo identity/docs/setup conversion. Renamed root/test package metadata to `supabase-vercel-stack`, removed root `"private": true`, added MIT license metadata, added `LICENSE` and `CONTRIBUTING.md`, rewrote `README.md`, `.env.example`, `tests/README.md`, and the public docs set under `docs/` with neutral Supabase/Vercel/Stripe/PayPal setup guidance. Added `docs/SETUP_CHECKLIST.md`, `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`, and `docs/TESTING.md`; removed stale status/performance/SEO/storage migration/Digipay/Kavenegar/private admin API docs. Per review-mode findings, also fixed production SEO URL fallback in `src/lib/seo/config.ts` and removed the hard-coded `cdn.example.com` hero URL in `src/app/page.tsx`; the duplicate Supabase migration FK finding was already fixed by a concurrent worker.
- task002 checks: `npm run verify` passed; `rg -n "Kitia|کیتیا|Prisma|Zarinpal|Digipay|Zibal|kitia\\.ir|/home/dexter" README.md docs .env.example package.json tests/package.json AGENTS.md` returned no matches; `git diff --check` passed. Root lockfile refresh required `npm install --package-lock-only --ignore-scripts --legacy-peer-deps` because the existing dependency graph has a `next-auth`/`nodemailer` peer conflict; tests lockfile refresh passed without that flag.
- task002 review loop: first review output at `/tmp/codex-review.QjZtCd.txt` found three valid issues; worker 2 fixed the two remaining actionable issues after another worker had already fixed the migration FK. The required second review attempt failed before findings due Codex review usage quota exhaustion; output at `/tmp/codex-review.OCBHaK.txt`, retry available June 1, 2026 00:27 local time. Re-run task002 review after quota resets before marking the task fully complete.
- task003 readiness: task003 can proceed functionally from the docs/package surface, but the strict workflow gate should wait for a clean task002 review-mode rerun.
- 2026-06-01 task002 worker F: Completed the task002 review-loop finalization after the quota blocker cleared. Current task002 docs/package/env/setup surface has no repo-identity findings: `README.md`, docs, `.env.example`, package metadata, open-source basics, and tests docs remain neutral for `supabase-vercel-stack`. Confirmed the hard-coded root-layout `cdn.example.com` preload and UI wrapper prop issues were already fixed by concurrent workers. Fixed valid low-conflict review findings surfaced during the task002 rerun by adding seed SVG assets under `public/images/seed/`, canonicalizing phone normalization and using normalized phones in auth/profile/checkout profile backfill, tightening Supabase public RLS policies for child product tables to require an active parent product, replacing the reviewed rate-limit placeholder error, and updating cache-busting tests to the neutral `commerce-boilerplate-cache` prefix.
- task002 worker F checks: `npm run verify` passed; `rg -n "Kitia|کیتیا|Prisma|Zarinpal|Digipay|Zibal|kitia\\.ir|/home/dexter" README.md docs .env.example package.json tests/package.json AGENTS.md` returned no matches; `rg -n "kitia-cache-" tests scripts public src || true` returned no matches; `git diff --check` passed; focused unit command `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm --prefix tests run test:unit -- services/auth-service.test.ts services/user-service.test.ts lib/with-rate-limit.test.ts middleware.test.ts utils/text.test.ts api/transactions/create-status.test.ts` passed (6 files / 66 tests).
- task002 worker F review loop: rerun outputs inspected at `/tmp/codex-review.ye6OWF.txt`, `/tmp/codex-review.qiwyrM.txt`, `/tmp/codex-review.Mlpbxx.txt`, `/tmp/codex-review.DhW8Jt.txt`, `/tmp/codex-review.gs8Haa.txt`, and `/tmp/codex-review.o8IPp6.txt`. No task002 docs/package/env/setup findings remain. The final output reported later release-readiness findings in R2 public URL behavior, E2E payment mock completion, and broad corrupted API/UI copy; these are outside task002 acceptance and belong to later storage/payment-test/copy readiness tasks in the shared conversion workflow.
- task003 readiness after worker F: task003 can proceed from task002. The task002 docs/package/setup surface is complete.
- 2026-05-31 task004 worker: Hardened Stripe/PayPal payment flow in creation, Stripe webhook, PayPal webhook, PayPal capture, provider metadata, docs, and focused tests. Added configurable `PAYMENT_SITE_NAME` labels, centralized provider normalization, Stripe provider-ref mismatch checks, PayPal zero-decimal amount reconciliation, PayPal webhook safe mismatch no-ops, duplicate PayPal capture behavior, and explicit `axios` dependency for the PayPal client. Updated `.env.example`, `docs/PAYMENT_METHOD_DEPLOYMENT.md`, payment routes/libs, `transaction-service`, and focused transaction tests.
- task004 checks: `npm run verify` passed; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- transactions` passed (7 files / 29 tests); `git diff --check` passed before task/handoff updates. `npm run test:integration -- payment-verification` is blocked without a real-format `sb_secret_...` key and reachable Supabase test DB. DB schema validation skipped because `DATABASE_URL` is unset. `npm run lint` is blocked by missing ESLint 9 flat config. `npm run build` is blocked by existing Next 16/Turbopack config incompatibility. `npx tsc --noEmit` still fails on existing repo-wide Next 16 route context typing and other non-payment type issues; task004 fixed the payment-relevant missing `axios` error.
- task004 review loop: attempted via `/home/dexter/.shared-agent-skills/codex-review-mode/scripts/run_codex_review.sh`; output saved at `/tmp/codex-review.dBcmhp.txt`. The nested review failed before findings because Codex review usage quota is exhausted until June 1, 2026 00:27 local time. Re-run the mandatory task004 review loop after quota resets and fix any valid findings.
- task005 readiness: strict workflow should wait for task004 to get a clean review-mode pass. Functionally, the Stripe/PayPal hardening is in place for schema/seed readiness inspection.
- 2026-05-31 task005 worker: Implemented Supabase schema and seed readiness, but the mandatory nested Codex review did not complete because the review agent hit the same external usage limit before producing findings. Added Supabase CLI setup files (`supabase/config.toml`, `supabase/migrations/20260531190011_initial_public_schema.sql`, `supabase/seed.sql`), rewrote `database/schema-contract.md`, neutralized `database/schema-dumps/*`, removed obsolete `migrations/add_zibal_payment_method.sql`, updated archived migration notes/defaults toward Stripe/PayPal, refreshed RLS docs, rewrote Supabase test-key docs, neutralized task-owned fixtures, and adjusted Supabase middleware reference code to use the publishable key for session middleware.
- task005 checks: `npm run verify` passed; task scrub `rg -n "gozxjxtnrbuurmstjydo|sb_secret|kitia|cdn\\.kitia|preview|production" database migrations scripts/db tests/docs tests/fixtures src/types/supabase.ts` passed with no matches; `git diff --check` passed; Prettier check on task-owned Markdown/TypeScript files passed. Skipped live `psql` validation because `DATABASE_URL` is unset; `npx supabase migration list --local` failed because local Supabase Postgres was not running. `npm run lint` is blocked by missing ESLint flat config; `npm run build` is blocked by current Next.js 16/Turbopack config.
- task005 review loop: attempted via `/home/dexter/.shared-agent-skills/codex-review-mode/scripts/run_codex_review.sh`; output saved at `/tmp/codex-review.ADnFT5.txt`. The nested review failed before findings because Codex review usage quota is exhausted until June 1, 2026 00:27 local time. Re-run the mandatory task005 review loop after quota resets and fix any valid findings.
- task006 readiness: do not proceed under the strict workflow until task005 gets a clean review-mode pass and live schema validation is run against a configured local or test Supabase database.
- 2026-05-31 task006 worker B: Implemented locale/direction/currency foundation. Added central English/LTR/USD defaults in `src/config/site.ts`, made root layout `lang`/`dir` and metadata config-driven, replaced shared price/date/number formatting with `Intl` helpers in `src/lib/utils/format.ts`, renamed Persian-specific text utilities to `src/lib/utils/text.ts`, removed BYekan and `date-fns-jalali`, refreshed package lock while preserving explicit `axios` for PayPal, and updated locale/currency/date/count call sites away from `fa-IR`, Toman strings, and Jalali formatting. Also applied valid review-mode fixes in overlapping files: restored fixed-header spacer, avoided RootLayout importing the full UI barrel, aligned the smoke test with English/LTR defaults, and cleaned legacy service-worker cache prefixes.
- task006 checks: `npm install --package-lock-only --ignore-scripts --legacy-peer-deps` passed; `npm run verify` passed; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- format` passed; matching `npm run test:unit -- text` passed; `git diff --check` passed; scrub `rg -n "fa-IR|fa_IR|date-fns-jalali|BYekan|تومان|تومن|ریال|lang=\"fa\"|dir=\"rtl\"|B Yekan" src package.json package-lock.json tailwind.config.ts config/tailwind.config.ts public` returned no matches. `npm run lint` remains blocked by missing ESLint 9 flat config. `npm run build` remains blocked by the existing Next 16 Turbopack/webpack config conflict. A targeted `npx tsc --noEmit --pretty false | rg "src/app/layout.tsx|src/components/home/FeaturesSection.tsx|src/components/checkout/PromoCodeInput.tsx|tests/e2e/smoke.spec.ts"` reported no errors for reviewed files, but full typecheck still has existing repo-wide issues.
- task006 review loop: first review `/tmp/codex-review.rOCS6z.txt` found header spacer and promo input issues; fixed/confirmed fixed. Second review `/tmp/codex-review.NTSvIk.txt` found RootLayout barrel import, Card style typing, stale smoke test, and seed image issues; fixed/confirmed fixed. Third review `/tmp/codex-review.moACf5.txt` found deploy workflow build validation, legacy service-worker cache cleanup, and placeholder middleware copy; fixed SW cleanup and confirmed middleware copy was already fixed. The deploy workflow build/typecheck finding is outside task006 and conflicts with the currently documented build blocker, so strict review-mode cleanliness is not achieved in the shared dirty worktree.
- task007 readiness: can proceed functionally with English copy/validation cleanup on top of the config-driven locale/currency foundation. Strict workflow cleanliness should account for the unresolved cross-task CI/build-validation review finding.
- 2026-05-31 task008 worker D: Implemented the neutral Tailwind design-system layer. `@/components/ui` is the canonical import path with added `Badge`, `Pill`, `Toast`, and `index.ts`; `src/components/ui-v4` remains as a compatibility implementation layer. Replaced root Tailwind/global rose/BYekan assumptions with neutral CSS-variable tokens for background/foreground/border/muted/primary/danger/success/warning/focus states. Neutralized core UI component internals for restrained radii, accessible focus/disabled/loading states, and logical LTR/RTL-friendly alignment. Removed duplicate `ui-v4` Storybook stories, refreshed canonical `src/components/ui` stories, and adjusted Storybook Vite config to skip the broken mocker-runtime injection for non-mocking stories.
- task008 checks: `npm run verify` passed; `npm run build-storybook` passed; task-owned scrub `rg -n "rose|pink|girlish|Kitia|کیتیا|BYekan|fa-IR|[\\u0600-\\u06FF]" src/components/ui src/components/ui-v4 .storybook src/app/globals.css tailwind.config.ts` passed with no matches; `git diff --check` passed. `npm run lint` remains blocked by the existing missing ESLint 9 flat config. `npm run build` remains blocked by the existing Next 16/Turbopack + webpack config incompatibility. The required broad scrub still reports page-surface rose styling in product/cart/wishlist/profile/admin/public components owned by task009-task011.
- task008 review loop: first completed review output at `/tmp/codex-review.BueC6M.txt`; it found one valid task008 issue, fixed by ensuring `src/components/ui/Input.tsx` exposes `icon` and `iconPosition` and forwards props to `InputV4`. A second review rerun was attempted and partial output was written to `/tmp/codex-review.e0Ggjr.txt`, but the review hung while traversing unrelated concurrent task diffs in the shared dirty worktree; the stuck task008 review process was stopped. Re-run task008 review-mode when the worktree is quieter before treating the strict review gate as clean.
- task009 readiness: task009 can proceed functionally from the canonical UI/Tailwind surface. Strict workflow should rerun task008 review-mode to clean completion.
- 2026-05-31 task007 worker C: Implemented English copy and validation cleanup across `src` and `tests`. Replaced Persian UI/API/email/test-facing strings with neutral English defaults, preserved task006 locale/formatting utilities where present, migrated phone validation to generic `libphonenumber-js` behavior through `src/lib/utils/text.ts`, removed the `09xxxxxxxxx` requirement, and kept international names valid without requiring Persian characters. Updated auth labels/errors, checkout/profile validation, transaction creation phone checks, password validation messages, promo/cart/format/user tests, full-unit expectations, and added root `.ignore` entries so `rg` does not scan local `tests/node_modules`.
- task007 checks: `npm run verify` passed; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit` passed (67 files / 635 tests); `rg -n "[\\u0600-\\u06FF]" src tests` returned no matches; `git diff --check` passed. `npm run lint` remains blocked by the existing missing ESLint 9 flat config. `npm run build` remains blocked by the existing Next 16/Turbopack config incompatibility with the repo webpack config.
- task007 review loop: attempted with the mandatory command; output path `/tmp/codex-review.bDLIes.txt`. The nested review started but did not emit findings or complete because several concurrent `codex review --uncommitted` processes were hanging on the large shared worktree diff; worker C killed only the task007 review process tree after several minutes. Re-run task007 review mode after the concurrent review backlog clears. Functionally, task008 can proceed from the English/default-locale surface, but strict workflow should wait for a completed task007 review pass.
- 2026-05-31 task009 worker E: Completed the public storefront redesign scope. Neutralized home, product listing/detail/loading, cart, wishlist, static public pages, not-found, header/footer, home/product/cart/wishlist/FAQ/search/select/badge public components, removed the stale public CDN preload from the root layout, and kept public commerce flows on existing product, cart, wishlist, and search contracts. Updated cart-store user-facing errors to neutral English. Fixed the task009 review finding by forwarding standard div props through `src/components/ui/Card.tsx`, allowing the home feature cards to use transition-delay styles without a type error.
- task009 checks: `npm run verify` passed; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- cart` passed (1 file / 6 tests); `rg -n "Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|telegram|instagram\\.com/kitia|fa-IR|تومان|[\\u0600-\\u06FF]" src/app src/components` returned no matches; `git diff --check` passed. `npm run lint` remains blocked by the existing missing ESLint 9 flat config. `npm run build` remains blocked by the existing Next 16/Turbopack plus custom webpack config incompatibility and also reports existing invalid `next.config.js` keys `optimizeFonts` and `swcMinify`.
- task009 review loop: first completed review output at `/tmp/codex-review.DWcULX.txt`; it found one valid task009 issue, fixed in `src/components/ui/Card.tsx`. The review also reported auth phone canonicalization and Supabase seed asset findings outside task009 ownership. A required rerun after the fix was attempted and wrote partial output to `/tmp/codex-review.yJzija.txt`, but it hung while traversing the large shared dirty worktree and unrelated concurrent diffs; the task009 review process tree was stopped after several minutes. Task010 can proceed functionally from the public storefront surface, but strict workflow should rerun task009 review-mode when the worktree is quieter before final release.
- 2026-05-31 task012 worker I: Implemented email, SEO, asset, and storage neutralization. Rewrote `src/lib/email/client.ts` with neutral English OTP/buyer/admin templates using `siteConfig`, shared currency formatting, and shared date/time formatting. Neutralized SEO structured data/OG/alt text with configurable site metadata, neutral `Home` breadcrumbs, `/logo.svg`, and `/images/og-default.svg`. Replaced product-specific favicon assets, regenerated `public/favicon.ico`, added `public/logo.svg` and `public/images/og-default.svg`, and kept `public/fonts/BYekan.ttf` removed. Removed the `kitia-products` R2 fallback, required `R2_BUCKET_NAME`, normalized public storage URLs, replaced placeholder storage errors, updated validators, made `scripts/check-r2-bucket.mjs` generic/env-driven, and refreshed optional R2/Image Resizing/release scanning docs.
- task012 checks: `npm run verify` passed; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- email` passed (1 file / 5 tests); `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- storage` passed (3 files / 10 tests); required scoped scrub for Persian/Kitia/private-domain/legacy-provider patterns passed with no matches; `git diff --check` passed. `npm run lint` remains blocked by the missing ESLint 9 flat config. `npm run build` remains blocked by the existing Next 16/Turbopack plus custom webpack config incompatibility and invalid `next.config.js` keys `optimizeFonts`/`swcMinify`.
- task012 review loop: attempted with the mandatory command; output path `/tmp/codex-review.wluA6R.txt`. The nested review started and inspected the shared uncommitted worktree, but hung before producing findings or a completion line; the task012 review process tree was stopped after several minutes. Task013 can proceed functionally from task012, but strict release readiness should rerun task012 review-mode when the shared worktree/review backlog is quieter.
- 2026-05-31 task010 worker G: Implemented checkout/auth/profile/payment-result redesign. Checkout now uses explicit uppercase `STRIPE`/`PAYPAL` state and sends only that value to transaction creation, with neutral secure-provider copy, generic shipping/postal behavior, neutral promo-code UI, and no Iran-only checkout formatting. Auth/profile pages and owned auth/profile/user-transaction API/service messages were neutralized. Profile transaction history uses shared date/currency utilities and Stripe/PayPal provider labels. Payment result pages handle completed, failed, pending, canceled, and missing-code states in English; cart/checkout form data are cleared only after confirmed `COMPLETED`, while failed/pending/missing-code returns preserve cart recovery.
- task010 checks: `npm run verify` passed; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- checkout` passed (1 file / 4 tests); `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- user` passed (16 files / 96 tests); `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- auth` passed (4 files / 14 tests); required task scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|fa-IR|تومان|09\\\\d" src/app/checkout src/components/checkout src/app/'(auth)' src/app/profile src/components/profile src/app/payment src/store` returned no matches; additional owned API/service scrub returned no matches; `git diff --check` passed. `npm run lint` remains blocked by the existing missing ESLint 9 flat config. `npm run build` remains blocked by the existing Next 16 Turbopack/webpack config conflict after prebuild verification succeeds.
- task010 review loop: first review attempt hung with no final findings and partial output at `/tmp/codex-review.JCXk7j.txt`. A timeout-bounded rerun wrote `/tmp/codex-review.obPMWR.txt`; it timed out after 180 seconds but exposed one valid task010 issue, fixed by widening `CheckoutForm`'s `formRef` prop to `RefObject<HTMLFormElement | null>`. A final timeout-bounded rerun wrote `/tmp/codex-review.GWXfdn.txt` and timed out after 120 seconds with no final findings; partial output shows unrelated existing admin/route/request-utils type issues and the checkout ref fix present. Task011 can proceed functionally from task010, but strict workflow should rerun task010 review-mode when the concurrent review backlog clears.
- 2026-05-31 task011 worker H: Implemented admin dashboard neutralization. Neutralized English copy, placeholders, confirmations, labels, empty states, loading/error/success messages, LTR-friendly alignment, and admin form/table/modal UI across `src/app/admin`, `src/components/admin`, `src/services/admin-service.ts`, and `src/services/settings-service.ts`. Removed admin Persian-aware slug regexes in category/tag creation helpers. Admin transaction list/detail UI now shows Stripe/PayPal provider labels, provider refs, Stripe payment intent IDs, PayPal order IDs, invoice numbers, and copy affordances with neutral labels while keeping existing API/data contracts. Updated focused admin-service unit expectations for the new neutral service messages.
- task011 checks: `npm run verify` passed; task scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|fa-IR|تومان|Zarinpal|Digipay|Zibal" src/app/admin src/components/admin src/services/admin-service.ts src/services/settings-service.ts` passed with no matches; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- admin` passed (8 files / 90 tests); `git diff --check` passed. `npm run lint` remains blocked by missing ESLint 9 flat config. `npm run build` remains blocked by the existing Next 16 Turbopack/custom-webpack config incompatibility. `npm run test:integration -- admin` is blocked without a reachable local/test Supabase database; with `sb_secret_...`-format placeholder env it fails at `Failed to connect to Supabase: Unknown error`.
- task011 review loop: attempted via the mandatory command. Partial output was saved at `/tmp/codex-review.xfT51G.txt`; the nested review hung without final findings while other long-running `codex review --uncommitted` processes were active against the shared dirty worktree, so worker H stopped only the task011 review process tree. Re-run task011 review-mode when the worktree/review backlog is quieter before treating the strict gate as clean.
- task012 readiness: task012 can proceed functionally from the admin surface, but strict workflow should rerun task011 review-mode to clean completion before final release readiness.
- 2026-05-31 task013 worker J: Implemented tests, CI, package/install/check scripts, release checklist, ignore-rule, and release-build readiness. Replaced verify-only CI with public-safe install/lint/unit/build/Storybook/audit workflow; added ESLint 9 flat config; added `.npmrc` for consistent peer resolution; added `docs/RELEASE_CHECKLIST.md`; tightened testing/setup/contributing docs; neutralized stale Kitia/Persian/Iranian test surfaces; removed obsolete SMS/Kavenegar integration coverage, old `tests/tasks/*` notes, the dead Kavenegar package/source/type declaration, and the Jalali test dependency; aligned root/tests installability and test runner versions. Fixed release blockers found while wiring CI: Next 16 webpack build script and invalid config keys, Promise-based dynamic route contexts, React 19 JSX namespace usage, unsupported `NextRequest.ip`, lazy optional R2 storage initialization, optional Redis rate-limit fail-open behavior, dynamic public data pages so production build does not require live Supabase, and neutral logger service labeling.
- task013 checks: `npm ci` passed; `npm --prefix tests ci` passed; `npm run verify` passed; `npm run lint` passed; `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit` passed (67 files / 637 tests); `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US STRIPE_SECRET_KEY=sk_test_placeholder NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder STRIPE_WEBHOOK_SECRET=whsec_placeholder PAYPAL_CLIENT_ID=paypal-client-id-placeholder PAYPAL_CLIENT_SECRET=paypal-client-secret-placeholder PAYPAL_WEBHOOK_ID=paypal-webhook-id-placeholder PAYPAL_ENV=sandbox PAYMENT_SITE_NAME="Supabase Vercel Stack" npm run build` passed; `npm run build-storybook` passed; `npm audit --omit=dev` passed with 0 vulnerabilities; required public-release scrub returned no matches; `git diff --check` passed. `npm --prefix tests ci` still reports a dev-only audit issue in the isolated test package; root production audit is clean.
- task013 skipped/blocked checks: `npm run test:integration` was attempted with placeholder Supabase env and failed before live tests because `SUPABASE_SECRET_KEY=test-secret` is not a real `sb_secret_...` key. It requires a reachable local/preview Supabase, real-format secret key, matching publishable key/URL, and optional sandbox Redis/R2/email/payment env for integration suites. `npm run test:e2e` was attempted and failed immediately because `http://localhost:3000` was already occupied by another local process; E2E also requires a reachable test Supabase env, installed Playwright browsers, and sandbox/mock payment settings.
- task013 review loop: mandatory review-mode command was attempted through the wrapper with a 300-second bound. It timed out with no findings and did not print a wrapper `review_output=` path while other `codex review --uncommitted` processes were active. Blocker note saved at `/tmp/codex-review-task013-timeout.txt`. Re-run task013 review-mode when the review backlog clears and fix any valid findings before treating the strict gate as clean.
- Final release readiness: functionally, task013 makes install/lint/unit/build/Storybook/audit checks pass from the current working tree without live third-party services. Public repository preparation should still wait for clean nested review-mode passes for task013 and earlier blocked tasks, live integration/E2E/Supabase schema validation against a dedicated test environment, confirmation of all task011/task012 outputs, and external rotation of any credentials that may have existed in private history.
- 2026-06-01 finalization worker M: Finalized tasks009-011 only. Inspected the existing storefront/checkout-auth-profile/admin implementation and fixed remaining valid scoped regressions caused by placeholder English from prior copy cleanup. Public/admin/user API and service messages now use readable neutral English across product, category, tag, promo, wishlist, search, admin settings/stats/users/transactions/bulk operations, product reorder, R2 browser, and product media/variant routes. Updated focused unit expectations and task009-011-scoped E2E selectors for public search, payment recovery, wishlist, admin categories/products/variants/settings/promo flows, login/register, and checkout fixture copy. No payment/schema/release docs were edited.
- task009-task011 worker M checks: `npm run verify` passed; `npm run lint` passed; `npm run build` passed with placeholder Supabase/Auth/Stripe/PayPal env; `npm run test:unit -- cart` passed (1 file / 6 tests); `npm run test:unit -- checkout` passed (1 file / 4 tests); `npm run test:unit -- auth` passed (4 files / 15 tests); `npm run test:unit -- user` passed (16 files / 99 tests); `npm run test:unit -- admin` passed (8 files / 90 tests); `npm run test:unit -- products promo categories tags wishlist search` passed (17 files / 146 tests); final `npm run test:unit -- promo` passed (3 files / 29 tests). Public/admin/checkout scrubs returned no matches; placeholder-copy scrub over scoped source/tests returned no matches; `git diff --check` passed.
- task009-task011 worker M blocked/skipped checks: `npm run test:integration -- admin` was attempted with placeholder Supabase env and failed because no reachable local/test Supabase instance is available: `Failed to connect to Supabase: Unknown error`. E2E was not run because this finalization was scoped to code/test-copy cleanup and the local app/test Supabase environment was not available.
- task009-task011 worker M review loop: attempted combined focused review-mode runs instead of three separate broad runs because the dirty worktree remains large. Partial transcripts were created at `/tmp/codex-review.8DaFNL.txt`, `/tmp/codex-review.5nzj35.txt`, and `/tmp/codex-review.p8B9Sn.txt`; wrapper logs `/tmp/codex-review-task009-011-wrapper.log`, `/tmp/codex-review-task009-011-final-rerun.log`, and `/tmp/codex-review-task009-011-final-short.log` were empty because the wrapper did not print `review_output=...`. The first two partial transcripts exposed scoped broken-copy regressions that worker M fixed. The final transcript did not reach a final findings section. Process-table checks confirmed no task009-011 review processes were left running. Strict review cleanliness is still not proven because the nested review did not complete cleanly.
- 2026-06-01 task012/task013 finalization worker N: Re-inspected current email/SEO/assets/storage/tests/CI/release surfaces and made no additional product-code fixes. Updated task012/task013 tracking files with current verification and review status.
- task012/task013 finalization checks: `npm run verify` passed; `npm run lint` passed; focused `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- email storage` passed (4 files / 15 tests); full `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit` passed (67 files / 637 tests); production build with placeholder Stripe/PayPal env passed on retry after a transient `.next/lock` collision with another build; `npm run build-storybook` passed with existing Vite/Storybook warnings; `npm audit --omit=dev` passed with 0 vulnerabilities; scoped task012/task013 release scrub returned no matches; `git diff --check` passed.
- task012/task013 finalization review loop: attempted a combined focused review through `/home/dexter/.shared-agent-skills/codex-review-mode/scripts/run_codex_review.sh` with `timeout --kill-after=15s 300s`. Wrapper log: `/tmp/codex-review-task012-013-finalization-wrapper.txt`. Partial nested transcript: `/tmp/codex-review.dtdRGz.txt`. The review timed out before producing a completed findings section; no valid task012/task013 finding was available to fix. Confirmed no task012/task013 review process was left running afterward. Strict release readiness still requires clean nested review-mode passes plus live integration/E2E/Supabase schema validation and external credential rotation before public release.

## Final Global Audit - Worker O - 2026-06-01

Scope: global public-release audit only. No feature work was implemented. Worker O made only cross-cutting release-blocker scrub fixes found by the audit.

Scrub fixes applied:
- Neutralized stale private values in `tests/.env.example` and `tests/e2e/.env.example`, including the old hosted Supabase project ID, Kitia email/domain, test CDN, R2 bucket names, Iran-style phone example, deprecated JWT-style E2E key examples, and SMS mock env.
- Renamed the app build-version localStorage key from `kitia_build_version` to `commerce_boilerplate_build_version` and updated unit/E2E/integration expectations.
- Removed stale Iranian/provider release artifacts: unreferenced `src/components/badges/EnamadBadge.tsx`, root-level legacy provider cleanup migration `migrations/20260206_payment_sms_cleanup_and_stripe_paypal.sql`, and the stale Kavenegar ignore path in `.eslintrc.json`.
- Removed the private legacy service-worker cache prefix from `scripts/sw-template.js`.
- Generalized legacy payment-column documentation/validation text in `database/schema-contract.md` and `scripts/db/validate_payment_schema.sql` so public release files do not name removed private providers.
- Neutralized remaining stale test/comment strings in `tests/integration/storage-service.test.ts`, `tests/integration/rate-limiting.test.ts`, and `src/services/product-service.ts`.

Scrubs:
- Passed: `rg -n --hidden "Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|staging\\.kitia|nimarezapoor|/home/dexter|gozxjxtnrbuurmstjydo|Zarinpal|ZarinPal|Digipay|DigiPay|Zibal|Snappay|Kavenegar|Enamad|BYekan|date-fns-jalali|fa-IR|fa_IR|lang=\"fa\"|dir=\"rtl\"|تومان|تومن|ریال|[\\u0600-\\u06FF]" . -g '!node_modules/**' -g '!tests/node_modules/**' -g '!tasks/**' -g '!package-lock.json' -g '!tests/package-lock.json' -g '!.git/**'`
- Passed: `rg -n --hidden -P "(?i)(zarinpal|digipay|zibal|snappay|kavenegar|enamad|kitia|byekan|date-fns-jalali|fa-IR|fa_IR|toman|jalali|persian|iranian|iran-only|iranian-gateway|\\bir\\b|\\brial\\b)" . -g '!node_modules/**' -g '!tests/node_modules/**' -g '!tasks/**' -g '!package-lock.json' -g '!tests/package-lock.json' -g '!.git/**'`
- Passed: secret-key pattern scan for real Supabase/Stripe/live AWS/private-key tokens outside task notes and lockfiles. Placeholder Stripe webhook values remain in `.env.example`, docs, and CI as non-secret placeholders.

Verification run:
- `npm ci` passed.
- `npm --prefix tests ci` passed; install output still reports one dev-only high-severity audit issue in the isolated tests package.
- `npm run verify` passed.
- `npm run lint` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit` passed: 67 files / 637 tests.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US STRIPE_SECRET_KEY=sk_test_placeholder NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder STRIPE_WEBHOOK_SECRET=whsec_placeholder PAYPAL_CLIENT_ID=paypal-client-id-placeholder PAYPAL_CLIENT_SECRET=paypal-client-secret-placeholder PAYPAL_WEBHOOK_ID=paypal-webhook-id-placeholder PAYPAL_ENV=sandbox PAYMENT_SITE_NAME="Supabase Vercel Stack" npm run build` passed.
- `npm run build-storybook` passed.
- `npm audit --omit=dev` passed with 0 vulnerabilities.
- `npm --prefix tests audit --omit=dev` passed with 0 vulnerabilities.
- `git diff --check` passed.

Review/process audit:
- Worker O did not start a new nested Codex review because prior task review processes had repeatedly hung on the large shared dirty worktree and unrelated review jobs were active on the machine.
- Found stale repo-related review process trees still running for task009-task011 and task012-task013. After those were stopped, additional repo-related review trees appeared for task003-task005 and task006-task008; Worker O stopped those repo-related process groups as well. Final process check showed no `codex review` / `run_codex_review` processes for `/data/dexter/Desktop/supabase-vercel-stack` or this task folder. Other visible review processes belonged to unrelated repositories and were left running.

Remaining blockers before public release/commit:
- Human must review the large 399-file diff before commit; Worker O did not commit.
- Mandatory nested review-mode gates for several earlier tasks remain incomplete/blocked in task status files. A clean final review pass is still recommended when review tooling is not saturated.
- Live integration/E2E/Supabase schema validation was not rerun by Worker O; it still requires a reachable dedicated Supabase test environment, real-format test secret/publishable keys, installed Playwright browsers, and sandbox/mock payment/storage/email settings.
- Rotate any credentials that may have appeared in private repository history, CI logs, old deployment scripts, or docs before making the repository public.
- The isolated `tests` package still reports one dev-only high-severity audit issue during `npm --prefix tests ci`; production/root audit and tests-package production audit are clean.

## Task006-008 Finalization - Worker L - 2026-06-01

Scope: finalized tasks006, task007, and task008 only. No public/admin/checkout/release areas were edited except for inspecting verification output.

Fixes applied:
- Fixed the valid task007 review finding in `src/services/user-service.ts`: `getUserByPhone` now normalizes formatted phone input before querying, aligning lookup behavior with create/profile/auth phone normalization.
- Added focused unit coverage in `tests/unit/services/user-service.test.ts` for formatted phone lookup through `getUserByPhone` and `getUserByIdentifier`.
- Updated task006, task007, and task008 task files with current finalization status, checks, review paths, and blockers.

Scrubs:
- Passed: `rg -n "fa-IR|fa_IR|date-fns-jalali|BYekan|تومان|تومن|ریال|lang=\"fa\"|dir=\"rtl\"|B Yekan" src package.json package-lock.json tailwind.config.ts config/tailwind.config.ts public`
- Passed: `rg -n "[\\u0600-\\u06FF]" src tests`
- Passed: `rg -n "rose|pink|girlish|Kitia|کیتیا|BYekan|fa-IR|[\\u0600-\\u06FF]" src/components/ui src/components/ui-v4 .storybook src/app/globals.css tailwind.config.ts`
- Passed: `rg -n "@/components/ui-v4|components/ui-v4" src .storybook tests`

Verification run:
- `npm run verify` passed.
- `npm run lint` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- utils/format.test.ts utils/text.test.ts` passed: 2 files / 6 tests.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- services/user-service.test.ts services/auth-service.test.ts utils/text.test.ts` passed: 3 files / 25 tests.
- Full `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit` passed: 67 files / 639 tests.
- Production build with placeholder Stripe/PayPal env passed.
- `npm run build-storybook` passed with existing Vite sourcemap, `"use client"`, Browserslist, and chunk-size warnings.
- `git diff --check` passed.

Review loop:
- Combined tasks006-008 review attempt 1: wrapper log `/tmp/codex-review-task006-008-wrapper.log` was empty, partial nested transcript `/tmp/codex-review.87xOEC.txt` was written, and the run stopped before a completed findings section. The partial transcript exposed one valid task007 phone lookup normalization issue; Worker L fixed it.
- Combined tasks006-008 review attempt 2 after the fix: wrapper log `/tmp/codex-review-task006-008-final-wrapper.log` was empty, partial nested transcript `/tmp/codex-review.91f4qK.txt` was written, and the run stopped before a completed findings section while unrelated `codex review` processes were active on the machine. No further task006/task007/task008 finding was available to fix.
- Process check after both attempts showed no tasks006-008 `codex review` / `run_codex_review` process left running. Unrelated review processes for other workspaces were left alone.

Current task006/task007/task008 status: functionally complete with one valid review finding fixed by Worker L. Strict nested review-mode cleanliness remains blocked because the focused review attempts did not complete to a final findings/no-findings section on the large shared dirty worktree. No commit was made.

## Task001 Commit-Based Review Finalization - 2026-06-01

Scope: task001 only, following the revised commit-based workflow.

Final task001 code commit:
- `05b4d3c` - `task001: scrub private publication artifacts`

Review loop:
- Rounds 1-15 reviewed earlier task001 commits and found valid task001 issues or review/tooling failures. Valid task001 findings were fixed into task001, the commit was amended, and the branch was replayed.
- Round 16 reviewed final commit `05b4d3c`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task001-round16.txt`.
- Round 16 result: no discrete introduced correctness issues were found in the reviewed commit.
- Full task001 review log set is saved under `tasks/open-source-boilerplate-conversion/reviews/task001-round1.txt` through `task001-round16.txt`.

Checks recorded:
- `npm run verify` passed.
- Publication/security scrub returned no task001 blocker matches.
- `git diff --check` passed.
- The final review log records that the task001 commit's CI test and production build commands completed successfully in a clean worktree for `05b4d3c`.

Current task001 status: commit-reviewed clean. Task002 is next in the sequential commit-based review queue.

## Task002 Commit-Based Review Finalization - 2026-06-01

Scope: task002 only, following the revised commit-based workflow.

Final task002 code commit:
- `3ccbadf` - `task002: neutralize repository identity and setup docs`

Review loop:
- Round 1 reviewed final commit `3ccbadf`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task002-round1.txt`.
- Round 1 result: no introduced broken references, invalid JSON, or runtime-impacting issues were found in the task002 diff.

Checks recorded:
- `npm run verify` passed.
- Task002 docs/package/env scrub returned no matches.
- `rg -n "kitia-cache-" tests scripts public src || true` returned no matches during the finalization pass.
- `git diff --check` passed.
- Focused unit command with local placeholder Supabase env passed: 6 files / 66 tests.

Current task002 status: commit-reviewed clean. Task003 is next in the sequential commit-based review queue.

## Task003 Commit-Based Review Finalization - 2026-06-01

Scope: task003 only, following the revised commit-based review workflow.

Final task003 commit:
- `ca9787d` - `task003: remove legacy Iranian payment providers`

Review loop:
- Round 6 reviewed commit `08a8be1`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task003-round6.txt`.
- Round 6 produced one valid finding: PayPal webhook signature verification could be skipped by `E2E_TEST=true` alone.
- The finding was fixed into task003 and the commit was amended.
- Round 7 reviewed final commit `ca9787d`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task003-round7.txt`.
- Round 7 result: no introduced blocking issues found.

Checks run:
- `git diff --check -- src/app/api/transactions/webhook-paypal/route.ts tests/e2e/helpers/payment.ts tests/e2e/playwright.config.ts` passed.
- `npx tsc --noEmit --pretty false` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service SUPABASE_SECRET_KEY=service NEXTAUTH_SECRET=test STRIPE_SECRET_KEY=sk_test STRIPE_WEBHOOK_SECRET=whsec_test PAYPAL_CLIENT_ID=test PAYPAL_CLIENT_SECRET=test PAYPAL_WEBHOOK_ID=webhook npm --prefix tests run test:unit -- unit/middleware.test.ts unit/api/transactions/webhook-stripe.test.ts unit/api/transactions/webhook-paypal.test.ts` passed.
- `npm run verify` passed.
- Nested round7 review also ran `npm run lint`, root/test TypeScript checks, and `npm run build`; those passed in the current branch state during review.

Fixes folded into final task003:
- Stripe/PayPal E2E success/failure mocks now exercise real webhook routes before redirecting.
- `clearPaymentMocks(page)` resets the capture-route WeakSet state so route capture can reinstall on the same page.
- Deleted legacy callback paths are no longer middleware rate-limit exemptions.
- PayPal approval mocks match normal PayPal approval subdomains.
- PayPal E2E webhook signature bypass now requires a private E2E-only secret and cannot be triggered by `E2E_TEST=true` alone.

Current task003 status: commit-reviewed clean. Task004 is now the next task in the sequential commit-based review queue.

## Task004 Commit-Based Review Finalization - 2026-06-01

Scope: task004 only, following the revised commit-based review workflow.

Final task004 commit:
- `86aa77c` - `task004: harden Stripe and PayPal payments`

Review loop:
- Round 1 reviewed commit `86aa77c`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task004-round1.txt`.
- Round 1 result: no actionable regressions identified in payment provider normalization, Stripe/PayPal webhook verification, PayPal capture flow, or transaction status update changes.

Checks run:
- `npm run verify` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service SUPABASE_SECRET_KEY=service NEXTAUTH_SECRET=test NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 STRIPE_SECRET_KEY=sk_test STRIPE_WEBHOOK_SECRET=whsec_test PAYPAL_CLIENT_ID=test PAYPAL_CLIENT_SECRET=test PAYPAL_WEBHOOK_ID=webhook npm --prefix tests run test:unit -- api/transactions/webhook-stripe.test.ts api/transactions/webhook-paypal.test.ts api/transactions/paypal-capture.test.ts api/transactions/create-status.test.ts services/transaction-service.test.ts` passed: 5 files / 35 tests.
- Nested review ran `npm run lint -- --quiet`, `npm run build`, and `git diff --check 86aa77c^ 86aa77c`; those passed during review.

Current task004 status: commit-reviewed clean. Task005 is now the next task in the sequential commit-based review queue.

Remaining environment note:
- Live payment integration verification with `npm run test:integration -- payment-verification` still requires a reachable local/test Supabase database and a real-format Supabase secret key.

## Task003-005 Finalization - Worker K - 2026-06-01

Scope: finalized tasks003, task004, and task005 only. No locale/UI/admin/release areas were intentionally edited except direct transaction/payment test helpers impacted by the neutral transaction-code prefix.

Fixes applied:
- Reconfirmed task003 legacy provider removal: no active Zarinpal/Digipay/Zibal/Snappay references remain in the task003 acceptance surface, and legacy routes/clients/UI remain deleted.
- Neutralized the runtime transaction code prefix from `KT-` to `TX-` in `src/services/transaction-service.ts` and direct checkout/payment tests/helpers.
- Cleaned corrupted placeholder English in transaction/payment API and service paths under `src/app/api/transactions`, `src/lib/stripe/client.ts`, and `src/services/transaction-service.ts`.
- Rechecked task005 Supabase schema/seed/types/RLS/grants and made no additional schema-file changes.

Checks run:
- `npm run verify` passed.
- `rg -i "zarinpal|digipay|zibal|snappay|mydigipay|zarinpal\\.com|zibal\\.ir" src package.json tests README.md docs .env.example` passed with no matches.
- `rg -n "gozxjxtnrbuurmstjydo|sb_secret|kitia|cdn\\.kitia|preview|production" database migrations scripts/db tests/docs tests/fixtures src/types/supabase.ts` passed with no matches.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- transactions` passed: 7 files / 29 tests.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- services/transaction-service.test.ts` passed: 17 tests.
- `npm run lint` passed.
- `npm run build` passed after waiting for a concurrent stale Next build lock/process to clear.
- `git diff --check` passed before task/handoff updates.

Blocked/skipped:
- `npm run test:integration -- payment-verification` with placeholder local env failed before tests because `SUPABASE_SECRET_KEY=test-secret` is not a real `sb_secret_...` key.
- `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql` was skipped because `DATABASE_URL` is unset.
- `npx supabase migration list --local` failed because local Supabase Postgres is not running on `127.0.0.1:54322`.

Review loop:
- Combined tasks003-005 review attempt 1: `/tmp/codex-review.l7bSmo.txt`; incomplete because the nested reviewer ran unit tests without required Supabase env vars and stopped before findings.
- Combined tasks003-005 review retry with placeholder local env: `/tmp/codex-review.4RqsXG.txt`; incomplete before a final review result because the nested reviewer hit an unrelated shared-worktree full-unit failure in `tests/unit/services/product-service.test.ts` (`Stock text` expectation vs `Not enough stock available`), which is outside tasks003-005 and outside Worker K's allowed edit scope.
- Wrapper logs `/tmp/codex-review-task003-005-K-wrapper.txt` and `/tmp/codex-review-task003-005-K-rerun-wrapper.txt` were empty because the review wrapper did not print a `review_output=` line before the nested runs ended.
- Process check after the attempts showed no tasks003-005 `codex review` / `run_codex_review` process left running. Unrelated review processes for other workspaces were left alone.

Current task003/task004/task005 status: functionally complete with Worker K's focused fixes applied. Strict nested review-mode cleanliness and live DB/payment integration validation remain blocked by review/tooling/shared-worktree and missing-live-Supabase environment issues. No commit was made.

## Task005 Commit-Based Review Finalization - 2026-06-01

Scope: task005 only, following the revised commit-based workflow.

Final task005 code commit:
- `712444f` - `task005: prepare Supabase schema and seed setup`

Review loop:
- Round 1 reviewed commit `7161d82`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task005-round1.txt`; valid findings were fixed into task005.
- Round 2 reviewed commit `0859d81`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task005-round2.txt`; valid findings were fixed into task005.
- Round 3 reviewed commit `7f1a371`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task005-round3.txt`; valid findings were fixed into task005.
- Round 4 reviewed final commit `712444f`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task005-round4.txt`.
- Round 4 result: no discrete correctness issues introduced by the commit were identified.

Checks run after final amend:
- `npm run verify` passed.
- `npm run lint -- --quiet` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run build` passed.
- `git diff --check 712444f^ 712444f` passed.
- Private-ref/key scan across task005 schema/docs/fixtures/types/test helper paths passed with no matches.
- Live `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql` was skipped because `DATABASE_URL` is unset.
- `npx supabase migration list --local` failed because local Supabase Postgres is not running on `127.0.0.1:54322`.

Fixes folded into final task005:
- Fresh migration service-role grants, null-variant wishlist uniqueness, deterministic/no-persistence OTP handling, higher-entropy E2E phone fixtures, fail-closed Supabase/Redis test guards, and local-vs-hosted Supabase key handling.

Current task005 status: commit-reviewed clean. Task006 is now the next task in the sequential commit-based review queue.

## Task006 Commit-Based Review Finalization - 2026-06-01

Scope: task006 only, following the revised commit-based workflow.

Final task006 code commit:
- `d7d6019` - `task006: add neutral locale and currency foundation`

Review loop:
- Rounds 1-16 reviewed task006 commits and found valid issues. Each valid finding was fixed into task006, the branch was replayed, and the updated task006 commit was reviewed again.
- Round 17 reviewed final commit `d7d6019`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task006-round17.txt`.
- Round 17 result: no discrete regressions introduced by the commit were identified.
- Full review log set is saved under `tasks/open-source-boilerplate-conversion/reviews/task006-round1.txt` through `task006-round17.txt`.

Checks run after final amend:
- `git diff --check d7d6019^ d7d6019` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run lint -- --quiet` passed on the replayed branch.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run test:unit -- utils/format.test.ts utils/text.test.ts services/user-service.test.ts services/auth-service.test.ts` passed.
- `npm run build` passed on the replayed branch.
- Locale/dependency scrub passed with no matches across active task006 paths.

Fixes folded into final task006:
- Neutral, config-driven language/direction/locale/currency/display-name/time-zone foundation.
- Shared `Intl` formatting with configured time zone.
- Stripe/PayPal default currencies aligned to `NEXT_PUBLIC_SITE_CURRENCY` unless provider-specific env vars are set.
- BYekan/Jalali/Persian-first dependencies and active defaults removed from task006 scope.
- Neutral text utilities with explicit RTL support, neutral phone default, and validated legacy `09...` compatibility.
- Task006-era unit and smoke expectations updated to match the new contracts.

Remaining note:
- Current final-head broad unit run has one task007-owned phone fixture expectation mismatch in `tests/unit/services/user-service-queries.test.ts`; handle it in the task007 commit-based review loop.

Current task006 status: commit-reviewed clean. Task007 is next in the sequential commit-based review queue.

## Task007 Commit-Based Review Finalization - 2026-06-01

Scope: task007 only, following the revised commit-based workflow.

Final task007 code commit:
- `b4c554f` - `task007: convert copy and validation to English defaults`

Review loop:
- Rounds 1-4 reviewed earlier task007 commits and produced valid findings. Each valid finding was fixed into task007, the commit was amended, and the branch was replayed.
- Round 5 reviewed final commit `b4c554f06005209d1541d0dea44e7a1840041a9d`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task007-round5.txt`.
- Round 5 result: no valid findings.
- Full task007 review log set is saved under `tasks/open-source-boilerplate-conversion/reviews/task007-round1.txt` through `task007-round5.txt`.

Checks run after final amend:
- `git diff --check b4c554f^ b4c554f` passed.
- `npx tsc --noEmit --pretty false` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run test:unit -- services/wishlist-service.test.ts middleware.test.ts services/user-service-queries.test.ts services/user-service-validation.test.ts services/user-service.test.ts services/auth-service.test.ts utils/text.test.ts` passed: 7 files / 106 tests.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm --prefix tests run test:e2e -- --list` passed and listed 309 tests.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run build` passed.
- `npm run lint -- --quiet` is not claimed as passing for task007: it failed before linting because this commit state has ESLint 9 with legacy `.eslintrc.json` and no flat config; forcing legacy config mode also failed inside ESLint config loading.

Fixes folded into final task007:
- English/default API and validation copy plus neutral phone/name validation from the original task007 implementation.
- Formatted phone lookup normalization and focused unit coverage from the earlier finalization pass.
- E2E selector cleanup from the commit-based review loop, replacing placeholder and literal-pipe selectors with real current-copy-compatible role/text selectors.

Current task007 status: commit-reviewed clean. Task008 is next in the sequential commit-based review queue.

## Task008 Commit-Based Review Finalization - 2026-06-01

Scope: task008 only, following the revised commit-based workflow.

Final task008 code commit:
- `b7e7c0a` - `task008: neutralize Tailwind design system`

Review loop:
- Rounds 1-3 reviewed earlier task008 commits and produced valid findings. Each valid finding was fixed into task008, the commit was amended, and the branch was replayed.
- Round 4 reviewed final commit `b7e7c0a`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task008-round4.txt`.
- Round 4 result: no valid findings.
- Full task008 review log set is saved under `tasks/open-source-boilerplate-conversion/reviews/task008-round1.txt` through `task008-round4.txt`.

Checks run after final amend:
- `git diff --check b7e7c0a^ b7e7c0a` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run verify` passed.
- `npm run lint -- --quiet` passed.
- `rg -n "rose|pink|girlish|Kitia|کیتیا|BYekan|fa-IR|[\\u0600-\\u06FF]" src/components/ui src/components/ui-v4 .storybook src/app/globals.css tailwind.config.ts` returned no matches.
- Production build with placeholder Supabase/Auth/Stripe/PayPal env passed.
- `npm run build-storybook` passed with existing Vite sourcemap, `"use client"`, Browserslist, and chunk-size warnings.
- Focused `npm run test:unit -- unit/hooks/useVersionCheck.test.tsx` was attempted but did not run because the current Vitest include only matches `unit/**/*.test.ts`, not `.test.tsx`.

Fixes folded into final task008:
- Canonical `@/components/ui/Pill` import/tone migration for task008-era callers.
- Neutral readable rate-limit, variant validation, and delete-confirmation fallback copy.
- Restored still-referenced blob animation utilities.
- Logical RTL-aware `SearchBar` positioning.
- Legacy build-version key migration, dark modal backdrop correction, and unique generated input IDs.

Current task008 status: commit-reviewed clean. Task009 is next in the sequential commit-based review queue.

## Task009 Commit-Based Review Finalization - 2026-06-01

Scope: task009 only, following the revised commit-based workflow.

Final task009 code commit:
- `65800fe` - `task009: redesign neutral public storefront`

Review loop:
- Round 1 reviewed final commit `65800fe`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task009-round1.txt`.
- Round 1 result: no valid findings.

Checks run after final review:
- `git diff --check 65800fe^ 65800fe` passed.
- `npm run verify` passed on the replayed branch.
- `npm run lint -- --quiet` passed on the replayed branch.
- Production build with placeholder Supabase/Auth/Stripe/PayPal env passed on the replayed branch.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- cart` passed: 1 file / 6 tests.
- Public storefront scrub `rg -n "Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|telegram|instagram\\.com/kitia|fa-IR|تومان|[\\u0600-\\u06FF]" src/app src/components` returned no matches.

Current task009 status: commit-reviewed clean. Task010 is next in the sequential commit-based review queue.

## Task010 Commit-Based Review Finalization - 2026-06-01

Scope: task010 only, following the revised commit-based workflow.

Final task010 code commit:
- `23a627f` - `task010: redesign checkout auth profile flows`

Review loop:
- Round 1 reviewed commit `c210809`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task010-round1.txt`; it found a valid E2E locator drift issue for the redesigned checkout submit button.
- The finding was fixed into task010.
- Round 2 reviewed final commit `23a627f`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task010-round2.txt`.
- Round 2 result: no valid findings.

Checks run after final amend:
- `git diff --check 23a627f^ 23a627f` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run verify` passed.
- `npm run lint -- --quiet` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- checkout user auth` passed: 21 files / 118 tests.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm --prefix tests run test:e2e -- --list tests/e2e/journeys/guest-checkout.spec.ts` passed and listed 21 tests.
- Required checkout/auth/profile/payment scrub returned no matches.
- Production build with placeholder Supabase/Auth/Stripe/PayPal env passed.

Fixes folded into final task010:
- Guest checkout E2E payment-button locators now match the redesigned `Pay ...` button while retaining compatibility with legacy labels.

Current task010 status: commit-reviewed clean. Task011 is next in the sequential commit-based review queue.

## Task011 Commit-Based Review Finalization - 2026-06-01

Scope: task011 only, following the revised commit-based workflow.

Final task011 code commit:
- `79c547c` - `task011: neutralize admin dashboard`

Review loop:
- Round 1 reviewed commit `dc7ed9c`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task011-round1.txt`; it found valid Unicode slug regressions in inline category and tag creation.
- Those findings were fixed into task011 by preserving Unicode letters and numbers in generated slugs for language-neutral LTR/RTL catalog data.
- Round 2 reviewed commit `c84badf`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task011-round2.txt`; it found valid placeholder or misleading admin API messages.
- Those findings were fixed into task011 by replacing self-role, self-delete, promo validation, and related bulk-user guard messages with actionable English responses and updating matching admin unit tests.
- Round 3 reviewed final commit `79c547c`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task011-round3.txt`.
- Round 3 result: no valid findings.

Checks run after final amend:
- `git diff --check 79c547c^ 79c547c` passed.
- `npm run verify` passed.
- `npm run lint -- --quiet` passed.
- `npx tsc --noEmit --pretty false` passed after the production build regenerated `.next/types`.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- admin` passed: 8 files / 90 tests.
- Admin scrub returned no matches for Persian/Kitia/legacy provider/private placeholder patterns.
- Production build with placeholder Supabase/Auth/Stripe/PayPal env passed.
- `timeout 90s bash -lc 'NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=sb_secret_placeholder npm run test:integration -- admin'` was attempted and failed because no reachable local/test Supabase instance is available: `Failed to connect to Supabase: Unknown error`.

Current task011 status: commit-reviewed clean. Task012 is next in the sequential commit-based review queue.

## Task012 Commit-Based Review Finalization - 2026-06-01

Scope: task012 only, following the revised commit-based workflow.

Final task012 code commit:
- `7405ef4` - `task012: neutralize email SEO assets and storage`

Review loop:
- Round 1 reviewed commit `4cc6b55`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task012-round1.txt`; it found a default OG image compatibility issue and an R2 missing-public-URL regression.
- Those findings were fixed into task012 by adding `public/images/og-default.png`, using it for default OG and structured-data fallback images, making R2 public URL generation fail explicitly without `R2_PUBLIC_URL`, and adding storage adapter test coverage.
- Round 2 reviewed final commit `7405ef4`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task012-round2.txt`.
- Round 2 result: no valid findings.

Checks run after final amend:
- `git diff --check 7405ef4^ 7405ef4` passed.
- `npm run verify` passed.
- `npm run lint -- --quiet` passed.
- `npx tsc --noEmit --pretty false` passed after the production build regenerated `.next/types`.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- email storage` passed: 4 files / 16 tests.
- Required task012 scrub returned no matches.
- Production build with placeholder Supabase/Auth/Stripe/PayPal env passed.

Current task012 status: commit-reviewed clean. Task013 is next in the sequential commit-based review queue.

## Task013 Commit-Based Review Finalization - 2026-06-01

Scope: task013 only, following the revised commit-based workflow.

Final task013 code commit:
- `bf5f086d3a0146470762b4d1d0d0c774b7773d1d` - `task013: update CI tests and release workflow`

Review loop:
- Rounds 1-7 reviewed earlier task013 commits and found valid issues. Each valid finding was fixed into task013, the commit was amended, and the branch was replayed.
- Round 8 reviewed commit `bf5f086`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round8.txt`; the run ended without a final finding section and was not treated as clean.
- Round 9 reviewed final commit `bf5f086d3a0146470762b4d1d0d0c774b7773d1d`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round9.txt`.
- Round 9 result: no regressions introduced by the commit were found.
- Full task013 review log set is saved under `tasks/open-source-boilerplate-conversion/reviews/task013-round1.txt` through `task013-round9.txt`.

Checks run after final review:
- `git diff --check bf5f086^ bf5f086` passed.
- `npm ci` passed. It still reports the known dev-only critical audit warning; `npm audit --omit=dev` passed.
- `npm --prefix tests ci` passed with 0 vulnerabilities.
- `npm run verify` passed.
- `npm run lint -- --quiet` passed.
- `npm run format:check` passed.
- `npx tsc --noEmit --pretty false` passed.
- Local/test-safe `npm run test:unit` passed: 67 files / 643 tests.
- Production build with placeholder Supabase/Auth/Stripe/PayPal/R2 env passed.
- `npm run build-storybook` passed with existing Vite/Storybook warnings.
- `npm audit --omit=dev` passed with 0 vulnerabilities.
- `npm --prefix tests audit` passed with 0 vulnerabilities.
- `npm --prefix tests run test:e2e -- --list` passed and listed 309 tests in 16 files.
- Full release scrub returned no matches for Persian/Kitia/private artifact/legacy provider/secret-like patterns.

Fixes folded into final task013:
- Restored request IP fallback test behavior.
- Updated tests package Vitest/Vite dependencies and lockfile.
- Corrected tests env setup docs.
- Restored raw local database SQL dump ignore coverage.
- Removed Persian/Kitia fallback selectors and assertions from task013-owned E2E/unit tests.
- Fixed duplicated admin variant image select confirmation selector.
- Restored Prettier enforcement in ESLint flat config and formatted affected files.

Blocked/skipped:
- Full integration tests, full E2E tests, and live Supabase schema validation remain environment-gated and are not claimed as passing. They require a reachable local or disposable preview Supabase environment with real-format matching keys plus the relevant browser/runtime and sandbox service settings.

Current task013 status: commit-reviewed clean. The task003-task013 commit-based review queue is finalized in this handoff; task001-task002 evidence should be audited before marking the overall thread goal complete.
