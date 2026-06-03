# Preview Database Checks

Use a dedicated Supabase preview project or branch for preview deployments and integration tests.

## Checklist

- `DATABASE_URL` points to the preview database.
- `NEXT_PUBLIC_SUPABASE_URL` points to the preview Supabase project.
- `SUPABASE_SECRET_KEY` belongs to the preview project and is stored only in server-side environment variables.
- Payment webhooks use preview deployment URLs and sandbox credentials.
- Test data is safe to reset.

Before release, validate the payment schema:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql
```
