# Task 003 - Remove OTP and SMS Runtime Dependencies

## Goal
Remove OTP and SMS code paths so runtime no longer depends on `otp_verifications` or Kavenegar.

## Scope
- Remove OTP service/routes/UI flows.
- Remove SMS confirmation calls after payment.
- Keep password-based auth flow operational.

## Steps
1. Remove `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/checkout-verify-otp` route usage.
2. Remove `otp-service` and `sms-service` runtime calls.
3. Update auth/checkout UI to eliminate OTP states and forms.
4. Remove Kavenegar imports to prevent startup failures from missing env vars.

## Edge Cases
- Checkout currently expects OTP token to continue account creation path.
- Existing accounts created via OTP-only path (no password) cannot login.
- Middleware rate-limit branches still target removed OTP endpoints.

## Acceptance Criteria
- App starts with no Kavenegar env vars configured.
- No runtime query touches `otp_verifications`.
- Login/register/checkout flows work without OTP screens.

## Rollback
- Feature flag the OTP removal branch and keep legacy routes disabled but recoverable for emergency access.

## Completion Notes (2026-02-07)
- Status: Completed
- Completed implementation:
  - Removed OTP runtime routes and flows:
    - deleted `src/app/api/auth/send-otp/route.ts`
    - deleted `src/app/api/auth/verify-otp/route.ts`
    - deleted `src/app/api/auth/checkout-verify-otp/route.ts`
    - deleted `src/app/(auth)/verify-otp/page.tsx`
    - deleted `src/components/auth/OTPInput.tsx`
  - Removed OTP/SMS runtime services and token helper:
    - deleted `src/services/otp-service.ts`
    - deleted `src/services/sms-service.ts`
    - deleted `src/lib/auth/otp-token.ts`
  - Removed OTP/SMS runtime dependencies from active app paths:
    - `src/lib/auth/options.ts` now enforces password-based credentials only.
    - `src/app/(auth)/login/page.tsx` removed OTP login mode.
    - `src/app/(auth)/register/page.tsx` now registers directly via `/api/auth/register`.
    - `src/app/api/auth/register/route.ts` accepts phone/email identifier registration.
    - `src/components/checkout/CheckoutForm.tsx` removed OTP/account-verification UI states.
    - `src/app/checkout/page.tsx` removed OTP-derived payload fields.
    - `src/app/profile/page.tsx` and `src/components/profile/PasswordManagementCard.tsx` removed OTP password reset UX.
    - `src/middleware.ts` removed OTP endpoint rate-limit branches.
    - `src/app/api/transactions/verify*.ts` removed SMS confirmation calls/imports.
- Verification:
  - `rg -n "send-otp|verify-otp|checkout-verify-otp|reset-password-otp" src` (no matches)
  - `rg -n "otp_verifications" src` (no matches)
  - `rg -n "@/lib/kavenegar/client|lib/kavenegar/client" src` (no matches)
  - `npm run build` (pass)
