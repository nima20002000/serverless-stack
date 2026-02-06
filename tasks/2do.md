# Payment/Env Refactor TODO

## 1) Remove Unused Providers and SMS Dependencies
- [ ] Remove Kavenegar integration code and any SMS send/confirm flows.
- [ ] Remove legacy payment gateway integrations and flags for Zarinpal, Zibal, and Digipay.
- [ ] Remove dead config paths and feature toggles related to the removed providers.
- [ ] Verify checkout/auth flows do not require SMS confirmation anywhere.

## 2) Environment Variable Cleanup
- [ ] Update `.env.example` to remove unused vars:
  - [ ] `KAVENEGAR_API_KEY`
  - [ ] `KAVENEGAR_TEMPLATE_NAME`
  - [ ] `KAVENEGAR_ORDER_CONFIRMATION_TEMPLATE_NAME`
  - [ ] `KAVENEGAR_SENDER`
  - [ ] `ZARINPAL_MERCHANT_ID`
  - [ ] `ZARINPAL_SANDBOX`
  - [ ] `ZIBAL_MERCHANT`
  - [ ] `ZIBAL_SANDBOX`
  - [ ] `DIGIPAY_CLIENT_ID`
  - [ ] `DIGIPAY_CLIENT_SECRET`
  - [ ] `DIGIPAY_USERNAME`
  - [ ] `DIGIPAY_PASSWORD`
  - [ ] `DIGIPAY_SANDBOX`
  - [ ] `DIGIPAY_BASE_URL`
- [ ] Remove SMS/test-only env vars if they are not used in active tests.
- [ ] Keep only env vars required by active code paths and tests.

## 3) Add Stripe
- [ ] Add Stripe SDK/config and payment service abstraction integration.
- [ ] Add required env vars:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] Implement checkout session/payment intent flow.
- [ ] Add webhook endpoint for payment status updates and order reconciliation.
- [ ] Add sandbox/test-mode support and test cases.

## 4) Add PayPal
- [ ] Add PayPal SDK/config integration.
- [ ] Add required env vars:
  - [ ] `PAYPAL_CLIENT_ID`
  - [ ] `PAYPAL_CLIENT_SECRET`
  - [ ] `PAYPAL_WEBHOOK_ID`
  - [ ] `PAYPAL_ENV` (`sandbox` or `live`)
- [ ] Implement create/capture order flow.
- [ ] Add webhook handling for payment lifecycle events.
- [ ] Add sandbox/test coverage.

## 5) Checkout and Data Model Updates
- [ ] Refactor payment method selection to only active providers (Stripe, PayPal).
- [ ] Ensure order/payment schema supports both providers consistently.
- [ ] Add idempotency and retry-safe logic for callbacks/webhooks.
- [ ] Update admin/order views with provider transaction references.

## 6) Documentation and Rollout
- [ ] Update setup docs for new env vars and local/dev setup.
- [ ] Add migration notes for removing old provider env vars from production.
- [ ] Add runbook for Stripe/PayPal webhook setup and verification.
- [ ] Smoke test checkout end-to-end before deployment.

========
features list we need later

1- google social login.

