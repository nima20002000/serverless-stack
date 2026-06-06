# NIM-148 Coverage Matrix

Date: 2026-06-06
Branch: `linear-comprehensive-feature-goals`

This matrix audits implemented `serverless-stack` behavior against authored test
coverage. It distinguishes behavior coverage from file/line coverage. A feature
is only marked covered when tests prove a user-visible behavior, data side
effect, authorization boundary, or failure path.

## Evidence Commands

Run from the repo root:

```bash
git status --short --branch
find src/app -path '*/api/*' -type f | sort
find tests -path 'tests/node_modules' -prune -o -type f \( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' -o -name '*.spec.tsx' \) -print | sort
sed -n '1,220p' tests/vitest.config.unit.ts
sed -n '1,220p' tests/vitest.config.integration.ts
cat tests/package.json
```

## Coverage Status Legend

- Strong: unit/integration/E2E coverage proves meaningful behavior and side
  effects.
- Partial: useful tests exist, but an important route, UI path, side effect, or
  failure mode is missing or only mocked.
- Missing: implemented behavior has no meaningful test coverage found.
- Manual-only: not reasonably automated today; reason must be explicit.

## High-Priority Findings

1. Hook test execution was backfilled by `NIM-153`: the unit config now includes
   `unit/**/*.test.tsx`, and `tests/unit/hooks/*.test.tsx` run under
   `npm run test:unit`.
2. Admin product/category/tag API route coverage is weaker than service
   coverage. Admin users, transactions, stats, and settings have direct route
   tests; admin products/categories/tags mostly rely on service tests and E2E
   happy paths.
3. Several integration tests directly mutate Supabase to prove schema/data
   behavior. Those are useful, but they do not always prove the app service/API
   contract that production code uses.
4. Payment E2E uses mock payment mode. Unit tests cover Stripe/PayPal webhook
   validation, amount/currency mismatch, and idempotency, but real sandbox
   provider E2E is not covered and should remain manual or a separately
   configured contract suite.
5. Admin UI E2E is strongest for auth, products/categories, promo codes,
   settings, and variant images. Admin users, transactions, and dashboard
   interactions are shallow in Playwright.

## Matrix

