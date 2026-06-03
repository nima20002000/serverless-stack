# Test Implementation Guide

This guide keeps new tests realistic, deterministic, and public-safe.

## Principles

- Prefer focused assertions that verify concrete values, state changes, and error contracts.
- Keep unit tests isolated with mocks at external boundaries.
- Keep integration tests idempotent and clean up their own data.
- Use neutral English fixture data, E.164-style test phone numbers, and `example.com` email addresses.
- Use only Stripe and PayPal for built-in payment-provider coverage.
- Never commit recorded credentials, production URLs, payment secrets, database dumps, or generated Playwright artifacts.

## Unit Tests

Run without live services:

```bash
npm run test:unit
```

Use unit tests for route-handler behavior, service branching, validation, formatting, store behavior, webhook reconciliation, and failure paths.

## Integration Tests

Run only with a dedicated local or preview test environment:

```bash
npm run test:integration
```

Required environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL` when schema or direct database checks are used
- Optional sandbox credentials for Redis, storage, email, Stripe, and PayPal tests

Do not point integration tests at production services.

## E2E Tests

Run Playwright tests against a local app:

```bash
npm run test:e2e
```

E2E defaults:

- Locale: `en-US`
- Time zone: `UTC`
- Payment mode: mocked Stripe/PayPal flows
- Browser output: `tests/e2e/test-results/`

Override with `E2E_LOCALE`, `E2E_TIMEZONE`, and `E2E_BASE_URL` when needed.

## Review Checklist

- Assertions would fail for a real regression.
- Test data is generic and easy to clean up.
- No production identifiers, private hostnames, personal paths, or secret-like values are present.
- Tests do not require live third-party credentials in normal CI.
- Integration-only requirements are documented near the command that needs them.
