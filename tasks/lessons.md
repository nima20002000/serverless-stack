# Lessons Learned

## Session Lessons
- Supabase paused projects block schema dumps and linking operations.
- For this environment, Supabase direct DB hosts resolved to IPv6 and failed; pooler endpoints worked.
- For type generation, use Supabase CLI with project ref: `supabase gen types typescript --project-id <ref> --schema public > src/types/supabase.ts`.
- Avoid `supabase gen types --db-url ...` in this environment; it attempted a Docker-backed path and failed when Docker daemon was unavailable.
- Raw `pg_dump` output is not fully idempotent on Supabase; `CREATE SCHEMA` and `ALTER DEFAULT PRIVILEGES` can fail.
- Applying dumps to Supabase requires filtering unsupported privilege statements.
- DB-first migrations can break app runtime immediately when code still references removed tables/columns.
- Cloudflare global API key must use `X-Auth-Key` + `X-Auth-Email`, not Bearer token.
- R2 bucket creation via API is straightforward, but S3 key management differs from API token handling.
- Always validate new R2 credentials with a real S3 request before using them in production envs.
- Keep `tasks/` ignored by default but force-add specific planning files when needed.
- When user is editing concurrently, avoid touching their changed files and commit only explicit pathspecs.
- When running Vitest with configs under `tests/`, execute from the `tests/` working directory (or adjust paths) so `setup.ts` resolves correctly.
- Vitest v4 constructor mocks must provide constructable implementations for class-like dependencies (for example, `new Resend(...)`).
- During gateway/OTP deprecations, remove stale route/service tests first, then re-baseline middleware and payment-flow assertions to current endpoints.

## Implementation Guardrails
- Keep schema and generated types in lockstep.
- Prefer `--project-id` generation from Supabase CLI as the default regeneration method for `src/types/supabase.ts`.
- Make payment callbacks idempotent before enabling live traffic.
- Use preview-first rollout with explicit drift checks between preview and production.
- Maintain a single migration runbook with exact commands and expected outputs.
- Keep deploy workflow env blocks aligned with active providers; stale secret keys in CI can silently rot release readiness.
