# task005: Supabase Schema And Seed Readiness

Status: Commit-reviewed clean; live DB validation remains blocked

## Goal

Make the Supabase schema, generated types, migrations, and seed/onboarding story suitable for an open-source boilerplate.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Read `/home/dexter/.agents/skills/supabase/SKILL.md` because this task touches Supabase.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `database/schema-contract.md`
- `database/schema-dumps/`
- `migrations/`
- `scripts/db/validate_payment_schema.sql`
- `src/types/supabase.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `tests/docs/GETTING_SUPABASE_KEYS.md`
- `tests/fixtures/`
- `tests/integration/setup.ts`

## Requirements

- Ensure schema docs describe a fresh boilerplate setup, not preview/production Kitia parity.
- Remove or neutralize schema dump files if they contain private project-specific metadata or are not useful for public setup.
- Keep generated Supabase types aligned with the intended public schema.
- Provide a safe local/setup migration path. Do not invent migration filenames manually; use Supabase CLI conventions if creating new migrations.
- Provide optional seed data or fixture guidance using neutral English products/users and no private CDN URLs.
- Review RLS/security docs for public-template accuracy.
- Do not expose service-role/secret keys in client code or docs.

## Acceptance Criteria

- A new user can understand how to provision Supabase and apply the schema.
- `src/types/supabase.ts` matches current intended schema, including only `STRIPE` and `PAYPAL` payment methods.
- No schema docs refer to private preview/production project refs or private Supabase keys.
- Fixture data uses neutral domains such as `example.com` and local/test image URLs.

## Verification To Run

- `npm run verify`
- `npm run lint`
- `npm run build`
- `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql` when a configured database is available.
- `rg -n "gozxjxtnrbuurmstjydo|sb_secret|kitia|cdn\\.kitia|preview|production" database migrations scripts/db tests/docs tests/fixtures src/types/supabase.ts`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task005: Supabase Schema And Seed Readiness. Focus on schema/type drift, secret exposure, RLS/security gaps, stale private project refs, and fresh-clone Supabase setup clarity." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with schema/doc changes, database checks run or skipped, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task006` can proceed.

## Completion Update - 2026-05-31

Files changed:
- Added Supabase CLI setup files: `supabase/config.toml`, `supabase/migrations/20260531190011_initial_public_schema.sql`, and `supabase/seed.sql`.
- Updated `database/schema-contract.md` to describe fresh boilerplate setup, generated type readiness, Stripe/PayPal payment columns, and server-only secret-key handling.
- Neutralized `database/schema-dumps/*` so hosted environment metadata is no longer used as the public setup source.
- Removed obsolete `migrations/add_zibal_payment_method.sql` and updated archived migration comments/default payment enum setup to the intended Stripe/PayPal schema.
- Updated RLS docs in `docs/RLS_SECURITY.md` and `docs/RLS_MIGRATION_SUMMARY.md` for public-template RLS/default grant behavior.
- Updated `tests/docs/GETTING_SUPABASE_KEYS.md` with local/dedicated-test Supabase setup and no private project refs.
- Neutralized seed/fixture data in `tests/fixtures/*` and task-owned E2E fixture utilities to use English examples, `example.com`, and local test asset URLs.
- Updated Supabase middleware reference code to use the publishable key instead of the secret key.

Checks run:
- `npm run verify` - passed.
- `npm run lint` - failed before linting because ESLint 9 could not find `eslint.config.*` in the current worktree.
- `npm run build` - failed before compilation because Next.js 16/Turbopack rejected the current `next.config.js` webpack config without an explicit Turbopack/Webpack setting.
- `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql` - skipped because `DATABASE_URL` is unset.
- `npx supabase migration list --local` - failed because local Supabase Postgres was not running on `127.0.0.1:54322`.
- `rg -n "gozxjxtnrbuurmstjydo|sb_secret|kitia|cdn\\.kitia|preview|production" database migrations scripts/db tests/docs tests/fixtures src/types/supabase.ts` - passed with no matches.
- `git diff --check` - passed.
- `npx prettier --check` on task-owned Markdown/TypeScript files - passed after formatting.

Review-mode:
- First nested review attempt failed due external Codex usage limit before producing findings.
- Review output: `/tmp/codex-review.ADnFT5.txt`.
- No valid review findings were produced or fixed because the review agent did not run to completion.

Known issues:
- Mandatory review-mode loop is not clean yet because the review tooling is externally rate-limited until after the printed reset time.
- Live database schema validation still needs to run against a configured local or test Supabase database.

task006 can proceed: No. The implementation is ready for review, but task006 should wait until the mandatory nested review can be rerun and completed with zero valid findings.

## Finalization Update - 2026-06-01

Worker: finalization worker K

Task005 inspection/fixes:

- Re-read the Supabase skill and checked the current Supabase changelog. Relevant current breaking-change context for this schema task remains explicit Data API grants/RLS and the newer Postgres/Self-hosted defaults; the committed initial migration already uses explicit grants for public catalog tables and enables RLS on public tables.
- Rechecked `supabase/migrations/20260531190011_initial_public_schema.sql`, `supabase/seed.sql`, `database/schema-contract.md`, `scripts/db/validate_payment_schema.sql`, `src/types/supabase.ts`, and Supabase server/middleware helpers.
- Confirmed the intended schema uses only `STRIPE` and `PAYPAL` for `PaymentMethod`, includes Stripe/PayPal provider fields, has neutral seed products/assets, and does not expose service/secret keys to client code.
- No additional schema/seed file changes were required.

