# Terminal Setup

This project includes a terminal setup wizard for a fresh checkout. It is built for a user who already has service accounts and API keys, but has not configured this repository yet.

## Fast Path

From a fresh clone:

```bash
npm install
npm --prefix tests install
npm run setup
npm run dev
```

Then open `http://localhost:3000`.

With Supabase, Vercel, Stripe or PayPal keys, and a domain ready, this is the shortest path to a working local store. The first production deployment still needs provider-side webhook registration and Vercel environment variables.

## What The Setup Command Checks

`npm run setup` checks and prepares:

- `.env` creation from `.env.example`.
- Required app variables: database URL, public app URL, NextAuth secret, Supabase URL, Supabase publishable key, and Supabase secret key.
- Payment variables for Stripe and PayPal. Missing payment keys are reported because checkout routes need real sandbox or live provider credentials.
- Vercel CLI login state.
- Vercel project link state through `.vercel/project.json`.
- Supabase Postgres connection through `DATABASE_URL`.
- Required public database tables.
- Critical table columns used by storefront, checkout, admin, wishlist, promo code, and order flows.
- Demo seed data for products, categories, tags, and promo codes.
- Supabase REST/PostgREST reachability for the products table.
- Repository route and config verification through `npm run verify`.

When the target database is empty, the setup command can apply:

- `supabase/migrations/20260531190011_initial_public_schema.sql`
- `supabase/seed.sql`

After applying SQL, it asks PostgREST to reload the schema cache.

## Safe Check Mode

Use this command any time you want a non-mutating health check:

```bash
npm run setup:check
```

Check mode does not write `.env`, run `vercel link`, apply migrations, or apply seed data. It reports what is missing and exits with a non-zero code when required setup is incomplete.

## Useful Flags

```bash
node scripts/setup.mjs --help
node scripts/setup.mjs --check
node scripts/setup.mjs --yes
node scripts/setup.mjs --no-prompt
node scripts/setup.mjs --skip-vercel
node scripts/setup.mjs --skip-supabase
node scripts/setup.mjs --skip-migrations
node scripts/setup.mjs --skip-seed
node scripts/setup.mjs --skip-verify
```

## Blank User Journey

1. Create a Supabase project.
2. Copy the database connection string into `DATABASE_URL`.
3. Copy Supabase API values into `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.
4. Create Stripe and/or PayPal sandbox app credentials if checkout should make real provider calls.
5. Install Vercel CLI if it is not installed, then run `vercel login`.
6. Run `npm run setup`.
7. Let the wizard create `.env`, generate `NEXTAUTH_SECRET`, link Vercel if desired, apply the initial Supabase schema on an empty database, and seed demo catalog data.
8. Run `npm run dev`.
9. For production, add the same environment variables in Vercel, register Stripe and PayPal webhooks, connect the domain, and deploy.

## Partial Database Schemas

The setup command only applies the initial migration automatically when none of the required public app tables exist. If it finds a partial schema, it stops and reports the missing tables instead of applying the migration over unknown database state.

Use a clean Supabase project for the fastest setup. For an existing database, reconcile the schema manually or apply migrations in a controlled migration workflow.
