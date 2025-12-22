# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Policy

**NEVER create extensive documentation in this project unless explicitly requested by the user.** This includes:

- Detailed README files
- API documentation
- Architecture documents
- Inline code documentation (unless replacing existing docs)

Keep documentation minimal and only create when specifically asked.

## Project Overview

Kitia is a Persian (Farsi) e-commerce platform built with Next.js 14 App Router, featuring RTL support, payment integration, and comprehensive admin capabilities. The application uses a service layer architecture with business logic centralized in service files.

## Essential Commands

### Development

```bash
npm run dev              # Start dev server (clears .next cache first)
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npm run verify:routes    # Verify all API routes have 'export const dynamic' (runs pre-build)
```

### Database (Supabase)

```bash
# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --project-id gozxjxtnrbuurmstjydo > src/types/supabase.ts

# Apply schema changes via psql (see examples below)
# Or use Supabase dashboard SQL Editor
```

### Database Environments

The project uses **Supabase** for database management:

1. **Supabase Production** - `aws-1-ap-southeast-1.pooler.supabase.com` (project_ref: `tanqgnztclrucfldxhuk`)
2. **Supabase Preview/Preproduction** - `aws-1-ap-northeast-2.pooler.supabase.com` (project_ref: `gozxjxtnrbuurmstjydo`)

Currently using **Preview database** on the `migration/prisma-to-supabase` branch.

**Database Connection Strings**:

- **Production**: `postgresql://postgres.tanqgnztclrucfldxhuk:BHZnE4rPyZO4lSmA@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
- **Preview**: `postgresql://postgres.gozxjxtnrbuurmstjydo:PawK0YK7sYbCzzMi@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true`

**Important**: When applying schema changes, use:

- Supabase Dashboard SQL Editor (recommended)
- Supabase MCP `apply_migration` tool
- `psql` command (see examples below)

**Examples - Apply migrations**:

Production (via psql):

```bash
PGPASSWORD="BHZnE4rPyZO4lSmA" psql -h aws-1-ap-southeast-1.pooler.supabase.com -U postgres.tanqgnztclrucfldxhuk -d postgres -p 6543 -c "ALTER TABLE users ADD COLUMN \"newColumn\" TEXT;"
```

Preview (via psql):

