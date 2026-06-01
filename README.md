# Supabase Vercel Stack

A neutral open-source commerce boilerplate built with Next.js, Supabase, Vercel, Tailwind CSS, Stripe, and PayPal.

The project is intended as a starting point for storefronts that need product browsing, checkout, user accounts, admin workflows, media storage, and production-oriented deployment defaults. It keeps Stripe and PayPal as the built-in payment providers and documents optional integrations for Cloudflare R2, Resend, and Upstash.

## Stack

- Next.js App Router with React and TypeScript
- Supabase Postgres with the schema contract in `database/schema-contract.md`
- NextAuth for application authentication
- Stripe and PayPal payment flows
- Tailwind CSS for UI styling
- Cloudflare R2-compatible object storage for product media
- Optional Resend email delivery
- Optional Upstash Redis cache and rate limiting
- Vercel-oriented deployment

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   npm --prefix tests install
   ```

2. Create local environment files:

   ```bash
   cp .env.example .env
   cp .env.example tests/.env
   ```

3. Configure required variables in `.env`:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - Stripe and PayPal sandbox credentials if you want real checkout calls

4. Validate the expected payment schema when a database is available:

   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql
   ```

5. Start development:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Environment Variables

`.env.example` lists all required and optional variables. Use local, preview, and production values that belong to your own Supabase, payment, storage, email, and cache accounts.

Required for the app:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

Required for built-in payment providers:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_ENV`

Optional integrations:

- Cloudflare R2-compatible storage: `R2_*`
- Resend or SMTP email: `RESEND_API_KEY`, `RESEND_SMTP_*`, `EMAIL_SMTP_*`
- Upstash Redis cache/rate limiting: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Cloudflare Image Resizing: `NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED`

## Useful Commands

```bash
npm run dev              # Start local development
npm run build            # Build for production
npm start                # Start production build
npm run lint             # Run ESLint
npm run verify           # Run repository verification scripts
npm run test:unit        # Run unit tests
npm run test:integration # Run integration tests
npm run test:e2e         # Run Playwright tests
```

## Deployment

Vercel is the primary deployment target. Create a Vercel project, add the variables from `.env.example`, and register separate Stripe and PayPal webhooks for each deployed environment.

Payment webhook endpoints:

- Stripe: `/api/transactions/webhook-stripe`
- PayPal: `/api/transactions/webhook-paypal`

See `docs/PAYMENT_METHOD_DEPLOYMENT.md` and `docs/DEPLOYMENT.md` for deployment checklists.

## Project Layout

```text
src/
  app/          Next.js routes and route handlers
  components/   Reusable React components
  config/       Application configuration
  hooks/        Client hooks
  lib/          Provider clients and shared utilities
  services/     Business logic
  store/        Zustand state stores
  types/        TypeScript types
database/       Schema contract and schema validation helpers
docs/           Public setup and operations documentation
tests/          Unit, integration, and E2E tests
```

## Documentation

- `docs/SETUP_CHECKLIST.md`
- `docs/ENVIRONMENT.md`
- `docs/DEPLOYMENT.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/PAYMENT_METHOD_DEPLOYMENT.md`
- `docs/R2_SETUP.md`
- `tests/README.md`

## Contributing

Read `CONTRIBUTING.md` before opening a pull request. The repository is licensed under the MIT License.
