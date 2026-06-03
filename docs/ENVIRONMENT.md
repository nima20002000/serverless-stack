# Environment Variables

`.env.example` is the source of truth for setup variables. Keep local `.env` files out of git.

## Required App Variables

- `DATABASE_URL`: Postgres connection string.
- `NEXTAUTH_URL`: Base URL used by NextAuth.
- `NEXTAUTH_SECRET`: Long random secret for session signing.
- `NEXT_PUBLIC_APP_URL`: Public app URL for links and callbacks.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase browser-safe publishable key.
- `SUPABASE_SECRET_KEY`: Server-only Supabase secret key.

## Required Payment Variables

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_ENV`

Optional payment currency variables:

- `STRIPE_CURRENCY`
- `PAYPAL_CURRENCY`

## Optional Integrations

Cloudflare R2-compatible storage:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

Email:

- `EMAIL_FROM`
- `ADMIN_EMAIL`
- `RESEND_API_KEY`
- `RESEND_SMTP_*`
- `EMAIL_SMTP_*`

Upstash Redis:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Cloudflare Image Resizing:

- `NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED`