| Feature area                            | Implemented behavior evidence                                                                                                                                                                                                 | Meaningful tests found                                                                                                                                                                                                                                                                                                                                                                                                                              | Status  | Gaps and needed coverage                                                                                                                                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth login/register/session             | `src/lib/auth/options.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts`, `src/services/auth-service.ts`, `src/services/user-service.ts`                                                            | `tests/unit/api/auth/login.test.ts`, `tests/unit/api/auth/register.test.ts`, `tests/unit/services/auth-service.test.ts`, `tests/unit/services/user-service.test.ts`, `tests/integration/auth-service.test.ts`, `tests/integration/activity-login.test.ts`, `tests/integration/activity-register.test.ts`, `tests/e2e/journeys/user-login.spec.ts`, `tests/e2e/journeys/user-registration.spec.ts`                                                   | Strong  | [Unit] NextAuth route test is mostly handler-export coverage. Add stronger session/callback behavior tests if session mapping changes.                                                                                                    |
| Password/profile                        | `src/app/api/user/password/route.ts`, `src/app/api/user/profile/route.ts`, `src/components/profile/ProfileEditForm.tsx`, `src/components/profile/PasswordManagementCard.tsx`, `src/components/profile/TransactionHistory.tsx` | `tests/unit/api/user/password.test.ts`, `tests/unit/api/user/profile.test.ts`, `tests/unit/services/user-service-password.test.ts`, `tests/unit/services/user-service-validation.test.ts`, `tests/integration/activity-password.test.ts`, `tests/integration/activity-profile.test.ts`, `tests/integration/user-service.test.ts`                                                                                                                    | Partial | [Playwright E2E] Add focused profile edit/password journey proving persisted profile changes, current-password validation, and failure copy.                                                                                              |
| Catalog products/categories/tags        | `src/services/product-service.ts`, `src/services/category-service.ts`, `src/services/tag-service.ts`, `src/app/products/page.tsx`, `src/app/products/[id]/page.tsx`, public product/category/tag APIs                         | `tests/unit/api/products/*.test.ts`, `tests/unit/api/categories.test.ts`, `tests/unit/api/tags.test.ts`, `tests/unit/services/product-service.test.ts`, `tests/unit/services/category-service.test.ts`, `tests/unit/services/tag-service.test.ts`, `tests/integration/product-service.test.ts`, `tests/integration/category-service.test.ts`, `tests/integration/tag-service.test.ts`, `tests/e2e/journeys/search.spec.ts`                          | Strong  | [Unit/API route] Add route-level coverage for admin product/category/tag APIs and bulk/reorder routes; current coverage is mostly service-level plus E2E happy path.                                                                      |
| Search                                  | `src/services/search-service.ts`, `src/app/api/search/route.ts`, `src/components/ui/SearchBar.tsx`                                                                                                                            | `tests/unit/api/search.test.ts`, `tests/unit/services/search-service.test.ts`, `tests/integration/search-service.test.ts`, `tests/e2e/journeys/search.spec.ts`                                                                                                                                                                                                                                                                                      | Strong  | [Playwright E2E] Add coverage for empty/no-result and malformed query UI if search UX changes.                                                                                                                                            |
| Cart store and UI                       | `src/store/cart-store.ts`, `src/components/cart/*`, `src/app/cart/page.tsx`                                                                                                                                                   | `tests/unit/store/cart-store.test.ts`, `tests/e2e/journeys/multi-product-cart.spec.ts`, `tests/e2e/smoke.spec.ts`, `tests/e2e/error-recovery.spec.ts`                                                                                                                                                                                                                                                                                               | Strong  | [Future feature] Cross-tab synchronization is not implemented yet and is tracked by `NIM-143`; not a current coverage gap.                                                                                                                |
| Checkout                                | `src/app/checkout/page.tsx`, `src/components/checkout/CheckoutForm.tsx`, `src/store/checkout-store.ts`, `src/app/api/transactions/create/route.ts`                                                                            | `tests/unit/store/checkout-store.test.ts`, `tests/unit/api/transactions/create-status.test.ts`, `tests/integration/transaction-service.test.ts`, `tests/e2e/journeys/guest-checkout.spec.ts`, `tests/e2e/journeys/authenticated-checkout.spec.ts`, `tests/e2e/error-recovery.spec.ts`                                                                                                                                                               | Strong  | [Playwright E2E] Payment result pages have less standalone coverage. [Manual-only/contract] Provider E2E is mocked by design; real sandbox provider checks need a safe sandbox suite.                                                     |
| Transactions, Stripe, PayPal            | `src/services/transaction-service.ts`, `src/lib/payments/finalize-successful-transaction.ts`, `src/lib/stripe/client.ts`, `src/lib/paypal/client.ts`, transaction/webhook/capture APIs                                        | `tests/unit/api/transactions/*.test.ts`, `tests/unit/services/transaction-service.test.ts`, `tests/integration/transaction-service.test.ts`, `tests/integration/payment-verification.test.ts`, checkout E2E specs                                                                                                                                                                                                                                   | Partial | [Unit/API route] Add direct test for `src/app/api/transactions/[id]/route.ts` if the route remains. [Manual-only/contract] Keep real provider sandbox E2E manual unless safe credentials and cleanup are formalized.                      |
| Promo codes                             | `src/services/promo-service.ts`, `src/app/api/promo/active/route.ts`, `src/app/api/promo/validate/route.ts`, `src/app/admin/promo-codes/page.tsx`                                                                             | `tests/unit/api/promo/active.test.ts`, `tests/unit/api/promo/validate.test.ts`, `tests/unit/services/promo-service.test.ts`, `tests/integration/promo-service.test.ts`, `tests/e2e/journeys/promo-codes.spec.ts`, `tests/e2e/journeys/admin-promo-codes.spec.ts`                                                                                                                                                                                    | Partial | [Unit/API route] Add direct admin promo API route tests for create/update/delete/toggle/error cases, or expand existing route tests if present later.                                                                                     |
| Wishlist                                | `src/services/wishlist-service.ts`, `src/store/wishlist-store.ts`, `src/hooks/useWishlistSync.ts`, wishlist APIs, wishlist UI components                                                                                      | `tests/unit/api/user/wishlist*.test.ts`, `tests/unit/hooks/useWishlistSync.test.tsx`, `tests/unit/services/wishlist-service.test.ts`, `tests/unit/store/wishlist-store.test.ts`, `tests/integration/wishlist-service.test.ts`, `tests/e2e/journeys/wishlist.spec.ts`                                                                                                                                                                                | Partial | [Playwright E2E] Add assertion for merge-on-login if not already covered end to end.                                                                                                                                                      |
| Admin users/transactions/stats/settings | `src/services/admin-service.ts`, admin users/transactions/stats/settings APIs, admin pages                                                                                                                                    | `tests/unit/api/admin/users*.test.ts`, `tests/unit/api/admin/transactions*.test.ts`, `tests/unit/api/admin/stats.test.ts`, `tests/unit/api/admin/settings.test.ts`, `tests/unit/services/admin-service.test.ts`, `tests/integration/admin-service-routes.test.ts`, `tests/integration/admin-dashboard.test.ts`, `tests/integration/settings-service.test.ts`, `tests/e2e/journeys/admin-panel.spec.ts`, `tests/e2e/journeys/admin-settings.spec.ts` | Partial | [Playwright E2E] Add coverage for admin users and transactions workflows. [Integration caveat] `tests/integration/admin-dashboard.test.ts` uses mocked Supabase/query-building, so it is not database-backed integration coverage.        |
| Admin products/categories/tags          | Admin product/category/tag pages and APIs, `src/components/admin/ProductFormFields.tsx`, `src/components/admin/VariantManager.tsx`, `src/components/admin/CategorySelector.tsx`, `src/components/admin/TagInput.tsx`          | `tests/unit/services/product-service.test.ts`, `tests/unit/services/category-service.test.ts`, `tests/unit/services/tag-service.test.ts`, `tests/e2e/journeys/admin-categories-products.spec.ts`, `tests/e2e/journeys/admin-variant-images.spec.ts`                                                                                                                                                                                                 | Partial | [Unit/API route] Add direct route tests for `/api/admin/products`, `/api/admin/products/bulk`, `/api/admin/products/reorder`, `/api/admin/categories`, `/api/admin/categories/bulk`, `/api/admin/tags`, and `/api/admin/tags/[id]`.       |
| Storage/media                           | `src/lib/storage/index.ts`, `src/lib/storage/adapters/r2.ts`, `src/lib/storage/validators.ts`, product media APIs, `src/components/admin/R2MediaBrowser.tsx`, `src/components/admin/MediaManager.tsx`                         | `tests/unit/lib/storage.test.ts`, `tests/unit/lib/storage-r2-adapter.test.ts`, `tests/unit/lib/storage-validators.test.ts`, `tests/integration/storage-service.test.ts`, `tests/unit/api/products/media.test.ts`, `tests/e2e/journeys/admin-variant-images.spec.ts`                                                                                                                                                                                 | Partial | [Unit/API route] Add direct route tests for `/api/admin/r2-browser` list/delete behavior. [Playwright E2E] Add admin media browser edge cases. [Integration/manual] Real R2 coverage needs test bucket config.                            |
| Rate limiting                           | `src/lib/rate-limit/index.ts`, `src/lib/api/with-rate-limit.ts`, `src/proxy.ts`, middleware                                                                                                                                   | `tests/unit/middleware.test.ts`, `tests/unit/lib/rate-limit.test.ts`, `tests/unit/lib/with-rate-limit.test.ts`, `tests/integration/rate-limiting.test.ts`, `tests/integration/middleware-rate-limiting.test.ts`, `tests/e2e/error-recovery.spec.ts`                                                                                                                                                                                                 | Strong  | [Unit/Integration] Fail-open is tested, but future fallback observability work should assert warnings/admin-visible reporting under `NIM-140`.                                                                                            |
| Cache/versioning                        | `src/lib/api/with-cache.ts`, `src/lib/redis/client.ts`, `src/components/providers/VersionProvider.tsx`, version API/service worker assets                                                                                     | `tests/unit/hooks/useVersionCheck.test.tsx`, `tests/unit/lib/with-cache.test.ts`, `tests/unit/lib/redis-client.test.ts`, `tests/integration/cache-busting.test.ts`, `tests/integration/cache-invalidation.test.ts`, `tests/e2e/cache-busting.spec.ts`                                                                                                                                                                                               | Partial | [Playwright E2E] Some version checks prove availability/headers more than runtime update UX.                                                                                                                                              |
| Activity logs                           | `src/services/activity-log-service.ts`, login/register/profile/password routes, checkout activity flows                                                                                                                       | `tests/unit/services/activity-log-service.test.ts`, `tests/integration/activity-*.test.ts`, `tests/utils/activity-log-assertions.ts`                                                                                                                                                                                                                                                                                                                | Strong  | [Unit/API route or Playwright E2E] Logout activity is not strongly covered beyond service-level behavior. Add route/UI coverage if logout audit logging becomes a requirement.                                                            |
| Error recovery                          | Checkout/product/payment error UI and API failure handling                                                                                                                                                                    | `tests/e2e/error-recovery.spec.ts`, route/service negative-path unit tests across auth/promo/payment/admin                                                                                                                                                                                                                                                                                                                                          | Partial | [Playwright E2E] E2E uses intercepted/mocked failures. [Unit/API route] Add focused tests when `NIM-140` adds real client error/fallback reporting endpoints.                                                                             |
| SEO/static pages                        | `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/seo/*`, static policy pages, product metadata                                                                                                       | `tests/unit/utils/url.test.ts`, E2E smoke/search/product navigation, cache-busting E2E indirectly                                                                                                                                                                                                                                                                                                                                                   | Partial | [Unit] Add tests for sitemap/robots and SEO structured-data utilities; add route-level metadata assertions where feasible. Localization SEO is future scope in `NIM-152`.                                                                 |
| Email notifications                     | `src/lib/email/client.ts`, OTP email sending, buyer/admin order confirmation calls from `src/lib/payments/finalize-successful-transaction.ts`                                                                                 | `tests/unit/lib/email-client.test.ts`, `tests/integration/email-service.test.ts`                                                                                                                                                                                                                                                                                                                                                                    | Partial | [Unit] Add recipient/template/error assertions. [Integration/manual] Full payment-finalization email side effect and sandbox delivery are not proven end to end; add sandbox-only delivery notes.                                         |
| Schema, migrations, RLS, DB invariants  | `supabase/migrations/20260531190011_initial_public_schema.sql`, root migration files, RLS policies, public read grants, service-role grants, unique constraints, indexes, revenue RPCs                                        | Integration service tests indirectly exercise many constraints and relations, for example `tests/integration/product-service.test.ts`, `tests/integration/category-service.test.ts`, `tests/integration/wishlist-service.test.ts`, and `tests/integration/transaction-service.test.ts`. `tests/integration/admin-dashboard.test.ts` is query-shaping only because it mocks Supabase.                                                                | Partial | [Integration/contract] Add explicit database contract/RLS tests for public vs service-role access, unique constraints, revenue RPC permissions/results, and migration/schema invariants. Static SQL presence alone is not behavior proof. |
| Hooks                                   | `src/hooks/useApiWithRateLimit.ts`, `useFormState`, `useHydration`, `useMediaManager`, `useVariantManager`, `useVersionCheck`, `useWishlistSync`                                                                              | `tests/unit/hooks/*.test.tsx` run through `tests/vitest.config.unit.ts` and prove rate-limit state, form state transitions, hydration transition, media defaults/removal, variant add/edit/delete/reorder, version cache/service-worker side effects, and wishlist unauthenticated/authenticated/merge behavior.                                                                                                                                    | Strong  | [No current hook harness gap] Keep future hook tests under `.test.ts` or `.test.tsx` so the unit config includes them.                                                                                                                    |

