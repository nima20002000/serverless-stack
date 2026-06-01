# task013: Tests CI And Release Readiness

Status: Commit-reviewed clean

## Goal

Bring tests, CI, examples, and release hygiene into a public-ready state after the boilerplate conversion.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Confirm prior tasks are complete or record any skipped scope.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `package.json`
- `package-lock.json`
- `tests/package.json`
- `tests/package-lock.json`
- `tests/unit/`
- `tests/integration/`
- `tests/e2e/`
- `tests/fixtures/`
- `.github/workflows/`
- `.storybook/`
- `.gitignore`
- `README.md`
- `SECURITY.md`
- `CONTRIBUTING.md`

## Requirements

- Update unit, integration, and e2e tests to neutral English copy, Stripe/PayPal only, and generic fixture data.
- Remove tests for deleted legacy providers, Persian-specific copy, Kitia branding, private CDN URLs, and private project refs.
- Ensure root and `tests/` package dependencies are aligned and installable.
- Replace private deployment workflows with public-safe CI: install, lint, type/build, test, and optional Storybook build.
- Add a release checklist for maintainers: secret scan, dependency audit, build, tests, Supabase schema validation, Stripe/PayPal webhook docs check.
- Confirm `.gitignore` does not hide required template files and does hide local env/build artifacts.
- Keep tests realistic but avoid requiring live third-party credentials for normal CI.

## Acceptance Criteria

- A fresh clone can run documented install/check commands.
- CI workflows contain no private secrets, hosts, emails, or deployment paths.
- Tests no longer assert Persian text or legacy gateways.
- Public release checklist is complete enough for a maintainer to follow.

## Verification To Run

- `npm ci`
- `npm run verify`
- `npm run lint`
- `npm run build`
- `npm run test:unit`
- `npm run test:integration` when local test env is configured; otherwise document the exact missing env requirement.
- `npm run test:e2e` when browser/test env is configured; otherwise document the exact missing env requirement.
- `npm audit --omit=dev` or document why it cannot run.
- `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|Zarinpal|Digipay|Zibal|Snappay|sb_secret|sb_publishable_[A-Za-z0-9]|/home/dexter|nimarezapoor" . -g '!package-lock.json' -g '!tests/package-lock.json'`
- `git diff --check`

## Mandatory Review Loop

Superseded for this phase by the user-requested commit-based review loop: review the exact task commit only, fold valid fixes back into the same task commit, and re-run review until the updated commit is clean.

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task013: Tests CI And Release Readiness. Focus on CI safety, test reliability, stale private artifacts, installability from a fresh clone, and public release blockers." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with final checks, known skipped checks, review output paths, and remaining release blockers.
2. Append a final update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether the boilerplate conversion is ready for final human approval and public repository preparation.

## Completion Update - 2026-05-31

Worker J implemented the task013 test/CI/release-readiness scope.

Changed areas:

- Replaced the verify-only GitHub workflow with public-safe CI that installs root and test dependencies, runs `verify`, `lint`, unit tests, production build, Storybook build, and `npm audit --omit=dev`.
- Added `eslint.config.mjs` for ESLint 9 flat config and adjusted package scripts with `check` and `test:ci`.
- Added `.npmrc` for consistent fresh-clone peer resolution, aligned installability, removed the dead Kavenegar package/source/type declaration, upgraded Nodemailer to the non-vulnerable production version, and refreshed root/test lockfiles.
- Neutralized task-owned tests/docs/fixtures: removed stale SMS/Kavenegar integration coverage, removed old `tests/tasks/*` Kitia/Persian implementation plans, removed Persian/Iran-specific assertion helpers, switched E2E locale defaults to `en-US`/`UTC`, removed stale Kitia settings/title expectations, and made phone fixtures generic E.164-style values.
- Added `docs/RELEASE_CHECKLIST.md` and linked it from `README.md`; tightened `docs/TESTING.md`, `docs/SETUP_CHECKLIST.md`, and `CONTRIBUTING.md` around CI, sandbox credentials, Supabase validation, and release checks.
- Fixed release blockers encountered by CI/build: Next 16 build now uses `next build --webpack`, invalid Next config keys were removed, dynamic route handler params use Promise-compatible contexts, build no longer requires live Redis/R2/Supabase during static generation, public data pages are dynamic, and the logger service label is neutral.
- Updated `.gitignore` so required `database/` templates are not hidden while local dump artifacts remain ignored.

Prior-task status observed from `handoff.md`:

- Task001-task010 have functional updates recorded.
- Several strict nested review gates for earlier tasks are still recorded as quota-blocked or hung.
- Task011 and task012 completion updates were not present in `handoff.md` when task013 ran, so final release approval should verify their worker outputs separately.

Checks run:

