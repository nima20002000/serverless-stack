# Contributing

Thanks for helping improve Supabase Vercel Stack.

## Local Setup

1. Install dependencies:

   ```bash
   npm ci
   npm --prefix tests ci
   ```

2. Copy environment examples:

   ```bash
   cp .env.example .env
   cp .env.example tests/.env
   ```

3. Use local, preview, or sandbox service credentials only.

## Before Opening a Pull Request

Run the strongest checks that are practical for your change:

```bash
npm run verify
npm run lint
npm run test:unit
npm run build
```

Run integration and E2E tests when your change touches Supabase, payments, auth, storage, email, cache, routing, or user workflows.

## Guidelines

- Keep the boilerplate brand-neutral.
- Do not commit secrets, local `.env` files, private infrastructure details, or production credentials.
- Keep Stripe and PayPal as the built-in payment providers unless a feature explicitly changes the provider model.
- Document optional integrations as optional.
- Prefer small, focused pull requests with clear verification notes.