## Behavior Proof Notes

These notes expand the matrix's test-file citations with what the tests
actually prove.

- Auth login/register/session: unit route/service tests prove validation,
  password checks, missing-user and wrong-password errors, UID creation, phone
  normalization, and sanitized user return values; integration/activity tests
  prove database inserts and activity-log side effects; Playwright login and
  registration journeys prove user-visible auth flow, session persistence, and
  redirects.
- Password/profile: route and service tests prove password validation, current
  password checks, password hashing, profile payload validation, and activity
  logging; missing coverage is the full browser profile edit/password workflow
  with persisted reload evidence.
- Catalog/search: service and integration tests prove CRUD constraints,
  active/inactive filtering, category/tag relations, variant stock aggregation,
  media/default behavior, search filtering, and error handling; E2E proves
  search/navigation behavior.
- Cart/checkout/transactions: store tests prove quantity/stock rules and totals;
  API/service/integration tests prove transaction creation, item persistence,
  status transitions, stock updates, provider references, promo fields,
  insufficient stock, and guest/auth linking; Playwright checkout specs prove
  user-visible checkout and database-backed completed transactions under mocked
  payments.
- Stripe/PayPal: webhook and capture tests prove signature/header rejection,
  amount/currency/reference mismatch rejection, idempotent completion, and
  provider metadata handling. They do not prove real sandbox checkout provider
  behavior.