- `npm ci` passed.
- `npm --prefix tests ci` passed. The isolated tests package still reports a dev-only audit issue; root production audit is clean.
- `npm run verify` passed.
- `npm run lint` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit` passed: 67 files / 637 tests.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US STRIPE_SECRET_KEY=sk_test_placeholder NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder STRIPE_WEBHOOK_SECRET=whsec_placeholder PAYPAL_CLIENT_ID=paypal-client-id-placeholder PAYPAL_CLIENT_SECRET=paypal-client-secret-placeholder PAYPAL_WEBHOOK_ID=paypal-webhook-id-placeholder PAYPAL_ENV=sandbox PAYMENT_SITE_NAME="Supabase Vercel Stack" npm run build` passed.
- `npm run build-storybook` passed.
- `npm audit --omit=dev` passed with 0 vulnerabilities.
- Required release scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|Zarinpal|Digipay|Zibal|Snappay|sb_secret|sb_publishable_[A-Za-z0-9]|/home/dexter|nimarezapoor" . -g '!package-lock.json' -g '!tests/package-lock.json'` returned no matches.
- `git diff --check` passed.

Checks not completed:

- `npm run test:integration` was attempted with placeholder Supabase env and failed before running live tests because `SUPABASE_SECRET_KEY=test-secret` is not a real `sb_secret_...` key. Required to run: reachable local/preview Supabase, real-format `SUPABASE_SECRET_KEY`, matching publishable key and URL, and any optional sandbox Redis/R2/email/payment env for suites that cover those integrations.
- `npm run test:e2e` was attempted with placeholder env and failed immediately because `http://localhost:3000` was already occupied by another running local server. Required to run: free port 3000 or adjusted Playwright web server config, reachable test Supabase env, installed Playwright browsers, and sandbox/mock payment settings.

Review status:

- Mandatory nested review was attempted with the required task013 command through the review-mode wrapper, bounded at 300 seconds.
- The command timed out with no findings and did not print a wrapper `review_output=` path. A blocker note was written to `/tmp/codex-review-task013-timeout.txt`.
- Concurrent `codex review --uncommitted` processes from other tasks/repositories were still running during the attempt; this appears to be the same shared review-agent backlog/hang recorded by earlier workers.
- Re-run the task013 review loop when the review backlog clears and fix any valid findings before treating the strict gate as clean.

Remaining release blockers:

- Clean nested review-mode passes are still required for task013 and any earlier tasks whose handoff updates recorded blocked/hung/quota-limited reviews.
- Human release approval should confirm task011 and task012 outputs, because their final updates were not present in `handoff.md` during this task.
- Live integration, E2E, and Supabase schema validation should be run against a dedicated test/preview environment before public release.
- Credential rotation from prior private history remains externally required before making the repository or history public.

## Finalization Update - 2026-06-01 Worker N

No additional task013 code fixes were needed after inspecting the current tests, CI, install/release docs, package scripts, and task012-adjacent email/SEO/storage surfaces.

Checks rerun:

- `npm run verify` passed.
- `npm run lint` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- email storage` passed (4 files / 15 tests).
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit` passed (67 files / 637 tests).
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US STRIPE_SECRET_KEY=sk_test_placeholder NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder STRIPE_WEBHOOK_SECRET=whsec_placeholder PAYPAL_CLIENT_ID=paypal-client-id-placeholder PAYPAL_CLIENT_SECRET=paypal-client-secret-placeholder PAYPAL_WEBHOOK_ID=paypal-webhook-id-placeholder PAYPAL_ENV=sandbox PAYMENT_SITE_NAME="Supabase Vercel Stack" npm run build` passed on retry. The first attempt failed before compilation because another `next build` held `.next/lock`; the active build exited and the retry completed.
- `npm run build-storybook` passed with existing Vite/Storybook warnings for ignored `"use client"` directives and large chunks.
- `npm audit --omit=dev` passed with 0 vulnerabilities.
- Release scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|BYekan|Zarinpal|Digipay|Zibal|Snappay|sb_secret|sb_publishable_[A-Za-z0-9]|/home/dexter|nimarezapoor" src/lib/email src/lib/seo src/app/sitemap.ts src/app/robots.ts src/app/layout.tsx public src/lib/storage scripts docs .github tests package.json tests/package.json README.md SECURITY.md CONTRIBUTING.md -g '!package-lock.json' -g '!tests/package-lock.json'` returned no matches.
- `git diff --check` passed.

Checks not rerun in this finalization pass:

- `npm ci` and `npm --prefix tests ci` were not rerun because no package files changed in this pass; worker J's run remains recorded above.
- `npm run test:integration`, `npm run test:e2e`, and live Supabase schema validation remain blocked without a dedicated reachable Supabase test/preview environment, real-format Supabase secret key, matching publishable key/URL, Playwright/runtime setup, and optional sandbox Redis/R2/email/payment credentials.

Review status:

