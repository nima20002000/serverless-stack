# Setup Checklist

Use this checklist for a fresh clone.

- Install Node.js 22 or newer.
- Run `npm ci`.
- Run `npm --prefix tests ci` if you plan to run tests.
- Copy `.env.example` to `.env`.
- Add required Supabase, database, auth, Stripe, and PayPal variables.
- Add optional R2, Resend, and Upstash variables only when you use those integrations.
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
