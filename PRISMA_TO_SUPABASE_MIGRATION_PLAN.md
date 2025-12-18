# Prisma to Supabase-JS Migration Plan

## Executive Summary

This document outlines a **gradual, step-by-step migration** from Prisma ORM to Supabase-JS for the Kitia e-commerce platform. The migration will be done incrementally without breaking the codebase, allowing for testing at each stage.

---

## Current Architecture Analysis

### Database Setup
- **Local Development**: PostgreSQL on `localhost:5432/kitia`
- **Production**: Supabase (Singapore) - `tanqgnztclrucfldxhuk`
- **Preview**: Supabase (Seoul) - `gozxjxtnrbuurmstjydo`
- **Current ORM**: Prisma Client (`@prisma/client`)
- **Connection Method**: Direct connection strings via `DATABASE_URL`

### Architecture Patterns
1. **Service Layer Pattern**: All business logic in `/src/services/*.ts` (10 services, ~3,633 LOC)
2. **NextAuth.js Authentication**: JWT-based (not Supabase Auth)
3. **Rate Limiting**: Upstash Redis via middleware
4. **Caching**: Upstash Redis with cache-aside pattern
5. **File Storage**: Cloudflare R2 (not Supabase Storage)
6. **RLS Enabled**: All tables have Row Level Security with permissive policies

### Key Dependencies
- **Prisma Files**: 19 TypeScript files import `prisma` directly
- **Service Files**: 10 service files (product, auth, transaction, user, etc.)
- **API Routes**: 40+ API route files
- **Database Models**: 12 tables with relations (User, Product, Transaction, Category, Tag, etc.)

### Critical Business Logic Flows
1. **Authentication**: Email/Phone OTP + Password-based via NextAuth
2. **Product Management**: Products with variants, media, categories, tags
3. **Transaction/Payment**: Zarinpal integration with stock management
4. **Admin Operations**: Full CRUD on all entities
5. **Caching**: Redis-based caching with invalidation

---

## Migration Strategy

### Why Gradual Migration?

1. **Zero Downtime**: Application remains functional throughout
2. **Incremental Testing**: Each module can be tested before moving to the next
3. **Easy Rollback**: Can revert specific modules if issues arise
4. **Risk Mitigation**: Smaller changes = lower risk of breaking production

### Key Decisions

#### ✅ What We're Keeping (No Changes)
- **NextAuth.js**: Continue using JWT-based auth (not migrating to Supabase Auth)
- **Cloudflare R2**: Keep for file storage (not using Supabase Storage)
- **Upstash Redis**: Keep for rate limiting and caching
- **Database Schema**: No schema changes during migration
- **Service Layer Pattern**: Maintain current architecture
- **RLS Policies**: Already configured for Supabase

#### 🔄 What We're Changing
- **Database Client**: Prisma Client → Supabase-JS Client
- **Query Syntax**: Prisma queries → Supabase PostgREST queries
- **Type Generation**: Prisma types → Supabase generated types
- **Connection Method**: Connection strings → Supabase SDK with cookies/middleware

---

## Prerequisites

### 1. Environment Variables Setup

Add to `.env`, `.env.local`, and Vercel environment variables:

```bash
# Supabase Connection (Preview Database)
NEXT_PUBLIC_SUPABASE_URL=https://gozxjxtnrbuurmstjydo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvenhqeHRucmJ1dXJtc3RqeWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTU1ODIsImV4cCI6MjA4MDMzMTU4Mn0.N2tp3ru-Ob1JkV9p3cDC2NpcdZv0ZFQ-4FfFLGF7C0o

# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=<get_from_supabase_dashboard>
```

**Important**: Get the `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard → Project Settings → API → `service_role` key (secret)

### 2. Package Installation

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 3. Database Connection Switch

Update `.env` to point to Preview database:

```bash
# Comment out local database
# DATABASE_URL="postgresql://kitia_user:kitia_password@localhost:5432/kitia?schema=public"

# Use Supabase Preview database for migration testing
DATABASE_URL="postgresql://postgres.gozxjxtnrbuurmstjydo:PawK0YK7sYbCzzMi@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.gozxjxtnrbuurmstjydo:PawK0YK7sYbCzzMi@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"
```

**Note**: Keep Prisma working during migration for fallback and comparison testing.

---

## Migration Phases

### Phase 0: Foundation Setup ✅ (Estimated: 1-2 hours)

**Goal**: Set up Supabase client utilities without touching existing code.

#### Tasks:

1. **Install Dependencies**
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```

