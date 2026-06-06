# Email Delivery Checks

Date: 2026-06-06
Scope: `NIM-160`

Normal local unit tests use mocked Resend/SMTP transports. They prove rendered
payloads, recipients, provider selection, skipped-recipient behavior, and
payment-finalization notification side effects without sending real email.

## Local Unit Coverage

```bash
npm --prefix tests run test:unit -- unit/lib/email-client.test.ts unit/lib/finalize-successful-transaction.test.ts
```

Covered behavior includes:

- OTP recipient, subject, HTML code block, text code, and provider selection.
- Buyer order confirmation recipient, subject, payment method, item rows,
  shipping fields, and HTML escaping for user-controlled fields.
- Admin order confirmation recipient, payment reference, account type, and HTML
  escaping for customer fields.
- Missing buyer/admin recipients returning explicit skipped-email results.
- Provider failure returning a sanitized error without logging configured
  secrets.
- Successful payment finalization sending or skipping admin/buyer notifications
  with logged side effects.

## Sandbox-Only Delivery

Run real delivery checks only with a sandbox email account and test recipients.
Do not use production mailing credentials during normal local or CI runs.

The current integration harness runs `tests/integration/setup.ts` first, so this
command also requires reachable local or disposable Supabase before any email
assertion runs. `email-service.test.ts` enforces real delivery only for a live
`RESEND_API_KEY`; SMTP-only configuration is still useful as a smoke check but
does not currently force a successful sandbox delivery assertion.

```bash
npm --prefix tests run test:integration -- email-service.test.ts
```

Record the provider message ids and test recipient addresses when a sandbox
delivery run is performed.
