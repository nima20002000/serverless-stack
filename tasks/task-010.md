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
