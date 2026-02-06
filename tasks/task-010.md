# Task 010 - Deployment Readiness, Runbooks, and Cutover

## Goal
Prepare safe rollout from local to preview to production with clear operational playbooks.

## Scope
- Env var finalization.
- Webhook endpoint registration.
- Observability, rollback, and post-deploy checks.

## Steps
1. Finalize `.env.example` and deployment env docs.
2. Register Stripe/PayPal webhooks for preview and production.
3. Add smoke checklist for checkout/create/callback/admin reconciliation.
4. Add rollback plan (provider disable switch + status reconciliation script).
5. Validate R2 media path before custom domain cutover.

## Edge Cases
- Domain not ready for `cdn.humarug.com` during go-live.
- Webhook secret mismatch between preview and production.
- Partial deploy where frontend and backend are out of sync.

## Acceptance Criteria
- Preview environment passes end-to-end checklist.
- Production cutover has a documented rollback path under 10 minutes.
- On-call runbook includes exact troubleshooting queries/commands.

## Rollback
- Revert deployment, disable new payment selection, and replay pending transactions from provider logs.

## Completion Notes (2026-02-07)
- Status: Completed
- Completed implementation:
  - Finalized environment templates for Stripe/PayPal cutover:
    - updated root `.env.example` to remove legacy provider/SMS vars and add Stripe/PayPal vars.
    - updated `tests/.env.example` to include Stripe/PayPal test/sandbox vars.
  - Updated deployment environment wiring:
    - `.github/workflows/deploy-staging.yml` migrated build env from Kavenegar/Zarinpal/Digipay to Stripe/PayPal.
    - `.github/workflows/deploy.yml` migrated production build env to Stripe/PayPal.
  - Replaced outdated deployment guide with current operational runbook:
    - `docs/PAYMENT_METHOD_DEPLOYMENT.md` now includes:
      - exact Stripe/PayPal webhook registration endpoints/events for preview and production.
      - preview smoke checklist for checkout/create/callback/admin reconciliation.
      - rollback plan with provider-disable hotfix path and reconciliation query.
      - R2 media path validation checklist before custom domain cutover.
- Acceptance criteria check:
  - preview and production cutover now have explicit, executable checklists and rollback path documented.
  - on-call runbook includes exact reconciliation SQL for recent transaction/provider status audits.
  - environment documentation is aligned with active providers only (Stripe/PayPal).
- Verification:
  - `timeout 360 npm run build` (pass)
