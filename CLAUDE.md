# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kitia is a Persian (Farsi) e-commerce platform built with Next.js 14 App Router, featuring RTL support, payment integration, and comprehensive admin capabilities. The application uses a service layer architecture with business logic centralized in service files.

## Essential Commands

### Development
```bash
npm run dev              # Start dev server (clears .next cache first)
npm run build            # Build for production (runs Prisma generate + Next.js build)
npm start                # Start production server
npm run lint             # Run ESLint
npm run verify:routes    # Verify all API routes have 'export const dynamic' (runs pre-build)
```

### Database (Prisma)
```bash
npx prisma generate                        # Generate Prisma Client after schema changes
npx prisma migrate dev --name <name>       # Create and apply migration
npx prisma db push                         # Push schema changes without migration (dev only)
npx prisma studio                          # Open Prisma Studio UI
```

## Critical Architecture Patterns

### Service Layer Pattern
All business logic lives in `/src/services/*.ts` files. API routes are thin controllers that:
1. Parse and validate request data
2. Call service functions
3. Return responses

**Never put business logic in API routes.** Always use services.

Example:
```typescript
// ❌ BAD - Logic in API route
export async function POST(req: Request) {
  const product = await prisma.product.create({ ... });
  await invalidateCache();
  return NextResponse.json(product);
}

// ✅ GOOD - Use service
import { createProduct } from '@/services/product-service';

export async function POST(req: Request) {
  const data = await req.json();
  const product = await createProduct(data);
  return NextResponse.json(product);
}
```

### Dynamic Route Requirement
**All API routes and Server Component pages with dynamic params MUST export:**
```typescript
export const dynamic = 'force-dynamic';
```

This prevents Vercel build failures. The `verify:routes` script validates this before builds.

### Rate Limiting Strategy
Rate limiting is applied at the middleware level (`src/middleware.ts`) before any route logic:
- **Public endpoints** (products, categories, tags): 1000 req/min (publicLimiter)
- **General API endpoints**: 100 req/min (apiLimiter)
- **Auth endpoints** (`/api/auth/*`): 5 req/15min (strictLimiter) - prevents brute force

Rate limiting uses Upstash Redis with sliding window algorithm. Client identifier uses user ID when authenticated, otherwise IP address.

### Caching Architecture
Redis caching (Upstash) is implemented in `/src/lib/redis/client.ts`:
- **Cache-aside pattern**: Check cache → fetch if miss → store result
- **Graceful degradation**: If Redis fails, operations continue without caching
- **Invalidation**: Service functions invalidate specific cache keys after mutations

Common cache keys follow pattern: `{entity}:{filter}:page:{n}:limit:{n}`

Example: `products:active:page:1:limit:20`

Since Upstash REST API doesn't support pattern matching (no `KEYS` command), cache invalidation clears specific known keys (e.g., pages 1-10).

### Authentication Flow
- Uses NextAuth.js with Credentials provider
- JWT strategy (not database sessions)
- Password hashing with bcrypt
- User roles: `USER`, `ADMIN`
- Middleware protects routes:
  - `/admin/*` → requires ADMIN role
  - `/profile/*` → requires authenticated user
  - Redirects to `/login` on unauthorized access

Session data includes: `id`, `email`, `name`, `role`

### Transaction & Payment Flow
1. User creates transaction → generates unique `transactionCode` (8-char alphanumeric)
2. Initiate Zarinpal payment → stores `zarinpalAuthority`
3. User completes payment on Zarinpal gateway
4. Callback verification → update status to `COMPLETED`, store `zarinpalRefId`
5. Auto-generate invoice after successful payment

Transaction statuses: `PENDING`, `COMPLETED`, `FAILED`

### Database Schema Key Points
- **Products**: Support variants, media, tags, categories
  - `images` field is deprecated (kept for backward compatibility)
  - Use `ProductMedia` relation for new media
  - Variants can have separate media and pricing adjustments
- **Categories**: Hierarchical (self-referencing with `parentId`)
- **Transactions**: Linked to `TransactionItem[]` for cart contents
- **PromoCodes**: One per user, 24-hour expiry, one-time use

## Path Aliases

Use `@/` to reference `/src`:
```typescript
import { getAllProducts } from '@/services/product-service';
import prisma from '@/lib/prisma/client';
```

## Logging

Use structured logging via Pino (`@/lib/logger`):
```typescript
import { log } from '@/lib/logger';

log.info('Message', { contextData });
log.error('Error message', { error });
log.warn('Warning', { data });
log.debug('Debug info', { details });
```

Development mode uses `pino-pretty` for colorized output. Production uses JSON logs.

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string (with `?schema=public`)
- `DIRECT_URL` - Direct database URL (for Prisma migrations)
- `NEXTAUTH_URL` - App URL (http://localhost:3000 in dev)
- `NEXTAUTH_SECRET` - Secret for JWT signing (generate with `openssl rand -base64 32`)
- `ZARINPAL_MERCHANT_ID` - Zarinpal gateway merchant ID
- `ZARINPAL_SANDBOX` - "true" for sandbox mode
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- `LOG_LEVEL` - "info", "debug", "warn", or "error"

## RTL and Internationalization

The entire application is RTL (Right-to-Left) for Persian/Farsi:
- Tailwind configured for RTL via `next.config.js`
- Use logical properties: `ms-*` (margin-start), `pe-*` (padding-end)
- All user-facing text is in Farsi
- Date handling uses `date-fns-jalali` for Jalali calendar

## Type Safety

- Prisma-generated types are in `@prisma/client`
- Custom types in `/src/types`:
  - `ProductWithRelations` - Product with media, variants, tags
  - `PaginatedResponse<T>` - Standard pagination wrapper
  - `ApiResponse<T>` - Standard API response format

## Testing API Routes Locally

Use the verify script before committing route changes:
```bash
npm run verify:routes
```

This checks that all API routes and dynamic Server Component pages have the required `export const dynamic = 'force-dynamic';` declaration.

## Common Pitfalls

1. **Forgetting `export const dynamic`** - Will cause Vercel build failures
2. **Putting business logic in API routes** - Always use services
3. **Not invalidating cache after mutations** - Products/data won't update
4. **Using LTR layout patterns** - Use RTL-aware Tailwind classes
5. **Direct Prisma client imports** - Always use `@/lib/prisma/client` (singleton)
6. **Upstash pattern limitations** - Can't use `KEYS *` pattern matching; clear specific keys

## Prisma Client Usage

Always import from the singleton:
```typescript
import prisma from '@/lib/prisma/client';
```

This prevents "too many Prisma clients" errors in development hot reload.

## Admin Operations

Admin-specific business logic is in `/src/services/admin-service.ts`. Admin routes are protected by middleware checking for `role === "ADMIN"`.

## Payment Integration (Zarinpal)

Sandbox mode is enabled via `ZARINPAL_SANDBOX=true`. For production:
1. Set `ZARINPAL_SANDBOX=false`
2. Use real merchant ID from Zarinpal dashboard
3. Update callback URL to production domain

## Development Workflow

1. Make schema changes → `npx prisma generate`
2. Create migration → `npx prisma migrate dev --name <descriptive_name>`
3. Update services if business logic changes
4. Test API routes locally
5. Run `npm run verify:routes` before commit
6. Run `npm run build` to verify production build succeeds
