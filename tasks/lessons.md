# Lessons Learned

## Session Lessons
- Supabase paused projects block schema dumps and linking operations.
- For this environment, Supabase direct DB hosts resolved to IPv6 and failed; pooler endpoints worked.
- Raw `pg_dump` output is not fully idempotent on Supabase; `CREATE SCHEMA` and `ALTER DEFAULT PRIVILEGES` can fail.
- Applying dumps to Supabase requires filtering unsupported privilege statements.
- DB-first migrations can break app runtime immediately when code still references removed tables/columns.
- Cloudflare global API key must use `X-Auth-Key` + `X-Auth-Email`, not Bearer token.
- R2 bucket creation via API is straightforward, but S3 key management differs from API token handling.
- Always validate new R2 credentials with a real S3 request before using them in production envs.
- Keep `tasks/` ignored by default but force-add specific planning files when needed.

## Implementation Guardrails
- Keep schema and generated types in lockstep.
- Make payment callbacks idempotent before enabling live traffic.
- Use preview-first rollout with explicit drift checks between preview and production.
- Maintain a single migration runbook with exact commands and expected outputs.
