# task001: Publication Security Scrub

Status: Commit-reviewed clean

## Goal

Remove public-release blockers: hard-coded credentials, private deployment details, personal infrastructure paths, private emails, and repo artifacts that should not ship in an open-source boilerplate.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.
- Treat this as a security-sensitive task. Do not print secret values in logs or task updates.

## Files To Inspect First

- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/rollback.yml`
- `vps/`
- `scripts/backup-to-r2.mjs`
- `scripts/restore-from-r2.mjs`
- `config/ecosystem.config.js`
- `next.config.js`
- `.env.example`
- `README.md`

## Requirements

- Remove or rewrite GitHub workflows that deploy to private VPS infrastructure.
- Remove hard-coded Supabase credentials from `.github/workflows/deploy-staging.yml` and replace with safe placeholders only if a workflow remains.
- Remove personal email addresses, private paths such as `/home/dexter/...`, private domains such as `kitia.ir`, and project-specific hostnames from public-facing docs and workflows.
- Remove or quarantine `vps/` docs from the boilerplate unless rewritten as generic deployment documentation.
- Ensure scripts do not default to private bucket names, domains, paths, or host-specific assumptions.
- Add a `SECURITY.md` note that leaked credentials from previous private history must be rotated before making the repository public.
- Do not attempt to rotate real credentials in code. Record external rotation as a handoff note.

## Acceptance Criteria

- No committed workflow contains literal Supabase keys, private VPS paths, private emails, or private hostnames.
- `rg -n "sb_secret|sb_publishable_[A-Za-z0-9]|nimarezapoor|/home/dexter|kitia\\.ir|staging\\.kitia|cdn\\.kitia|VPS_HOST|VPS_APP_PATH" .github vps scripts config README.md .env.example` returns no unsafe public-release blockers, except documented placeholders if intentionally kept.
- Public docs explain secret configuration through environment variables, not real values.
- Handoff records that any previously exposed keys must be rotated before open sourcing.

## Verification To Run

- `npm run verify`
- `rg -n "sb_secret|sb_publishable_[A-Za-z0-9]|nimarezapoor|/home/dexter|kitia\\.ir|staging\\.kitia|cdn\\.kitia" . -g '!package-lock.json'`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task001: Publication Security Scrub. Focus on leaked credentials, private infrastructure details, unsafe placeholders, accidental deletion of required generic setup files, and public-release blockers." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with files changed, checks run, review output paths, and whether credential rotation is still externally required.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task002` can proceed.

## Completion Update

Completed by worker A on 2026-05-31.

- Files inspected/finalized for task001 scope: `.github/workflows/deploy.yml`, deleted `.github/workflows/deploy-staging.yml`, deleted `.github/workflows/rollback.yml`, `vps/README.md`, deleted private `vps/` runbooks, `scripts/backup-to-r2.mjs`, `scripts/restore-from-r2.mjs`, `config/ecosystem.config.js`, `next.config.js`, `.env.example`, `README.md`, and `SECURITY.md`.
- Security scrub result: no task001-scoped workflow, VPS, script, config, README, or env-example blocker remains for the required patterns. `SECURITY.md` records that any credentials exposed in prior private history, CI logs, deployment scripts, docs, or env files must be rotated outside the repository before open sourcing.
- Checks run:
  - `npm run verify` passed.
  - `rg -n "sb_secret|sb_publishable_[A-Za-z0-9]|nimarezapoor|/home/dexter|kitia\\.ir|staging\\.kitia|cdn\\.kitia" . -g '!package-lock.json'` passed with no matches.
  - `git diff --check` passed.
- Mandatory review loop: ran the nested review successfully; output saved at `/tmp/codex-review.Xz7Mbz.txt`. The review reported no task001 publication-security findings, but it did report valid findings in later-task surfaces: missing direct `axios` dependency for PayPal, phone normalization during profile updates, placeholder transactional email copy, and default OG image fallback. Worker A did not edit those later-task files because this task was explicitly limited to task001 finalization and concurrent workers own those areas.
- Credential rotation remains externally required before any public release.
- task002 can proceed from task001's publication-security scope. Strict downstream workflow should account for the non-task001 review findings listed above before final release readiness.

## Commit-Based Review Finalization - 2026-06-01

Scope: task001 only, following the revised commit-based workflow. Review targeted the task001 code commit, not the dirty worktree and not the full branch.

Final task001 code commit:

- `05b4d3c` - `task001: scrub private publication artifacts`

Review loop:

- Rounds 1-15 reviewed earlier task001 commits and found valid task001 issues or review/tooling failures. Valid task001 findings were fixed into task001 and the task commit was amended/replayed.
- Round 16 reviewed final commit `05b4d3c`; output saved at `tasks/open-source-boilerplate-conversion/reviews/task001-round16.txt`.
- Round 16 result: no discrete introduced correctness issues in the reviewed commit.
- Full task001 review log set is saved under `tasks/open-source-boilerplate-conversion/reviews/task001-round1.txt` through `task001-round16.txt`.

Checks recorded for the final task001 loop:

- `npm run verify` passed.
- Publication/security scrub `rg -n "sb_secret|sb_publishable_[A-Za-z0-9]|nimarezapoor|/home/dexter|kitia\\.ir|staging\\.kitia|cdn\\.kitia" . -g '!package-lock.json'` returned no matches for task001 blockers.
- `git diff --check` passed.
- The final review log records that the task001 commit's CI test and production build commands completed successfully in a clean worktree for `05b4d3c`.

Fixes folded into final task001:

- Replaced private deploy workflows with sanitized CI/build validation.
- Kept R2 helper scripts environment-driven and IPv4-safe.
- Prevented empty or incomplete backup payload behavior identified during review.
- Removed stale private deploy/docs links and corrected R2/image-resizing documentation.
- Scoped service-worker cache cleanup while preserving owned legacy-cache cleanup.
- Corrected optional-service documentation so it matches the task001-era runtime/build requirements.

Remaining blocker:

- Credential rotation remains external to the repository and is still required before making any prior private history public.

Current task001 status: commit-reviewed clean. Task002 can proceed in the sequential commit-based review queue.
