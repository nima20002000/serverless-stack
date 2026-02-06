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
