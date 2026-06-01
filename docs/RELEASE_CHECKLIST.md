# Release Checklist

Use this checklist before publishing a fork, cutting a release, or making the repository public.

## Required Checks

```bash
npm ci
npm --prefix tests ci
npm run verify
npm run lint
npm run test:unit
npm run build
npm run build-storybook
npm audit --omit=dev
```

Run integration and E2E tests when the matching environment is available:

```bash
npm run test:integration
npm run test:e2e
```

## Secret And Artifact Scan

- Search for private names, hosts, personal paths, legacy provider names, non-English default copy, and secret-like values. Use a project-specific pattern list outside committed docs so retired private identifiers are not reintroduced here.

  ```bash
  rg -n "<legacy-brand-or-private-artifact-pattern>" . -g '!package-lock.json' -g '!tests/package-lock.json'
  ```

- Confirm `.env`, `tests/.env`, Vercel files, Playwright output, coverage output, and local build artifacts are not tracked.
- Rotate any credential that may have existed in private history, logs, scripts, docs, or previous environment files before making history public.

## Supabase

- Apply migrations to a disposable local or preview project.
- Validate schema expectations:

  ```bash
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql
  ```

- Confirm RLS policies and Data API exposure for the tables your app needs. New Supabase projects may not expose public tables to Data and GraphQL APIs automatically, so verify grants and API settings before release.

## Payments

- Register Stripe and PayPal webhook endpoints for every deployed environment.
- Confirm webhook secrets and PayPal webhook IDs match the environment.
- Confirm payment creation, webhook reconciliation, duplicate event handling, and failed/canceled returns in sandbox mode.

## Documentation

- Re-check `README.md`, `.env.example`, `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`, `docs/PAYMENT_METHOD_DEPLOYMENT.md`, and `tests/README.md`.
- Make sure optional services are described as optional and no deployment docs reference private infrastructure.
- Confirm the license, contribution guide, and security policy are present.