- Promo codes: service/API tests prove active lookup, validation failures,
  percent/fixed discount math, expiry, usage limits, user-specific codes, and
  usage recording; E2E proves customer promo application and admin create/update
  flows.
- Wishlist: route/service/store tests prove auth guards, add/remove/count/check,
  merge/clear, active product filtering, uniqueness/foreign-key constraints, and
  variant-aware wishlist items; E2E proves guest and authenticated wishlist UI
  and add-to-cart behavior.
- Admin: route/service tests prove RBAC, pagination/filter parsing,
  self-demotion/delete guards, transaction normalization, settings persistence,
  and dashboard aggregation; E2E proves admin access and selected workflows, but
  not deep users/transactions/dashboard interactions.
- Storage/media: storage unit tests prove provider selection, type/size
  validation, path generation, upload/delete/list behavior under mocked or
  configured storage; product media tests prove default promotion and variant
  media persistence; E2E proves variant image admin persistence, not the full
  media browser.
- Rate limiting/cache/activity/error recovery: tests prove endpoint bucket
  selection, 429 headers, fail-open behavior, cache hit/miss/invalidation,
  request/client info extraction, activity-log writes, and selected browser
  failure UI via intercepted failures.
- SEO/static: current tests prove URL helper behavior and some runtime
  navigation/smoke behavior; they do not directly prove sitemap, robots, or
  structured data correctness.
