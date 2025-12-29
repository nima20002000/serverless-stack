# Getting Fresh Supabase API Keys

## For Preview Database (gozxjxtnrbuurmstjydo)

1. Go to https://supabase.com/dashboard
2. Select project: **Kitia-preview** (gozxjxtnrbuurmstjydo)
3. Navigate to **Settings** → **API**
4. Locate **Project API keys** section
5. Copy both keys:
   - **Publishable key** (anon): Starts with `sb_publishable_`
   - **Secret key** (service*role): Starts with `sb_secret*`

## Important Notes

- **DO NOT** use JWT tokens (format: `eyJ...`)
- **DO NOT** confuse with "anon" or "service_role" labels (old naming)
- **VERIFY** keys start with `sb_publishable_` or `sb_secret_`
- **UPDATE** both `.env` and `CREDENTIALS.md`

## Updating Tests

Edit `tests/.env`:

```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY_HERE
SUPABASE_SECRET_KEY=sb_secret_YOUR_KEY_HERE
```

## Verifying Keys

Run the verification script:

```bash
cd tests
npx tsx verify-supabase-keys.ts
```

Expected output:

```
Publishable Key: ✅ VALID
Secret Key:      ✅ VALID
```

## Security

- Secret key has FULL database access (bypasses RLS)
- Never commit keys to Git
- Rotate keys if compromised
