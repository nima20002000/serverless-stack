# Task 007 - Checkout UI and API Contract Update

## Goal
Update client checkout UX to expose only Stripe and PayPal with correct payload contract.

## Scope
- Remove legacy gateway options from UI.
- Replace request payloads and redirect handling.
- Update error and retry messaging.

## Steps
1. Replace payment selector with `stripe` and `paypal` options.
2. Remove Digipay surcharge UI and legacy labels.
3. Update checkout submit to call new provider-specific flow.
4. Add clear handling for canceled, failed, and pending outcomes.

## Edge Cases
- User changes payment method after transaction draft created.
- Browser refresh during redirect/return.
- Slow webhook causes temporary pending state.

## Acceptance Criteria
- UI shows only active providers.
- No request sends legacy method values.
- User can recover from canceled/failed payment without corrupt cart state.

## Rollback
- Keep old checkout page route available in branch-only fallback during staged rollout.

## Completion Notes (2026-02-07)
- Status: Completed
- Completed implementation:
  - Updated checkout provider selection in `src/app/checkout/page.tsx`:
    - removed legacy gateway options (`zarinpal`, `digipay`, `zibal`) from UI.
    - limited selectable methods to `stripe` and `paypal`.
    - removed Digipay surcharge/installment UI and modal flow.
    - ensured request payload sends only canonical methods via `paymentMethod.toUpperCase()` (`STRIPE` / `PAYPAL`).
  - Tightened transaction creation contract in `src/app/api/transactions/create/route.ts`:
    - accepts only `STRIPE` and `PAYPAL`.
    - removed legacy provider normalization/fallback branches from create flow.
    - removed legacy response identifiers (`authority`, `ticket`, `trackId`) from create response.
  - Added explicit pending/cancel/failed handling across payment result UX:
    - added `GET /api/transactions/status` in `src/app/api/transactions/status/route.ts` for safe transaction-status polling by transaction code.
    - updated `src/app/payment/success/page.tsx` to poll transaction status and only clear cart after confirmed `COMPLETED`.
    - updated `src/app/payment/failure/page.tsx` to render clear messages for cancelled, pending, and failed outcomes.
- Acceptance criteria check:
  - UI now shows only active providers (Stripe, PayPal).
  - checkout request no longer sends legacy payment values.
  - canceled/failed/pending states now keep cart state intact unless payment completion is confirmed.
- Verification:
  - `npm run build` (pass)
