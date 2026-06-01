# Testing

The root package exposes test shortcuts that delegate to the isolated `tests/` package.

```bash
npm --prefix tests ci
npm run test:unit
npm run test:integration
npm run test:e2e
```

Use `tests/.env` for sandbox or preview credentials. Never use production credentials in automated tests.

## Integration Tests

Integration tests can use real services:

- Supabase preview database
- Upstash Redis test database
- Resend or SMTP test account
- Cloudflare R2 test bucket
- Stripe and PayPal sandbox accounts

Minimum environment for Supabase-backed integration tests:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL` for direct schema/database checks

Use dedicated local or preview resources. Do not run integration tests against production services.

## E2E Tests

Start the app or let Playwright start it through the configured test command, then run:

```bash
npm run test:e2e
```

Playwright defaults to `en-US`, `UTC`, and mocked Stripe/PayPal payment mode. Override `E2E_BASE_URL`, `E2E_LOCALE`, or `E2E_TIMEZONE` when needed.
