# Development Workflow

## Local Loop

```bash
npm install
cp .env.example .env
npm run dev
```

Use sandbox credentials for Stripe, PayPal, Supabase, email, storage, and cache during development.

## Database Changes

The public payment schema contract is documented in `database/schema-contract.md`. Validate a configured database with:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql
```

Keep schema changes in migration files and update the schema contract when payment-related columns or enums change.

## Verification

Run the checks that match your change:

```bash
npm run verify
npm run lint
npm run test:unit
npm run test:integration
npm run test:e2e
```

Integration and E2E tests require configured sandbox or preview services.

## Pull Requests

- Keep changes scoped.
- Include verification output.
- Do not commit local env files, credentials, service exports, or generated reports.
- Document any new required environment variable in `.env.example`, `docs/ENVIRONMENT.md`, and relevant deployment docs.