2. **Create Supabase Client Files**

   **File**: `src/lib/supabase/server.ts`
   ```typescript
   import { createServerClient, type CookieOptions } from "@supabase/ssr";
   import { cookies } from "next/headers";

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

   export const createClient = async () => {
     const cookieStore = await cookies();

     return createServerClient(
       supabaseUrl,
       supabaseServiceKey, // Use service role key for server operations
       {
         cookies: {
           getAll() {
             return cookieStore.getAll()
           },
           setAll(cookiesToSet) {
             try {
               cookiesToSet.forEach(({ name, value, options }) =>
                 cookieStore.set(name, value, options)
               )
             } catch {
               // Called from Server Component - ignore
             }
           },
         },
       },
     );
   };
   ```

   **File**: `src/lib/supabase/client.ts`
   ```typescript
   import { createBrowserClient } from "@supabase/ssr";

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

   export const createClient = () =>
     createBrowserClient(supabaseUrl, supabaseAnonKey);
   ```

   **File**: `src/lib/supabase/middleware.ts`
   ```typescript
   import { createServerClient, type CookieOptions } from "@supabase/ssr";
   import { type NextRequest, NextResponse } from "next/server";

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

   export const updateSession = async (request: NextRequest) => {
     let supabaseResponse = NextResponse.next({
       request: {
         headers: request.headers,
       },
     });

     const supabase = createServerClient(
       supabaseUrl,
       supabaseServiceKey,
       {
         cookies: {
           getAll() {
             return request.cookies.getAll()
           },
           setAll(cookiesToSet) {
             cookiesToSet.forEach(({ name, value, options }) =>
               request.cookies.set(name, value)
             )
             supabaseResponse = NextResponse.next({ request })
             cookiesToSet.forEach(({ name, value, options }) =>
               supabaseResponse.cookies.set(name, value, options)
             )
           },
         },
       },
     );

     return supabaseResponse;
   };
   ```

3. **Generate Supabase Types**

   Install Supabase CLI:
   ```bash
   npm install supabase --save-dev
   ```

   Generate types:
   ```bash
   npx supabase gen types typescript --project-id gozxjxtnrbuurmstjydo > src/types/supabase.ts
   ```

4. **Create Type Helper**

   **File**: `src/lib/supabase/types.ts`
   ```typescript
   import { Database } from '@/types/supabase';

   export type Tables<T extends keyof Database['public']['Tables']> =
     Database['public']['Tables'][T]['Row'];

   export type Inserts<T extends keyof Database['public']['Tables']> =
     Database['public']['Tables'][T]['Insert'];

   export type Updates<T extends keyof Database['public']['Tables']> =
     Database['public']['Tables'][T]['Update'];
   ```

#### Testing Phase 0:
```bash
# Verify Supabase connection
npm run dev

# Test in a temporary API route or script:
# src/app/api/test-supabase/route.ts
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('users').select('count');
  return Response.json({ data, error });
}
```

**Success Criteria**:
- ✅ Supabase client files created
- ✅ Types generated successfully
- ✅ Test connection returns data without errors
- ✅ No breaking changes to existing functionality

---

### Phase 1: Simple Read-Only Service (Tag Service) (Estimated: 2-3 hours)

**Goal**: Migrate the simplest service with no complex relations.

**Why Tag Service?**
- No complex relations (just many-to-many with Product)
- Read-heavy operations
- Small surface area (182 LOC)
- Easy to test and verify

#### Tasks:

