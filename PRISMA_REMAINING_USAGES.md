# Remaining Prisma Usages (Migration Tracking)

**Branch**: `migration/prisma-to-supabase`
**Date**: 2025-12-18
**Status**: Prisma query logging disabled, but files still import Prisma client

## Summary

After migrating most services to Supabase, the following files still import and use the Prisma client. These need to be migrated to use Supabase instead.

## Active API Routes Using Prisma

### 1. Admin Settings (`/api/admin/settings/route.ts`)
**Functionality**: Site settings management (key-value pairs)
- **Prisma Usage**: `prisma.siteSettings.findMany()`, `prisma.siteSettings.upsert()`
- **Migration TODO**: Create Supabase service for site settings
- **Database Table**: `site_settings`

### 2. Bulk Category Operations (`/api/admin/categories/bulk/route.ts`)
**Functionality**: Bulk delete and update categories
- **Prisma Usage**: 
  - `prisma.category.findMany()` - Check for products/children
  - `prisma.category.deleteMany()` - Delete categories
  - `prisma.category.updateMany()` - Update categories
- **Migration TODO**: Migrate to `category-service-supabase.ts` (if not exists, create it)
- **Database Table**: `categories`

### 3. Bulk Product Operations (`/api/admin/products/bulk/route.ts`)
**Functionality**: Bulk delete and update products
- **Prisma Usage**:
  - `prisma.product.deleteMany()` - Delete products
  - `prisma.product.updateMany()` - Update products
- **Migration TODO**: Add bulk operations to `product-service-supabase.ts`
- **Database Table**: `products`

### 4. Bulk User Operations (`/api/admin/users/bulk/route.ts`)
**Functionality**: Bulk delete and update users
- **Prisma Usage**:
  - `prisma.user.deleteMany()` - Delete users
  - `prisma.user.updateMany()` - Update users
- **Migration TODO**: Add bulk operations to `user-service-supabase.ts`
- **Database Table**: `users`

## Legacy Service Files (Not Imported by API Routes)

These service files still exist and import Prisma, but are **NOT** actively used by API routes (Supabase versions are used instead):

- `src/services/transaction-service.ts` → Using `transaction-service-supabase.ts` instead
- `src/services/promo-service.ts` → Using `promo-service-supabase.ts` instead
- `src/services/product-service.ts` → Using `product-service-supabase.ts` instead
- `src/services/admin-service.ts` → Using `admin-service-supabase.ts` instead
- `src/services/tag-service.ts` → Using `tag-service-supabase.ts` instead
- `src/services/user-service.ts` → Using `user-service-supabase.ts` instead
- `src/services/auth-service.ts` → Using `auth-service-supabase.ts` instead
- `src/services/otp-service.ts` → Using `otp-service-supabase.ts` instead
- `src/services/category-service.ts` → Still used (no Supabase version exists)

**Action**: These can be deleted or kept for reference until migration is complete.

## Prisma Client Configuration

**File**: `src/lib/prisma/client.ts`
- Query logging has been **disabled** to prevent `prisma:query` logs in development
- Still connects to local PostgreSQL database
- **Migration TODO**: Eventually remove this file entirely when all migrations complete

## Migration Priority

**High Priority** (Active routes):
1. `/api/admin/settings/route.ts` - Site settings
2. `/api/admin/categories/bulk/route.ts` - Bulk category operations
3. `/api/admin/products/bulk/route.ts` - Bulk product operations
4. `/api/admin/users/bulk/route.ts` - Bulk user operations

**Low Priority** (Legacy files):
- Delete old service files after verifying all routes use Supabase versions
- Remove `src/lib/prisma/client.ts` when no longer needed
- Remove Prisma from `package.json` dependencies

## Notes

- **Do NOT merge this branch to main** until migration is complete
- Local project is connected to **Preview Supabase database** for testing
- Prisma client still exists for backward compatibility during migration
- All auth, OTP, product, transaction, promo, and user services already migrated to Supabase
