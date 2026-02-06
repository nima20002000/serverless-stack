# Stripe + PayPal Deployment Runbook

## Scope

- This runbook covers payment cutover for `STRIPE` and `PAYPAL`.
- It includes environment setup, webhook registration, smoke checks, rollback, and reconciliation.

## 1) Environment Variables

Set these in local, preview, and production:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY` (optional, default `usd`)
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_ENV` (`sandbox` or `live`)
- `PAYPAL_CURRENCY` (optional, default `USD`)

Also required for app/runtime:

- `NEXT_PUBLIC_APP_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

## 2) Webhook Registration

### Stripe

Register endpoint:

- `https://<env-domain>/api/transactions/webhook-stripe`

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.refunded`
- `charge.refund.updated`

Set `STRIPE_WEBHOOK_SECRET` to the secret for each environment (preview/prod are different).

### PayPal

Register endpoint:

- `https://<env-domain>/api/transactions/webhook-paypal`

Subscribe to:

- `PAYMENT.CAPTURE.COMPLETED`
- `CHECKOUT.ORDER.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.DECLINED`
- `CHECKOUT.ORDER.EXPIRED`
- `CHECKOUT.ORDER.VOIDED`
- `PAYMENT.CAPTURE.REFUNDED`
- `PAYMENT.CAPTURE.REVERSED`

Set `PAYPAL_WEBHOOK_ID` to the webhook ID for each environment.

## 3) Preview Smoke Checklist

Run in preview before production:

1. Create transaction from checkout with `STRIPE`.
2. Complete Stripe payment and confirm redirect to success page.
3. Confirm transaction row moved `PENDING -> COMPLETED`.
4. Confirm admin transaction page shows provider refs (session/payment intent when available).
5. Repeat with `PAYPAL` including return/capture path.
6. Trigger one failed flow per provider and confirm `FAILED` behavior/UX.
7. Replay a successful webhook payload once per provider and confirm idempotent no-op (no duplicate completion side effects).

## 4) Post-Deploy Checks (Production)

After deploy:

1. Verify webhook deliveries are `2xx` in Stripe and PayPal dashboards.
2. Confirm recent transaction statuses in DB align with provider dashboards.
3. Confirm admin transaction listing and user profile history show expected statuses.
4. Confirm no growth in pending transactions beyond expected checkout abandonment baseline.

## 5) Rollback Plan (Target < 10 Minutes)

1. Disable provider selection in checkout UI (hotfix branch) so only the stable provider is selectable.
2. Keep webhook endpoints active to process late provider events.
3. Reconcile pending transactions using provider references:
   - `paymentProviderRef`
   - `stripePaymentIntentId`
   - `paypalOrderId`
   - `paypalCaptureId`
4. Redeploy last known stable release.

Reconciliation query template:

```sql
select
  id,
  "transactionCode",
  status,
  "paymentMethod",
  "paymentProviderRef",
  "stripePaymentIntentId",
  "paypalOrderId",
  "paypalCaptureId",
  "updatedAt"
from transactions
where "updatedAt" > now() - interval '24 hours'
order by "updatedAt" desc;
```

## 6) R2 Media Path Validation Before CDN Cutover

Before switching to the custom media domain:

1. Verify `R2_PUBLIC_URL` points to the target host.
2. Confirm at least one image URL resolves with HTTP `200`.
3. Confirm checkout/product pages load media from `R2_PUBLIC_URL` without mixed-domain regressions.
4. Only then switch DNS/custom-domain routing to final host.
