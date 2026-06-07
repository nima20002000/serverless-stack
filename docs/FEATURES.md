# Serverless Stack Features

Serverless Stack is a production-minded online store boilerplate. It is not a hosted page builder. It is a codebase that humans can own and AI agents can customize.

## Positioning

Use this project when you want a free starting point for a real online store without signing up for Shopify, WordPress, WooCommerce, or a VPS. The app is built around managed serverless services: Vercel for hosting, Supabase for Postgres and API access, provider APIs for payments and email, and optional managed storage/cache services.

The practical requirement is small: create the required free-tier API keys, connect a domain, and customize the code for the business. The project is intentionally understandable by AI coding agents, so most customization work can be delegated as normal software tasks.

## Included Screens

![Storefront homepage](assets/home.png)

![Product catalog](assets/products.png)

Presentation-ready screenshots are available in `docs/presentation-snapshots/`:

- Storefront: home, catalog, product detail, cart, checkout, payment status, profile, wishlist, mobile dark theme, and localized examples.
- Admin: dashboard, products, localized product editor, variant swatches/crop controls, categories, media storage browser, settings/languages/RTL, users, transactions/invoice detail, sales analytics, and fallback states.

Additional static documentation images are available in `docs/assets/`:

- `home.png`
- `products.png`
- `product-detail.png`
- `cart.png`

## Priority Feature Inventory

### 1. Storefront

- Public homepage with storefront-first positioning.
- Product catalog page.
- Product detail page.
- Product variant display with stock, price adjustment, media, and swatches.
- Category and tag data model.
- Featured products and sale products.
- Related product section.
- Stock-aware product cards.
- Search entry points.
- Locale-prefixed storefront routes.
- LTR/RTL-capable site configuration.
- Configurable site metadata, locale, currency, and Open Graph defaults.

### 2. Shopping Workflow

- Persistent cart store.
- Quantity controls.
- Stock validation.
- Wishlist store and user wishlist API routes.
- Guest checkout fields.
- User checkout support.
- Promo code validation and discount calculation.
- Payment success, failure, and verification pages.

### 3. Payments

- Stripe Checkout session creation.
- Stripe webhook route.
- PayPal order creation.
- PayPal capture route.
- PayPal webhook route.
- Transaction records with provider references.
- Transaction items.
- Status tracking for pending, completed, and failed payments.
- Payment metadata storage.
- Idempotent successful-payment finalization path.

### 4. Admin

- Admin dashboard route group.
- Product management.
- Product variant management.
- Variant media and swatch crop controls.
- Localized product, media alt text, and tag translation controls.
- Category management.
- Tag management.
- User management.
- Transaction management.
- Invoice and transaction detail surfaces.
- Sales analytics.
- Promo code management.
- Site settings management.
- Language settings with LTR/RTL-aware options.
- Product media workflows.
- Media library and storage browser workflows.
- Bulk product, category, and user operations.
- Role-protected admin access.

### 5. Database and Security

- Supabase Postgres schema migration.
- Seed data for local/demo startup.
- Row Level Security enabled for public tables.
- Public read policies for storefront-safe catalog data.
- Service-role-only access for sensitive operations.
- Schema validation scripts.
- RLS security documentation.
- Activity logging table.
- Wishlist and promo-code usage tables.

### 6. Media and Storage

- Product media table.
- Variant-aware media fields.
- Cloudflare R2-compatible storage adapter.
- Admin media upload routes.
- Optional Cloudflare image resizing.
- R2 backup helper configuration.

### 7. Accounts and Email

- NextAuth session provider.
- Register and login routes.
- Password update API.
- User profile API.
- User transaction history.
- Optional Resend email.
- Optional SMTP email.
- Sign-in and order email templates.

### 8. Performance and Operations

- Guided terminal setup with `npm run setup`.
- Non-mutating setup health check with `npm run setup:check`.
- Environment validation and automatic local `NEXTAUTH_SECRET` generation.
- Empty-database Supabase migration and seed application.
- Supabase table, column, and REST API checks.
- Vercel CLI login and project-link checks.
- Optional Upstash Redis caching.
- API rate limiting.
- Structured logging.
- Route verification scripts.
- Config-file verification scripts.
- Release checklist.
- Deployment checklist.
- Payment deployment checklist.
- Unit, integration, and E2E test structure.
- Storybook setup for UI work.

## AI Agent Customization Examples

The codebase is intentionally explicit: routes live in `src/app`, business logic lives in `src/services`, provider clients live in `src/lib`, shared state lives in `src/store`, and database expectations live in `supabase/migrations` plus `database/`.

Useful prompts for an AI coding agent:

- Change the visual design for a specific industry.
- Add product bundles or subscriptions.
- Add local delivery pricing.
- Add a CSV product importer.
- Add another payment provider while keeping Stripe and PayPal.
- Localize the storefront.
- Add invoice customization.
- Add a custom admin dashboard metric.
- Replace the seed catalog with production product data.

## Launch Inputs

Minimum production inputs:

- Domain name.
- Vercel project.
- Supabase project and database URL.
- Supabase publishable and secret keys.
- NextAuth URL and secret.
- Stripe or PayPal credentials.

Optional production inputs:

- Cloudflare R2 bucket and public media hostname.
- Resend or SMTP credentials.
- Upstash Redis credentials.
- Cloudflare image resizing configuration.