- Ran a combined focused task012/task013 review-mode attempt with `timeout --kill-after=15s 300s` using the required wrapper.
- Wrapper log: `/tmp/codex-review-task012-013-finalization-wrapper.txt`.
- Partial nested review transcript: `/tmp/codex-review.dtdRGz.txt`.
- The review timed out before producing a completed findings section. The partial transcript shows traversal/check attempts but no final valid findings to fix. Confirmed no task012/task013 review process was left running afterward.

Remaining release blockers:

- Clean nested review-mode passes are still required for task012/task013 and any earlier tasks whose handoff entries remain blocked or hung.
- Live integration, E2E, and Supabase schema validation should be run against a dedicated test/preview environment.
- External rotation remains required for any credentials that may have existed in private history before public release.

## Commit-Based Review Finalization - 2026-06-01

Scope: task013 only, following the revised commit-based workflow. Review targeted the task013 code commit, not the dirty worktree and not the full branch.

Final task013 code commit:

- `bf5f086d3a0146470762b4d1d0d0c774b7773d1d` - `task013: update CI tests and release workflow`

Review loop:

- Round 1 reviewed commit `4222cc4`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round1.txt`; it found a valid `getClientIp` fallback test regression.
- Round 2 reviewed commit `d3e4930`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round2.txt`; it found vulnerable/pinned Vitest/Vite versions in the tests package.
- Round 3 reviewed commit `d8b9a22`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round3.txt`; it found test setup docs copied the root env example instead of the tests env template.
- Round 4 reviewed commit `3ac2e88`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round4.txt`; it found raw `database/*.sql` dumps were no longer ignored.
- Round 5 reviewed commit `86f57dd`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round5.txt`; it returned no valid findings, but the explicit release scrub still found Persian/Kitia fallback selectors in E2E/unit tests, so task013 was amended and reviewed again.
- Round 6 reviewed commit `ac842dd`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round6.txt`; it found a duplicated `/Select \(1\) \(1\)/` selector in the admin variant image E2E test.
- Round 7 reviewed commit `16dfb1a`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round7.txt`; it found the ESLint flat config no longer enforced Prettier.
- Round 8 reviewed commit `bf5f086`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round8.txt`; the run ended without a final finding section, so it was not treated as a clean review.
- Round 9 reviewed final commit `bf5f086d3a0146470762b4d1d0d0c774b7773d1d`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task013-round9.txt`.
- Round 9 result: no regressions introduced by the commit were found.

Fixes folded into final task013:

- Restored `getClientIp` fallback coverage to expect `req.ip`.
- Updated tests package Vitest/Vite dependencies and lockfile to safe current ranges.
- Corrected tests setup docs to copy `tests/.env.example` into `tests/.env`.
- Restored raw local database dump ignore coverage with `database/**/*.sql`.
- Removed Persian/Kitia fallback selectors and assertions from task013-owned E2E/unit tests.
- Fixed the duplicated admin variant image select confirmation selector.
- Restored Prettier enforcement in `eslint.config.mjs` and formatted affected files.

Checks run after final review:

- `git diff --check bf5f086^ bf5f086` passed.
- `npm ci` passed. It still reports the known dev-only critical audit warning; the production audit gate below is clean.
- `npm --prefix tests ci` passed with 0 vulnerabilities.
- `npm run verify` passed.
- `npm run lint -- --quiet` passed.
- `npm run format:check` passed.
- `npx tsc --noEmit --pretty false` passed.
- Local/test-safe `npm run test:unit` passed: 67 files / 643 tests.
- Production build with placeholder Supabase/Auth/Stripe/PayPal/R2 env passed.
- `npm run build-storybook` passed with existing Vite/Storybook warnings for missing MDX stories, ignored `"use client"` directives, sourcemap locations, Browserslist data age, and large chunks.
- `npm audit --omit=dev` passed with 0 vulnerabilities.
- `npm --prefix tests audit` passed with 0 vulnerabilities.
- `npm --prefix tests run test:e2e -- --list` passed and listed 309 tests in 16 files.
- Release scrub `rg -n "[\\u0600-\\u06FF]|Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|BYekan|Zarinpal|Digipay|Zibal|Snappay|sb_secret|sb_publishable_[A-Za-z0-9]|/home/dexter|nimarezapoor" . -g '!package-lock.json' -g '!tests/package-lock.json' -g '!tasks/**' -g '!node_modules/**' -g '!.next/**' -g '!storybook-static/**'` returned no matches.

Checks not completed:

- `npm run test:integration` was not claimed as passing because it requires a reachable local or disposable preview Supabase environment with real-format matching Supabase keys and any optional sandbox Redis/R2/email/payment services for covered suites.
- Full `npm run test:e2e` was not claimed as passing because it requires the full Playwright runtime plus a reachable app/test Supabase environment and sandbox/mock payment settings. List mode passed as recorded above.
- Live Supabase schema validation remains a release-time environment gate.

Current task013 status: commit-reviewed clean. Task013 is finalized for the commit-based review loop.