1. **Create Dual-Mode Tag Service**

   **File**: `src/services/tag-service-supabase.ts` (new file, don't replace existing)
   ```typescript
   import { createClient } from '@/lib/supabase/server';
   import { Tables, Inserts, Updates } from '@/lib/supabase/types';
   import { PaginatedResponse, DeleteResult } from '@/types/api';
   import { log } from '@/lib/logger';

   type Tag = Tables<'tags'>;

   /**
    * Get all tags with pagination
    */
   export async function getAllTags(options: {
     page?: number;
     perPage?: number;
   } = {}): Promise<PaginatedResponse<Tag>> {
     const { page = 1, perPage = 50 } = options;
     const offset = (page - 1) * perPage;

     const supabase = await createClient();

     // Get total count
     const { count, error: countError } = await supabase
       .from('tags')
       .select('*', { count: 'exact', head: true });

     if (countError) {
       log.error('Error counting tags', { error: countError });
       throw new Error('خطا در شمارش تگ‌ها');
     }

     // Get paginated data
     const { data, error } = await supabase
       .from('tags')
       .select('*')
       .order('name', { ascending: true })
       .range(offset, offset + perPage - 1);

     if (error) {
       log.error('Error fetching tags', { error });
       throw new Error('خطا در دریافت تگ‌ها');
     }

     const total = count || 0;
     const totalPages = Math.ceil(total / perPage);

     return {
       data: data || [],
       total,
       page,
       perPage,
       totalPages,
     };
   }

   /**
    * Get tag by ID
    */
   export async function getTagById(id: string): Promise<Tag> {
     const supabase = await createClient();

     const { data, error } = await supabase
       .from('tags')
       .select('*')
       .eq('id', id)
       .single();

     if (error || !data) {
       log.error('Tag not found', { id, error });
       throw new Error('تگ یافت نشد');
     }

     return data;
   }

   /**
    * Create a new tag
    */
   export async function createTag(input: {
     name: string;
     slug: string;
   }): Promise<Tag> {
     const supabase = await createClient();

     const { data, error } = await supabase
       .from('tags')
       .insert({
         name: input.name,
         slug: input.slug,
       })
       .select()
       .single();

     if (error) {
       log.error('Error creating tag', { error, input });
       if (error.code === '23505') {
         throw new Error('تگی با این نام یا شناسه قبلاً ثبت شده است');
       }
       throw new Error('خطا در ایجاد تگ');
     }

     log.info('Tag created', { id: data.id, name: data.name });
     return data;
   }

   /**
    * Update tag
    */
   export async function updateTag(
     id: string,
     input: { name?: string; slug?: string }
   ): Promise<Tag> {
     const supabase = await createClient();

     const { data, error } = await supabase
       .from('tags')
       .update(input)
       .eq('id', id)
       .select()
       .single();

     if (error || !data) {
       log.error('Error updating tag', { id, error });
       throw new Error('خطا در بروزرسانی تگ');
     }

     log.info('Tag updated', { id, updates: input });
     return data;
   }

   /**
    * Delete tag
    */
   export async function deleteTag(id: string): Promise<DeleteResult> {
     const supabase = await createClient();

     const { error } = await supabase
       .from('tags')
       .delete()
       .eq('id', id);

     if (error) {
       log.error('Error deleting tag', { id, error });
       throw new Error('خطا در حذف تگ');
     }

     log.info('Tag deleted', { id });
     return { success: true };
   }

   /**
    * Search tags by name
    */
   export async function searchTags(query: string): Promise<Tag[]> {
     const supabase = await createClient();

     const { data, error } = await supabase
       .from('tags')
       .select('*')
       .ilike('name', `%${query}%`)
       .order('name', { ascending: true })
       .limit(20);

     if (error) {
       log.error('Error searching tags', { query, error });
       throw new Error('خطا در جستجوی تگ‌ها');
     }

     return data || [];
   }
   ```

2. **Update Tag API Routes to Use Supabase Service**

   **File**: `src/app/api/tags/route.ts`
   ```typescript
   // Change import from:
   // import { getAllTags } from '@/services/tag-service';
   // To:
   import { getAllTags } from '@/services/tag-service-supabase';
   ```

   Similarly for:
   - `src/app/api/tags/search/route.ts`
   - `src/app/api/admin/tags/route.ts`
   - `src/app/api/admin/tags/[id]/route.ts`

3. **Testing Phase 1**

   Test all tag operations:
   ```bash
   # Start dev server
   npm run dev

   # Test endpoints:
   # 1. List tags
   curl http://localhost:3000/api/tags

   # 2. Search tags
   curl http://localhost:3000/api/tags/search?q=test

   # 3. Create tag (admin, requires auth)
   # Use Postman or browser admin panel

   # 4. Update tag (admin, requires auth)
   # Use admin panel

   # 5. Delete tag (admin, requires auth)
   # Use admin panel
   ```

   **Success Criteria**:
   - ✅ All tag endpoints return correct data
   - ✅ Pagination works correctly
   - ✅ Search returns accurate results
   - ✅ Create/Update/Delete operations work
   - ✅ No errors in console
   - ✅ Response times comparable to Prisma version

   **Rollback if needed**: Just revert the import changes in API routes.

---

### Phase 2: Medium Complexity Service (Category Service) (Estimated: 3-4 hours)

**Goal**: Migrate service with hierarchical relations (self-referencing).

**Why Category Service?**
- Has self-referencing relation (parent/children)
- Medium complexity (315 LOC)
- Important for product organization

#### Tasks:

1. **Create Supabase Category Service**

   **File**: `src/services/category-service-supabase.ts`

   Key challenges:
   - Handle self-referencing relations (parent/children)
   - Use recursive CTEs or multiple queries for hierarchy
   - Maintain slug-based lookups

   Example query for getting category with children:
   ```typescript
   // Get category with parent and children
   const { data, error } = await supabase
     .from('categories')
     .select(`
       *,
       parent:categories!parent_id(*),
       children:categories!parent_id(*)
     `)
     .eq('id', id)
     .single();
   ```

2. **Update Category API Routes**

   Update imports in:
   - `src/app/api/categories/route.ts`
   - `src/app/api/categories/[slug]/route.ts`
   - `src/app/api/admin/categories/route.ts`
   - `src/app/api/admin/categories/[id]/route.ts`
   - `src/app/api/admin/categories/bulk/route.ts`

3. **Testing Phase 2**

   Test category hierarchy:
   ```bash
   # List categories
   curl http://localhost:3000/api/categories

   # Get category by slug with children
   curl http://localhost:3000/api/categories/electronics

   # Test admin operations (create parent/child categories)
   # Use admin panel
   ```

   **Success Criteria**:
   - ✅ Category hierarchy loads correctly
   - ✅ Parent/child relationships preserved
   - ✅ Slug-based lookups work
   - ✅ All CRUD operations functional
   - ✅ No data corruption in hierarchy

---

### Phase 3: Complex Service with Relations (Product Service) (Estimated: 6-8 hours)

**Goal**: Migrate the most complex service with multiple relations.

**Why Product Service Last for Core Data?**
- Largest service (1,014 LOC)
- Complex relations: media, variants, tags, category
- Critical business logic (stock management)
- Most used service

#### Challenges:

1. **Many-to-Many Relations**: Product ↔ Tag via junction table
2. **One-to-Many**: Product → ProductMedia, Product → ProductVariant
3. **Nested Relations**: ProductVariant → ProductMedia
4. **Complex Queries**: Pagination with filters, full-text search
5. **Stock Calculations**: Automatic stock updates from variants

#### Tasks:

1. **Create Supabase Product Service**

   **File**: `src/services/product-service-supabase.ts`

   Key patterns:
   ```typescript
   // Example: Get product with all relations
   const { data, error } = await supabase
     .from('products')
     .select(`
       *,
       category:categories(*),
       tags:_ProductToTag(tag:tags(*)),
       media:product_media!productId(
         *,
         order(order.asc)
       ),
       variants:product_variants(
         *,
         media:product_media!variantId(*, order(order.asc))
       )
     `)
     .eq('id', id)
     .single();

   // Flatten tags from junction table
   const product = {
     ...data,
     tags: data.tags.map(t => t.tag)
   };
   ```

2. **Handle Stock Updates**

   Implement `updateProductStockFromVariants` with Supabase:
   ```typescript
   export async function updateProductStockFromVariants(productId: string) {
     const supabase = await createClient();

     // Get sum of variant stocks
     const { data: variants } = await supabase
       .from('product_variants')
       .select('stock')
       .eq('productId', productId);

     const totalStock = variants?.reduce((sum, v) => sum + v.stock, 0) || 0;

     // Update product stock
     await supabase
       .from('products')
       .update({ stock: totalStock })
       .eq('id', productId);
   }
   ```

3. **Update All Product API Routes**

   ~15 route files to update (list from earlier Glob)

4. **Testing Phase 3**

   Comprehensive product testing:
   ```bash
   # Public endpoints
   curl http://localhost:3000/api/products
   curl http://localhost:3000/api/products/[id]

   # Admin operations
   # - Create product with variants
   # - Add media to product
   # - Add media to variant
   # - Test stock auto-calculation
   # - Reorder products
   # - Bulk operations
   ```

   **Success Criteria**:
   - ✅ Product listing with pagination
   - ✅ Product detail with all relations
   - ✅ Media ordering correct
   - ✅ Variant stock calculation works
   - ✅ Tag associations preserved
   - ✅ Category linkage works
   - ✅ Search/filter functionality intact

---

### Phase 4: Authentication & User Services (Estimated: 4-5 hours)

**Goal**: Migrate user and auth services while maintaining NextAuth.js.

**Critical**: We're NOT migrating to Supabase Auth. Keep NextAuth.js.

#### Tasks:

1. **Migrate User Service**

   **File**: `src/services/user-service-supabase.ts`

   Keep modular structure:
   - `src/services/user-service-supabase/queries.ts`
   - `src/services/user-service-supabase/password.ts`
   - `src/services/user-service-supabase/validation.ts`

2. **Migrate Auth Service**

   **File**: `src/services/auth-service-supabase.ts`

   Key operations:
   - `authenticateUser` - verify credentials
   - `authenticateUserByPhone` - OTP login
   - `authenticateUserByEmail` - OTP login

3. **Migrate OTP Service**

   **File**: `src/services/otp-service-supabase.ts`

   Maintain rate limiting logic

4. **Update NextAuth Options**

   **File**: `src/lib/auth/options.ts`
   ```typescript
   // Change import from Prisma to Supabase
   import { createClient } from '@/lib/supabase/server';

   // Update authorize function to use Supabase queries
   async authorize(credentials) {
     const supabase = await createClient();

     const { data: user } = await supabase
       .from('users')
       .select('*')
       .eq(identifierType === 'email' ? 'email' : 'phone', credentials.identifier)
       .single();

     // ... rest of logic
   }
   ```

5. **Testing Phase 4**

   Critical auth flow testing:
   ```bash
   # Test login (password)
   # Test login (OTP)
   # Test register (password)
   # Test register (OTP)
   # Test session persistence
   # Test role-based access (admin vs user)
   ```

   **Success Criteria**:
   - ✅ Email/password login works
   - ✅ Phone/password login works
   - ✅ OTP registration works
   - ✅ OTP login works
   - ✅ Sessions persist correctly
   - ✅ Role-based middleware works
   - ✅ User profile updates work

---

### Phase 5: Transaction & Payment Service (Estimated: 5-6 hours)

**Goal**: Migrate transaction service with payment gateway integration.

**Critical**: Transaction atomicity must be preserved.

#### Challenges:

1. **Transaction Atomicity**: Create transaction + items in single DB transaction
2. **Stock Management**: Reduce stock after payment verification
3. **Zarinpal Integration**: Maintain payment flow
4. **Invoice Generation**: After successful payment

#### Tasks:

1. **Create Supabase Transaction Service**

   **File**: `src/services/transaction-service-supabase.ts`

   Use Supabase RPC for complex transactions:
   ```typescript
   // Create stored procedure for atomic transaction creation
   // Or use multiple queries with error handling
   export async function createTransaction(data) {
     const supabase = await createClient();

     try {
       // 1. Create transaction
       const { data: transaction, error: txError } = await supabase
         .from('transactions')
         .insert({
           userId: data.userId,
           amount: data.amount,
           transactionCode: generateTransactionCode(),
           // ... other fields
         })
         .select()
         .single();

       if (txError) throw txError;

       // 2. Create transaction items
       const items = data.items.map(item => ({
         transactionId: transaction.id,
         productId: item.productId,
         variantId: item.variantId,
         quantity: item.quantity,
         price: item.price,
       }));

       const { error: itemsError } = await supabase
         .from('transaction_items')
         .insert(items);

       if (itemsError) {
         // Rollback: delete transaction
         await supabase.from('transactions').delete().eq('id', transaction.id);
         throw itemsError;
       }

       // 3. Fetch with relations
       const { data: fullTransaction } = await supabase
         .from('transactions')
         .select(`
           *,
           items:transaction_items(
             *,
             product:products(*),
             variant:product_variants(*)
           ),
           user:users(id, email, name)
         `)
         .eq('id', transaction.id)
         .single();

       return fullTransaction;
     } catch (error) {
       log.error('Transaction creation failed', { error });
       throw error;
     }
   }
   ```

2. **Stock Reduction Logic**

   Implement atomic stock reduction:
   ```typescript
   export async function reduceProductStock(items) {
     const supabase = await createClient();

     for (const item of items) {
       if (item.variantId) {
         // Reduce variant stock
         await supabase.rpc('decrement_variant_stock', {
           variant_id: item.variantId,
           quantity: item.quantity
         });
       } else {
         // Reduce product stock
         await supabase.rpc('decrement_product_stock', {
           product_id: item.productId,
           quantity: item.quantity
         });
       }
     }
   }
   ```

   Create database functions:
   ```sql
   -- Add to Supabase SQL Editor or migration
   CREATE OR REPLACE FUNCTION decrement_product_stock(product_id uuid, quantity int)
   RETURNS void AS $$
   BEGIN
     UPDATE products
     SET stock = stock - quantity
     WHERE id = product_id AND stock >= quantity;
   END;
   $$ LANGUAGE plpgsql;

   CREATE OR REPLACE FUNCTION decrement_variant_stock(variant_id uuid, quantity int)
   RETURNS void AS $$
   BEGIN
     UPDATE product_variants
     SET stock = stock - quantity
     WHERE id = variant_id AND stock >= quantity;
   END;
   $$ LANGUAGE plpgsql;
   ```

3. **Update Transaction API Routes**

   - `src/app/api/transactions/create/route.ts`
   - `src/app/api/transactions/verify/route.ts`
   - `src/app/api/transactions/[id]/route.ts`
   - `src/app/api/user/transactions/route.ts`
   - `src/app/api/admin/transactions/route.ts`
   - `src/app/api/admin/transactions/[id]/route.ts`

4. **Testing Phase 5**

   Critical payment flow testing:
   ```bash
   # Create transaction (guest)
   # Create transaction (authenticated user)
   # Payment flow (sandbox Zarinpal)
   # Verify payment success
   # Check stock reduction
   # Check invoice generation
   # Test orphaned transaction cleanup
   ```

   **Success Criteria**:
   - ✅ Transaction creation works
   - ✅ Payment gateway integration intact
   - ✅ Stock reduction on payment success
   - ✅ Invoice generation works
   - ✅ Transaction history loads
   - ✅ No race conditions in stock updates

---

### Phase 6: Admin & Support Services (Estimated: 3-4 hours)

**Goal**: Migrate remaining services (admin, promo, settings).

#### Tasks:

1. **Migrate Admin Service**

   **File**: `src/services/admin-service-supabase.ts`

   - Dashboard stats
   - User management
   - Bulk operations

2. **Migrate Promo Service**

   **File**: `src/services/promo-service-supabase.ts`

   - Promo code generation
   - Validation
   - Usage tracking

3. **Migrate Site Settings**

   **File**: `src/services/settings-service-supabase.ts` (if exists)

4. **Update API Routes**

   - All admin routes
   - Promo routes
   - Settings routes

5. **Testing Phase 6**

   - Admin dashboard loads
   - Stats display correctly
   - Bulk operations work
   - Promo codes functional

---

### Phase 7: Cleanup & Optimization (Estimated: 2-3 hours)

**Goal**: Remove Prisma dependencies and optimize Supabase usage.

#### Tasks:

1. **Remove Prisma Files**
   ```bash
   # DO NOT DELETE YET - Keep for reference during migration
   # After all services migrated and tested:

   # 1. Remove Prisma client imports
   # 2. Delete old service files (keep as backup in separate branch)
   # 3. Rename -supabase.ts files to remove suffix
   # 4. Update all imports
   ```

2. **Uninstall Prisma**
   ```bash
   npm uninstall prisma @prisma/client

   # Archive prisma directory (don't delete yet)
   mv prisma prisma.backup
   ```

3. **Update Documentation**
   - Update `CLAUDE.md`
   - Update `README.md`
   - Create `SUPABASE_MIGRATION_COMPLETED.md`

4. **Performance Optimization**

   - Add indexes if needed (via Supabase SQL Editor)
   - Review query performance
   - Optimize relation fetching (use select only needed fields)
   - Add database functions for complex operations

5. **Type Safety Improvements**

   - Regenerate Supabase types: `npx supabase gen types typescript --project-id gozxjxtnrbuurmstjydo > src/types/supabase.ts`
   - Update type imports across codebase
   - Fix any type errors

---

## Migration Checklist

### Before Each Phase
- [ ] Backup current database (Supabase dashboard)
- [ ] Create feature branch (`git checkout -b migration/phase-X`)
- [ ] Review service code to understand Prisma queries
- [ ] Design Supabase equivalent queries

### During Each Phase
- [ ] Write new service file (don't replace original)
- [ ] Update API route imports one at a time
- [ ] Test each endpoint after update
- [ ] Monitor console for errors
- [ ] Compare responses with Prisma version

### After Each Phase
- [ ] Run full test suite (manual or automated)
- [ ] Check dev server for errors
- [ ] Test admin panel functionality
- [ ] Test user-facing features
- [ ] Commit changes (`git commit -m "Phase X: Migrate [service]"`)
- [ ] Document any issues encountered

---

## Testing Strategy

### Manual Testing Checklist

#### Public Features
- [ ] Browse products
- [ ] View product details
- [ ] Add to cart
- [ ] Checkout (guest)
- [ ] Checkout (authenticated)
- [ ] Payment flow
- [ ] View invoice

#### User Features
- [ ] Register (email + password)
- [ ] Register (phone + OTP)
- [ ] Login (email + password)
- [ ] Login (phone + OTP)
- [ ] Update profile
- [ ] View transaction history
- [ ] Change password

#### Admin Features
- [ ] View dashboard stats
- [ ] Manage products (CRUD)
- [ ] Manage variants
- [ ] Upload media
- [ ] Manage categories (hierarchy)
- [ ] Manage tags
- [ ] Manage users
- [ ] View transactions
- [ ] Bulk operations
- [ ] Reorder products

### Automated Testing (Optional)

Create test scripts for critical flows:
```typescript
// tests/supabase-migration.test.ts
import { createClient } from '@/lib/supabase/server';

describe('Supabase Migration Tests', () => {
  test('Product service returns correct data', async () => {
    const supabase = await createClient();
    const { data } = await supabase.from('products').select('*').limit(1);
    expect(data).toBeDefined();
    expect(data.length).toBe(1);
  });

  // Add more tests...
});
```

---

## Rollback Strategy

### Per-Phase Rollback

If a phase fails:
1. **Revert Import Changes**: Change API routes back to Prisma service imports
2. **Git Reset**: `git reset --hard HEAD` (if not committed)
3. **Git Revert**: `git revert <commit>` (if already committed)
4. **Redeploy**: Push previous working version

### Full Migration Rollback

If entire migration needs to be rolled back:
```bash
# 1. Switch back to Prisma
git checkout main

# 2. Update environment variables
DATABASE_URL="postgresql://kitia_user:kitia_password@localhost:5432/kitia?schema=public"

# 3. Reinstall Prisma
npm install prisma @prisma/client

# 4. Generate Prisma client
npx prisma generate

# 5. Redeploy
vercel --prod
```

---

## Common Pitfalls & Solutions

### 1. **Many-to-Many Relations**

**Problem**: Prisma auto-manages junction tables, Supabase doesn't.

**Solution**: Explicitly query junction table and flatten results.
```typescript
// Prisma (implicit)
const product = await prisma.product.findUnique({
  where: { id },
  include: { tags: true }
});

// Supabase (explicit)
const { data } = await supabase
  .from('products')
  .select('*, tags:_ProductToTag(tag:tags(*))')
  .eq('id', id)
  .single();

const product = {
  ...data,
  tags: data.tags.map(t => t.tag)
};
```

### 2. **Decimal Types**

**Problem**: Prisma returns Decimal objects, Supabase returns numbers.

**Solution**: Remove `Number()` conversions in API routes (Supabase already returns numbers).

### 3. **Nested Writes**

**Problem**: Prisma supports nested create/update, Supabase doesn't.

**Solution**: Break into sequential queries with error handling.
```typescript
// Prisma (nested)
await prisma.product.create({
  data: {
    name: 'Product',
    variants: {
      create: [{ name: 'Variant 1' }]
    }
  }
});

// Supabase (sequential)
const { data: product } = await supabase
  .from('products')
  .insert({ name: 'Product' })
  .select()
  .single();

await supabase
  .from('product_variants')
  .insert({ productId: product.id, name: 'Variant 1' });
```

### 4. **Transactions**

**Problem**: Prisma has `$transaction`, Supabase doesn't have built-in transactions in JS.

**Solution**: Use PostgreSQL functions (RPC) or sequential queries with rollback logic.

### 5. **Count with Data**

**Problem**: Prisma can count and fetch in one query, Supabase requires two.

**Solution**: Use `count: 'exact'` option.
```typescript
const { data, count } = await supabase
  .from('products')
  .select('*', { count: 'exact' })
  .range(0, 9);
```

---

## Performance Considerations

### Supabase Advantages
- ✅ PostgREST API is highly optimized
- ✅ Connection pooling built-in (PgBouncer)
- ✅ No ORM overhead
- ✅ Real-time capabilities (if needed later)

### Potential Issues
- ⚠️ More HTTP requests (vs. Prisma's batch queries)
- ⚠️ Manual relation fetching
- ⚠️ Need to optimize select fields

### Optimization Tips
1. **Select Only Needed Fields**: Avoid `select('*')`
2. **Use Indexes**: Add on frequently queried fields
3. **Batch Where Possible**: Use `in()` filters
4. **Cache Aggressively**: Leverage existing Redis cache
5. **Use Database Functions**: For complex operations (RPC)

---

## Environment-Specific Configuration

### Development (Local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://gozxjxtnrbuurmstjydo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<preview_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<preview_service_role_key>
```

### Preview/Staging (Vercel)
Same as development (use Preview database).

### Production (Vercel)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://tanqgnztclrucfldxhuk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<production_service_role_key>
```

**Important**: Update environment variables in Vercel dashboard for each environment.

---

## Success Metrics

### Functional Metrics
- [ ] All API endpoints return correct data
- [ ] All user flows work end-to-end
- [ ] Admin panel fully functional
- [ ] Payment flow completes successfully
- [ ] No data loss or corruption

### Performance Metrics
- [ ] Response times within 10% of Prisma baseline
- [ ] No increase in error rates
- [ ] Database query count reasonable
- [ ] Vercel build succeeds

### Code Quality Metrics
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Logging shows no unexpected errors
- [ ] Code follows existing patterns

---

## Timeline Estimate

| Phase | Estimated Time | Buffer | Total |
|-------|----------------|--------|-------|
| Phase 0: Foundation | 1-2 hours | +1 hour | 3 hours |
| Phase 1: Tag Service | 2-3 hours | +1 hour | 4 hours |
| Phase 2: Category Service | 3-4 hours | +2 hours | 6 hours |
| Phase 3: Product Service | 6-8 hours | +4 hours | 12 hours |
| Phase 4: Auth/User Services | 4-5 hours | +2 hours | 7 hours |
| Phase 5: Transaction Service | 5-6 hours | +3 hours | 9 hours |
| Phase 6: Admin/Support | 3-4 hours | +2 hours | 6 hours |
| Phase 7: Cleanup | 2-3 hours | +1 hour | 4 hours |
| **Total** | **26-35 hours** | **+16 hours** | **51 hours** |

**Realistic Timeline**: 5-7 full working days (with testing and issue resolution).

---

## Support & Resources

### Supabase Documentation
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgREST API](https://postgrest.org/en/stable/)
- [Database Functions (RPC)](https://supabase.com/docs/guides/database/functions)
- [Supabase with Next.js](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

### Migration References
- [Prisma to Supabase Migration Guide](https://supabase.com/docs/guides/migrations/prisma)
- [Next.js App Router + Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

## Final Notes

### What This Migration Achieves

1. **Serverless Compatibility**: Eliminates Prisma's connection pooling issues in serverless
2. **Supabase Ecosystem**: Opens door to Supabase features (Storage, Auth, Realtime, Edge Functions)
3. **Performance**: Potentially faster queries via PostgREST
4. **Cost**: May reduce database connection costs
5. **Scalability**: Better suited for serverless scaling

### What Doesn't Change

- **Application Architecture**: Service layer pattern remains
- **Authentication**: NextAuth.js stays (not migrating to Supabase Auth)
- **File Storage**: Cloudflare R2 stays (not using Supabase Storage)
- **Caching**: Upstash Redis stays
- **Database Schema**: No schema changes (same PostgreSQL database)

### Recommended Approach

**Start with Phase 0-1**, test thoroughly, and **only proceed if successful**. Each phase can be done in a separate session, allowing for breaks and testing.

**Do NOT rush.** A single broken payment flow or data corruption is worse than taking extra time to verify.

---

## Questions Before Starting?

Before beginning migration, ensure:
1. ✅ You have Supabase service role key
2. ✅ Database backup is available
3. ✅ You understand the service layer architecture
4. ✅ You can rollback if needed
5. ✅ You have allocated sufficient time for testing

---

**Document Version**: 1.0
**Created**: 2025-12-18
**Last Updated**: 2025-12-18
**Status**: Ready for Implementation
**Branch**: `migration/prisma-to-supabase`
