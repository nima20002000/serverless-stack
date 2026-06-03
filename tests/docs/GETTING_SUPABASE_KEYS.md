# Getting Supabase API Keys For Tests

Use a disposable local or hosted Supabase project for integration and E2E tests.
Never run tests against a customer or live database that contains real user
data.

## Local Supabase

```bash
npx supabase start
npx supabase db reset
```

The CLI prints a local API URL and keys. Put them in `tests/.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local-publishable-or-anon-key>
SUPABASE_SECRET_KEY=<local-secret-or-service-role-key>
```

Local Supabase service-role JWTs are accepted only for local URLs. Hosted test
projects must use a Supabase secret key.

## Hosted Supabase

1. Create a dedicated test project in the Supabase dashboard.
2. Apply the schema from this repository with `npx supabase db push`.
3. Open **Project Settings** -> **API**.
4. Copy the project URL, publishable key, and secret key into `tests/.env`.

## Safety Notes

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can be used by browser code.
- `SUPABASE_SECRET_KEY` is server/test-only and bypasses RLS.
- Do not commit `.env`, `tests/.env`, secret keys, or service-role JWTs.
- Integration tests refuse remote Supabase URLs unless
  `TEST_ALLOW_DESTRUCTIVE_DB=I_UNDERSTAND_TEST_DATABASE_IS_DESTRUCTIVE` is set
  for a dedicated disposable hosted test project.
- Integration tests refuse configured Redis credentials unless
  `TEST_ALLOW_SHARED_REDIS=I_UNDERSTAND_TEST_REDIS_IS_DESTRUCTIVE` is set for a
  dedicated disposable Redis instance.
- E2E database helpers refuse remote Supabase URLs by default because they
  delete and insert rows. Use local Supabase for normal development, or set
  `E2E_ALLOW_DESTRUCTIVE_DB=I_UNDERSTAND_E2E_DATABASE_IS_DESTRUCTIVE` only for
  a dedicated disposable hosted test project.
- Use `E2E_BLOCKED_SUPABASE_REFS=ref_one,ref_two` to block known non-test
  project refs in E2E runs.
- If your boilerplate setup does not persist OTPs, configure
  `E2E_STATIC_OTP_CODE` to the deterministic code accepted by the test app
  before running OTP journeys.

## Verify Keys

```bash
npx tsx tests/verify-supabase-keys.ts
```

Expected result: the publishable-key check can read public catalog data, and the
secret-key check can write and clean up test rows.
