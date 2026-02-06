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
