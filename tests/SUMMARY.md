# Test Suite Summary

The `tests/` package contains the boilerplate's unit, integration, and Playwright E2E suites. It uses neutral fixture data, English assertions, and sandbox-only provider assumptions.

## Coverage Areas

- Unit tests for services, route handlers, stores, hooks, storage, email, payment webhooks, and shared utilities.
- Integration tests for Supabase-backed services, Redis/rate-limit behavior, email, storage, admin workflows, and Stripe/PayPal payment verification.
- E2E journeys for public browsing, auth, checkout, wishlist, promo codes, admin workflows, cache busting, and error recovery.

## Provider Boundaries

- Unit tests mock external network boundaries.
- Integration tests require dedicated test or preview services and must never use production credentials.
- Stripe and PayPal are the only built-in payment providers covered by payment tests.
- E2E payment journeys use mock payment mode unless explicitly configured otherwise.

## Normal Commands

```bash
npm --prefix tests ci
npm --prefix tests run test:unit
npm --prefix tests run test:integration
npm --prefix tests run test:e2e
```

Use the root shortcuts when working from the repository root:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

Integration and E2E runs need a local app and configured sandbox services. See `tests/README.md` and `docs/TESTING.md`.
