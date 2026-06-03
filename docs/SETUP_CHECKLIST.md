# Setup Checklist

Use this checklist for a fresh clone.

- Install Node.js 22 or newer.
- Run `npm ci`.
- Run `npm --prefix tests ci` if you plan to run tests.
- Run `npm run setup` for the guided terminal setup.
- Run `npm run setup:check` any time you need a non-mutating setup health check.
- Let the setup wizard create `.env`, generate `NEXTAUTH_SECRET`, check Vercel login/link state, verify Supabase, apply the initial schema to an empty database, seed demo data, and run repository verification.
- If you do not use the wizard, copy `.env.example` to `.env`.
- Add required Supabase, database, auth, Stripe, and PayPal variables.
- Add optional R2, Resend, and Upstash variables only when you use those integrations.
- Keep Stripe and PayPal in sandbox while validating checkout. Switch to live provider credentials only when production webhook endpoints and domain settings are ready.
- Register the first admin account through the app, then promote that trusted user in Supabase before using `/admin`:

  ```sql
  update public.users
  set role = 'ADMIN'
  where email = 'admin@example.com';
  ```

  Use your own account identifier and run this only from a trusted Supabase SQL editor or server-side database session. Do not expose service-role or secret keys in client code.

- Run `npm run verify`.
- Run `npm run lint` and `npm run test:unit` before opening a pull request.
- Start the app with `npm run dev`.
- Register Stripe and PayPal sandbox webhooks for local or preview testing.
- Validate the payment schema before release:

  ```bash
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql
  ```
