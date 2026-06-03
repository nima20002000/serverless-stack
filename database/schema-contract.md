# Public Supabase Schema Contract

## Scope

- Schema: `public`
- Canonical schema source: `supabase/migrations/20260531190011_initial_public_schema.sql`
- Optional local seed source: `supabase/seed.sql`
- Generated TypeScript source: `src/types/supabase.ts`
- Built-in payment model: `STRIPE` and `PAYPAL`

## Fresh Setup Path

Use the Supabase CLI-managed files for new projects:

```bash
npx supabase start
npx supabase db reset
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql
```

For hosted Supabase, create a project, link it locally, then push reviewed
migrations:

```bash
npx supabase login
npx supabase link
npx supabase db push
```

Do not paste service-role or secret keys into client-side environment variables.
`SUPABASE_SECRET_KEY` is server/test-only. Browser code may only receive
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Required `PaymentMethod` Enum Values

- `STRIPE`
- `PAYPAL`

## Required `transactions` Columns

- `paymentMethod`
- `stripePaymentIntentId`
- `stripeCheckoutSessionId`
- `stripeChargeId`
- `paypalOrderId`
- `paypalCaptureId`
- `paymentProviderRef`
- `paymentMetadata`

## Forbidden Legacy Artifacts

- Table: `public.otp_verifications`
- Provider-specific legacy payment columns on `public.transactions`

## Verification Command

Run this before local/predeploy releases:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql
```

## Type Generation

After applying migrations to the intended project, regenerate Supabase types and
review the diff:

```bash
npx supabase gen types typescript --linked --schema public > src/types/supabase.ts
```

The committed type file must continue to show:

```ts
PaymentMethod: 'STRIPE' | 'PAYPAL';
```
