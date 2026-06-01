# Supabase Vercel Stack Tests

This directory contains the boilerplate test suite. It is isolated from the main application package so unit, integration, and E2E dependencies can evolve independently.

## Install

```bash
npm --prefix tests install
```

## Environment

Copy the test example file and fill it with test or sandbox credentials:

```bash
cp tests/.env.example tests/.env
```

Use dedicated test resources. Do not point automated tests at production Supabase, Redis, storage, email, Stripe, or PayPal accounts.

## Commands

```bash
npm --prefix tests run test:unit
npm --prefix tests run test:integration
npm --prefix tests run test:e2e
npm --prefix tests run test:all
```

The root package also exposes shortcuts:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Test Types

- Unit tests mock internal boundaries and should run without external services.
- Integration tests use sandbox or preview services when configured.
- E2E tests use Playwright against a running local app.

## Safety

Never commit recorded fixtures, local `.env` files, service credentials, production database URLs, payment secrets, or generated Playwright artifacts.