- Email notifications: unit/integration tests prove configured-provider send
  calls and skip behavior for missing recipients/config, but not every
  payment-finalization email side effect with sanitized template variables.
- Schema/migrations/RLS: integration tests prove many database constraints
  indirectly through service behavior, but no explicit contract suite proves RLS
  policy behavior, grants, revenue RPC permissions, or migration invariants.

## Follow-Up Coverage Work For NIM-149

Created child issues under `NIM-149`:

1. `NIM-153`: completed in this backfill; hook `.test.tsx` files now run in the
   unit suite and pass.
2. `NIM-154`: admin route coverage for products/categories/tags APIs,
   including bulk, reorder, permission errors, invalid input, and mutation side
   effects.
3. `NIM-155`: admin UI E2E depth for users, transactions, dashboard filters,
   and shallow navigation gaps.
4. `NIM-156`: profile and customer account E2E for profile edit, password
   change, transaction history visibility, and persisted data assertions.
5. `NIM-157`: storage/media route and browser coverage for
   `/api/admin/r2-browser`, media-browser list/delete edge cases, and product
   media stale/default behavior.
6. `NIM-158`: SEO/static route tests for sitemap, robots, structured data, and
   metadata helper behavior.
7. `NIM-159`: payment route edge coverage for direct `/api/transactions/[id]`
   route tests plus documented manual/contract plan for real Stripe/PayPal
   sandbox validation.
8. `NIM-160`: email notification behavior coverage for OTP and order
   confirmation emails.
9. `NIM-161`: schema, migration, RLS, grants, constraints, and database
   invariant coverage.

## Manual-Only Or Separately Configured Areas

- Real Stripe/PayPal sandbox end-to-end payment provider flows: current E2E uses
  `E2E_MOCK_PAYMENTS=true`. Real provider runs need dedicated sandbox accounts,
  idempotent cleanup, and credential handling outside normal local E2E.
- Real R2 storage integration: covered only when test R2 credentials/bucket are
  configured. Normal local runs should not touch production storage.
- Full production rate-limit behavior under real Upstash outages: fail-open is
  unit/integration tested, but production outage behavior should be monitored
  through `NIM-140` observability once implemented.

## Baseline Commands

Normal verification commands:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e -- --project=chromium <focused-spec>
npm run lint
npm run build
```

For this audit issue, broad full-suite execution is not required. The necessary
discovery evidence is the file inventory and config inspection listed above.
