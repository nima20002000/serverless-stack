# Supabase RLS Notes

Supabase projects should enable Row Level Security on tables exposed through the
Data API. This boilerplate enables RLS in
`supabase/migrations/20260531190011_initial_public_schema.sql` and grants
browser roles read-only access only to public catalog data.

## Checklist

- Enable RLS on public tables that are reachable through Supabase APIs.
- Grant access to `anon` and `authenticated` roles only when the table is intentionally exposed.
- Keep secret keys and service credentials out of client bundles.
- Prefer `security_invoker = true` for views on Postgres versions that support it.
- Avoid security-definer functions in exposed schemas.
- Test policies with authenticated and anonymous sessions before launch.

## Default Public Tables

The initial migration grants `SELECT` policies to `anon` and `authenticated` for
active categories, tags, active products, active variants, product media,
product-tag joins, and site settings. User, transaction, invoice, promo-code
usage, wishlist, and activity-log tables stay server-only by default.

## Server Access

Application services use `SUPABASE_SECRET_KEY` from server-only code. That key
must never be exposed through `NEXT_PUBLIC_*` variables, client bundles, browser
logs, screenshots, docs, or checked-in fixtures.

## Payment Schema Validation

The built-in payment schema targets Stripe and PayPal:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql
```

See `database/schema-contract.md` for the expected payment enum values and transaction columns.