Checks run:

- `npm run verify` - passed.
- `rg -n "gozxjxtnrbuurmstjydo|sb_secret|kitia|cdn\\.kitia|preview|production" database migrations scripts/db tests/docs tests/fixtures src/types/supabase.ts` - passed with no matches.
- `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql` - skipped because `DATABASE_URL` is unset.
- `npx supabase migration list --local` - failed because local Supabase Postgres is not running on `127.0.0.1:54322`.
- `npm run lint` - passed.
- `npm run build` - passed after waiting for a concurrent stale Next build lock/process to clear.
- `git diff --check` - passed before task/handoff updates.

Review-mode:

- Combined tasks003-005 review attempt: `/tmp/codex-review.l7bSmo.txt`; incomplete because the nested reviewer ran unit tests without required Supabase env vars and stopped before findings.
- Combined tasks003-005 review retry with placeholder local env: `/tmp/codex-review.4RqsXG.txt`; incomplete before a final review result because the nested reviewer hit an unrelated shared-worktree full-unit failure in `tests/unit/services/product-service.test.ts` (`Stock text` expectation vs `Not enough stock available`), which is outside task003-005 and outside this worker's allowed edit scope.
- Wrapper logs: `/tmp/codex-review-task003-005-K-wrapper.txt` and `/tmp/codex-review-task003-005-K-rerun-wrapper.txt` were empty because the review wrapper did not print a `review_output=` line before the nested runs ended.
- No task005-specific review findings were produced.

Known remaining blockers:

- Live schema validation still needs a configured local/test Supabase database and `DATABASE_URL`.
- Strict review gate remains incomplete due review/tooling/shared-worktree blockers, not due a task005 finding.

task006 can proceed: Functionally yes from the schema/seed state, but the strict workflow gate still requires a clean review-mode pass and live DB validation.

## Commit-Based Review Finalization - 2026-06-01

Final task005 code commit:
- `712444f` - `task005: prepare Supabase schema and seed setup`

Review loop:
- Round 1 reviewed original commit `7161d82`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task005-round1.txt`.
- Round 1 found valid issues: missing `service_role` grants in the fresh Supabase migration, destructive E2E database helpers no longer failing closed, and OTP helper behavior that could leave existing OTP journeys timing out.
- Round 2 reviewed amended commit `0859d81`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task005-round2.txt`.
- Round 2 found valid issues: integration-test Supabase guard did not fail closed without private refs, wishlist uniqueness did not cover `NULL` variants, expired OTP E2E flow still failed unconditionally, and generated E2E phone numbers had low entropy.
- Round 3 reviewed amended commit `7f1a371`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task005-round3.txt`.
- Round 3 found valid issues: Redis-backed test cleanup also needed a fail-closed/shared-instance guard, and local Supabase service-role JWT setup was documented but rejected by the test client.
- Round 4 reviewed final commit `712444f`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task005-round4.txt`.
- Round 4 result: no discrete correctness issues introduced by the commit were identified.

Fixes folded into final task005:
- Granted `service_role` schema/table access in the initial Supabase migration for fresh hosted setups where Data API grants are explicit.
- Added fail-closed safeguards for destructive integration and E2E Supabase helpers, plus Redis cleanup confirmation for shared Redis credentials.
- Allowed local Supabase service-role JWTs only for local URLs while keeping hosted test projects on secret keys.
- Replaced the nullable wishlist uniqueness constraint with partial unique indexes that enforce one wishlist row for simple products and variant products.
- Added deterministic OTP helper guidance, skipped expired OTP tests when no persistence store exists, and made E2E phone generation higher entropy.
- Added task-owned docs/example env entries for destructive test confirmations, blocked refs, deterministic OTP, and local/hosted Supabase key behavior.

Checks run after final amend:
- `npm run verify` - passed.
- `npm run lint -- --quiet` - passed.
- `npx tsc --noEmit --pretty false` - passed.
- `npm run build` - passed.
- `git diff --check 712444f^ 712444f` - passed.
- `rg -n "gozxjxtnrbuurmstjydo|sb_secret|kitia|cdn\\.kitia|preview|production" database migrations scripts/db tests/docs tests/fixtures src/types/supabase.ts tests/e2e/.env.example tests/e2e/utils/database.ts tests/e2e/fixtures/users.ts tests/e2e/journeys/user-registration.spec.ts tests/.env.example tests/setup.ts tests/utils/test-client.ts supabase/migrations/20260531190011_initial_public_schema.sql` - passed with no matches.
- `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql` - skipped because `DATABASE_URL` is unset.
- `npx supabase migration list --local` - failed because local Supabase Postgres is not running on `127.0.0.1:54322`.

Known remaining blockers:
- Live schema validation still needs a configured local or dedicated test Supabase database.

task006 can proceed: Yes. Task005 is commit-reviewed clean under the commit-based workflow; task006 is next in the sequential review queue.
