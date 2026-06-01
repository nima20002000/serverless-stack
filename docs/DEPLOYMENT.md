# Vercel Deployment

Vercel is the default deployment target for this boilerplate.

## Preview

1. Create or connect a Vercel project.
2. Add environment variables from `.env.example`.
3. Use sandbox Stripe and PayPal credentials for preview deployments.
4. Use preview Supabase, storage, email, and cache resources when possible.
5. Register preview webhook endpoints:
   - `/api/transactions/webhook-stripe`
   - `/api/transactions/webhook-paypal`
6. Run checkout smoke tests for Stripe and PayPal.

## Production

1. Set production environment variables in Vercel.
2. Register production Stripe and PayPal webhooks with the production domain.
3. Validate the database schema:

   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/validate_payment_schema.sql
   ```

4. Deploy through Vercel.
5. Confirm webhook deliveries, transaction status updates, and media loading.

## Secrets

Never commit real credentials. If this repo was converted from a private application, rotate any previously exposed credentials before making it public.