```bash
PGPASSWORD="PawK0YK7sYbCzzMi" psql -h aws-1-ap-northeast-2.pooler.supabase.com -U postgres.gozxjxtnrbuurmstjydo -d postgres -p 6543 -c "ALTER TABLE users ADD COLUMN \"newColumn\" TEXT;"
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
  const supabase = await createClient();
  const { data: product } = await supabase.from('products').insert({ ... });
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

### Server-Only Module Protection

**CRITICAL: All service files and server-only libraries MUST include `import 'server-only';` as the first import.**

This prevents client components from accidentally importing server-side code, which causes runtime errors.

**Required in:**

- All files in `/src/services/*.ts`
- Server-only libraries:
  - `/src/lib/email/client.ts`
  - `/src/lib/kavenegar/client.ts`
  - `/src/lib/zarinpal/client.ts`
  - `/src/lib/storage/index.ts`
  - `/src/lib/supabase/server.ts` (already has it)

**Example:**

```typescript
// ✅ CORRECT - Service file with server-only guard
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

export async function getProducts() {
  // ... implementation
}
```

**Why this matters:**

- Webpack bundles the entire import chain, even for type-only imports
- If a client component imports from a service file (even just types), the server dependencies get bundled
- This causes runtime errors like "Cannot read properties of undefined (reading 'call')"
- The `server-only` package throws a **build-time error** to catch this mistake immediately

### Type Separation for Client-Server Boundaries

**When types need to be shared between server and client code, extract them to separate type files.**

This is Strategy 4 (Type Separation Pattern):

**Pattern:**

1. Create a dedicated type file in `/src/types/` (e.g., `search.ts`)
2. Define shared types without any server imports
3. Service files import and re-export types (for backward compatibility)
4. Client components import directly from the type file

**Example:**

```typescript
// ✅ Step 1: Create src/types/search.ts (safe for client)
export interface ProductSearchResult {
  id: string;
  name: string;
  price: number;
  // ... other fields
}

export interface SearchResponse {
  products: ProductSearchResult[];
  total: number;
}

// ✅ Step 2: Service imports from types
// src/services/search-service.ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SearchResponse } from '@/types/search';

// Re-export for backward compatibility
export type { SearchResponse };

export async function searchProducts(query: string): Promise<SearchResponse> {
  // ... implementation
}

// ✅ Step 3: Client component imports from types (NOT service)
// src/components/SearchBar.tsx
('use client');
import type { SearchResponse } from '@/types/search'; // ✅ SAFE
// import type { SearchResponse } from '@/services/search-service'; // ❌ NEVER DO THIS

export function SearchBar() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  // ... implementation
}
```

**Rules:**

- Type files in `/src/types/` must NEVER import server-only modules
- Type files can import from other type files, utility functions, or pure libraries
- Client components should ALWAYS import types from `/src/types/`, NOT from `/src/services/`
- Service files can import and re-export types for backward compatibility

**Defense in depth:**

- Strategy 1 (server-only imports): Catches mistakes at build time ✅
- Strategy 4 (type separation): Prevents the problem architecturally ✅
- Together they provide robust protection against client-server bundling issues

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

### File Storage Architecture

Product images and videos are stored in **Cloudflare R2** (S3-compatible object storage):

- **Storage abstraction layer**: `/src/lib/storage` - allows switching providers without code changes
- **Current provider**: Cloudflare R2 via S3 SDK (`@aws-sdk/client-s3`)
- **Upload endpoint**: `POST /api/upload/product-media` (admin-only)
- **File validation**: Images (JPG, PNG, WEBP, GIF) max 5MB, Videos (MP4, WEBM, MOV) max 50MB
- **File paths**: Auto-generated with format `products/{images|videos}/{random}-{timestamp}.{ext}`

**Key benefits of R2:**

- 10GB free storage (vs 1GB alternatives)
- Zero egress fees - unlimited bandwidth
- Global CDN delivery
- Future-proof: Can migrate to Supabase/S3 by swapping adapter

### Image Optimization (Cloudflare Image Resizing)

Images are optimized on-demand using **Cloudflare Image Resizing**:

- **Free tier**: 5,000 unique transformations/month (more than enough for most e-commerce sites)
- **How it works**: On first request, Cloudflare fetches original from R2, transforms it, and caches globally
- **Supported transformations**: Resize, format conversion (WebP/AVIF), quality compression, smart cropping
- **Zero storage overhead**: Only original files stored in R2, variants generated on-demand

**⚠️ IMPORTANT**: Cloudflare Image Resizing must be **manually enabled in Cloudflare Dashboard**:

1. Go to https://dash.cloudflare.com → Images → Transformations
2. Click "Enable Image Resizing"
3. If not enabled, set `NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED="false"` in `.env` to use raw images

**Fallback mechanism**:
The code automatically falls back to raw R2 URLs if `NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED="false"`. This prevents 404 errors when the feature is not enabled in Cloudflare dashboard.

**Image optimization utilities** (`/src/lib/cloudflare-images-client.ts`):

```typescript
import { optimizeImage } from '@/lib/cloudflare-images-client';

// Predefined variants (optimized for specific use cases)
optimizeImage.thumbnail(url); // 400x500, WebP, 80% quality (product cards)
optimizeImage.medium(url); // 800x1000, WebP, 85% quality (product detail)
optimizeImage.large(url); // 1200x1500, WebP, 90% quality (zoom/hero)
optimizeImage.cartItem(url); // 100x100, WebP, 75% quality (cart preview)
optimizeImage.categoryCard(url); // 300x300, WebP, 80% quality (category cards)
optimizeImage.adminThumb(url); // 150x150, WebP, 70% quality (admin thumbnails)

// Custom transformations
import { getOptimizedImageUrl } from '@/lib/cloudflare-images-client';

const customUrl = getOptimizedImageUrl(imageUrl, {
  width: 600,
  height: 800,
  format: 'auto', // Serves WebP to supported browsers, JPEG fallback
  quality: 85,
  fit: 'cover', // scale-down, contain, cover, crop, pad
  gravity: 'auto', // Smart focus (detects faces/salient features)
});
```

**Important notes**:

- Use `@/lib/cloudflare-images-client` in client components (browser-safe)
- Use `@/lib/cloudflare-images` in server components/API routes (includes all features)
- Original images uploaded to R2 remain unchanged
- Each unique URL + transformation combo counts as 1 transformation (cached forever)
- `format: 'auto'` automatically serves WebP to Chrome/Edge, AVIF to newest browsers, JPEG fallback
- If feature is disabled, functions return original URLs (no optimization)

**Storage adapter pattern:**

```typescript
import { storage } from '@/lib/storage';

// Upload file
const result = await storage.upload({
  file: fileBuffer,
  path: 'products/images/example.jpg',
  contentType: 'image/jpeg',
  isPublic: true,
});

// Get public URL
const url = storage.getPublicUrl('products/images/example.jpg');
```

**Environment variables required:**

- `R2_ACCOUNT_ID` - Cloudflare account ID
- `R2_ACCESS_KEY_ID` - R2 API access key
- `R2_SECRET_ACCESS_KEY` - R2 API secret
- `R2_BUCKET_NAME` - Bucket name (default: `kitia-products`)
- `R2_PUBLIC_URL` - Public URL for files
  - **Production**: `https://cdn.kitia.ir` (custom domain configured in Cloudflare R2)
  - **Development**: Can use r2.dev subdomain (rate-limited)
- `AWS_EC2_METADATA_DISABLED` - Set to `true` to prevent AWS SDK from trying EC2 metadata service

**Production Custom Domain Setup:**
The bucket uses `cdn.kitia.ir` as the public-facing domain (configured in Cloudflare R2 bucket settings). This provides:

- No rate limits (vs r2.dev which is rate-limited)
- Full Cloudflare CDN caching
- WAF and security features
- Clean branded URLs

**CRITICAL: IPv6 Connectivity Issue**
This development environment does NOT have IPv6 connectivity. The AWS S3 SDK must be configured with `family: 4` in the HTTPS agent to force IPv4 connections, otherwise R2 uploads will fail with `ETIMEDOUT` errors. This is already configured in `/src/lib/storage/adapters/r2.ts`.

See `/docs/R2_SETUP.md` for complete setup instructions.

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

### OTP Authentication (Email & SMS)

Supports passwordless login and registration via OTP codes.

**Email OTP** (via Resend):

- Production: Uses Resend API with verified domain (`kitia.ir`)
- Development: Auto-creates Ethereal test accounts
- DNS configured: DKIM, SPF, MX records via Cloudflare
- **CRITICAL**: `EMAIL_FROM` environment variable MUST be set in production
  - Value: `"کیتیا" <noreply@kitia.ir>`
  - Without this, Resend will fail to send emails and OTP will fail silently

**SMS OTP** (via Kavenegar):

- Template-based SMS delivery for Iranian phone numbers
- Format: `09xxxxxxxxx`

**OTP Service** (`src/services/otp-service.ts`):

- 6-digit codes, 5-minute expiration
- Rate limiting: 1 OTP per 2 minutes per identifier
- Max 3 verification attempts
- Auto-cleanup of expired OTPs
- Supports both `register` and `login` purposes

**API Endpoints**:

- `POST /api/auth/send-otp` - Send OTP to email or phone
- `POST /api/auth/verify-otp` - Verify OTP code

### Transaction & Payment Flow

1. User creates transaction → generates unique `transactionCode` (8-char alphanumeric)
2. Initiate Zarinpal payment → stores `zarinpalAuthority`
3. User completes payment on Zarinpal gateway
4. Callback verification → update status to `COMPLETED`, store `zarinpalRefId`
5. Reduce product/variant stock
6. Send admin order confirmation email (if `ADMIN_EMAIL` configured)
7. Auto-generate invoice after successful payment

Transaction statuses: `PENDING`, `COMPLETED`, `FAILED`

**Admin Order Notifications**:

- Automatic email sent to admin after each successful payment
- Includes comprehensive order details: buyer info, products with variants, quantities, prices
- Configured via `ADMIN_EMAIL` environment variable
- Non-blocking - payment succeeds even if email fails
- Service: `sendAdminOrderConfirmation()` in `src/lib/email/client.ts`

### Database Schema Key Points

- **Products**: Support variants, media, tags, categories
  - `images` field is deprecated (kept for backward compatibility)
  - Use `ProductMedia` relation for new media
  - Variants can have separate media and pricing adjustments
  - **Automatic stock calculation**: When a product has variants, its `stock` field is automatically calculated as the sum of all variant stocks
    - Creating/updating/deleting variants automatically updates parent product stock
    - Use `updateProductStockFromVariants(productId)` to manually recalculate if needed
- **Categories**: Hierarchical (self-referencing with `parentId`)
- **Transactions**: Linked to `TransactionItem[]` for cart contents
- **PromoCodes**: One per user, 24-hour expiry, one-time use

## Path Aliases

Use `@/` to reference `/src`:

```typescript
import { getAllProducts } from '@/services/product-service';
import { createClient } from '@/lib/supabase/server';
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

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable key (replaces legacy anon key)
- `SUPABASE_SECRET_KEY` - Supabase secret key (replaces legacy service_role key, for server-side operations)
- `NEXTAUTH_URL` - App URL (http://localhost:3000 in dev)
- `NEXTAUTH_SECRET` - Secret for JWT signing (generate with `openssl rand -base64 32`)
- `ZARINPAL_MERCHANT_ID` - Zarinpal gateway merchant ID
- `ZARINPAL_SANDBOX` - "true" for sandbox mode
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- `LOG_LEVEL` - "info", "debug", "warn", or "error"
- `RESEND_API_KEY` - Resend email service API key (for production email OTP)
- `EMAIL_FROM` - Email sender address (e.g., "کیتیا" <noreply@kitia.ir>)
- `KAVENEGAR_API_KEY` - Kavenegar SMS API key (for SMS OTP)
- `KAVENEGAR_TEMPLATE_NAME` - SMS template name
- `R2_ACCOUNT_ID` - Cloudflare R2 account ID
- `R2_ACCESS_KEY_ID` - R2 API access key
- `R2_SECRET_ACCESS_KEY` - R2 API secret key
- `R2_BUCKET_NAME` - R2 bucket name (default: kitia-products)
- `R2_PUBLIC_URL` - Public URL for R2 files (R2.dev or custom domain)
- `NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED` - "true" to enable Cloudflare Image Resizing, "false" to use raw images (default: "true")

## RTL and Internationalization

The entire application is RTL (Right-to-Left) for Persian/Farsi:

- Tailwind configured for RTL via `next.config.js`
- Use logical properties: `ms-*` (margin-start), `pe-*` (padding-end)
- All user-facing text is in Farsi
- Date handling uses `date-fns-jalali` for Jalali calendar

## Type Safety

- Supabase-generated types are in `@/types/supabase`
- Type helpers in `@/lib/supabase/types`:
  - `Tables<'table_name'>` - Table row types
  - `Inserts<'table_name'>` - Insert types
  - `Updates<'table_name'>` - Update types
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
5. **Supabase client usage** - Use `createClient()` from `@/lib/supabase/server` for server-side operations
6. **Upstash pattern limitations** - Can't use `KEYS *` pattern matching; clear specific keys
7. **Supabase date handling** - Supabase returns dates as ISO strings; convert to `Date` objects when needed
8. **Many-to-many relations** - Explicitly query junction tables and flatten results

## Supabase Client Usage

Always use the appropriate client for your context:

**Server-side (API routes, Server Components, Server Actions)**:

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from('products').select('*');
  return NextResponse.json({ data });
}
```

**Client-side (Client Components)**:

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data } = await supabase.from('products').select('*');
```

**Important**: Server-side client uses service role key for full access. Client-side uses anon key with RLS policies.

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
