# Supabase Production Database Status

**Date:** 2025-12-18
**Branch:** `migration/prisma-to-supabase`
**Status:** ✅ READY - Production and Preview databases are synchronized

## Summary

The production Supabase database (`tanqgnztclrucfldxhuk`) has been successfully synchronized with the preview database (`gozxjxtnrbuurmstjydo`). All critical schema changes from the migration branch have been applied to both databases.

## Environment Variables

### Preview Database (Currently Active)
```bash
NEXT_PUBLIC_SUPABASE_URL="https://gozxjxtnrbuurmstjydo.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_Rq9gEQnL6ntOnSsjZtQqmQ_0o6Zy3m6"
SUPABASE_SECRET_KEY="sb_secret__jK6cznYH7XoCupQbeC7Xw_mGdhSeVn"
```

Connection String:
```
postgresql://postgres.gozxjxtnrbuurmstjydo:PawK0YK7sYbCzzMi@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
```

### Production Database (For Main Branch)
```bash
NEXT_PUBLIC_SUPABASE_URL="https://tanqgnztclrucfldxhuk.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="[Get from Supabase Dashboard]"
SUPABASE_SECRET_KEY="[Get from Supabase Dashboard]"
```

Connection String:
```
postgresql://postgres.tanqgnztclrucfldxhuk:BHZnE4rPyZO4lSmA@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

**Note:** You'll need to get the production publishable and secret keys from Supabase Dashboard → Project Settings → API.

## Database Schema Comparison

### Tables in Both Databases (Identical)
✅ All 13 critical tables exist in both databases with matching schemas:
- `_ProductToTag` - Product-Tag junction table
- `categories` - Product categories (hierarchical)
- `invoices` - Transaction invoices
- `otp_verifications` - OTP codes for authentication
- `product_media` - Product and variant images/videos
- `product_variants` - Product variants (size, color, etc.)
- `products` - Main products table
- `promo_codes` - Promotional codes
- `site_settings` - Site configuration
- `tags` - Product tags
- `transaction_items` - Transaction line items
- `transactions` - Payment transactions
- `users` - User accounts

### Critical Migrations Applied to Production ✅

All three migration files have been applied to production:

#### 1. Payment Method Tracking (`add_payment_method_tracking.sql`)
- ✅ `PaymentMethod` enum created (ZARINPAL, DIGIPAY)
- ✅ `transactions.paymentMethod` column added
- ✅ `transactions.isGuest` column added
- ✅ `transactions.digipayTicket` column added
- ✅ `transactions.digipayTrackingCode` column added
- ✅ Indexes created for performance

#### 2. User UID (`add_user_uid.sql`)
- ✅ `users.uid` column added (format: U-000001, U-000002, etc.)
- ✅ Unique constraint and index created

#### 3. Variant Tracking (`add_variant_to_transaction_item.sql`)
- ✅ `transaction_items.variantId` column added
- ✅ Foreign key constraint to `product_variants` table

### Minor Differences (Non-Critical)

The following differences exist but **do not affect functionality**:

1. **_prisma_migrations table**
   - Preview: Has this table (Prisma metadata)
   - Production: Doesn't have it
   - **Impact:** None - this is just Prisma bookkeeping

2. **Column order differences**
   - `users` table has different column ordering between databases
   - **Impact:** None - column order doesn't affect queries

### Default Values - SYNCHRONIZED ✅

All default value differences have been fixed via `fix_production_defaults.sql` migration:
- ✅ `categories.id`: Both have `gen_random_uuid()` default
- ✅ `categories.updatedAt`: Both have `CURRENT_TIMESTAMP` default
- ✅ `tags.id`: Both have `gen_random_uuid()` default
- ✅ `tags.createdAt`: Both use `now()` default
- ✅ `tags.updatedAt`: Both use `now()` default

## Build Status

✅ **Build successful** with preview database connection
- All 43 API routes verified
- All 28 static pages generated
- No TypeScript errors
- Ready for deployment

## Migration Files Applied

All migration files in `/migrations/` directory have been applied to production:
1. `add_payment_method_tracking.sql` - Zarinpal/Digipay support
2. `add_user_uid.sql` - Human-readable user IDs
3. `add_variant_to_transaction_item.sql` - Variant tracking in orders
4. `fix_production_defaults.sql` - **NEW** - Synchronize default values with preview database

## Next Steps

### For Merging to Main Branch (DO NOT DO YET - per user instructions)
1. Stay on `migration/prisma-to-supabase` branch
2. Keep using preview database for testing
3. When ready to merge:
   - Update `.env` or `.env.production` with production Supabase credentials
   - Merge to main branch
   - Deploy to Vercel
   - Vercel will automatically use `.env.production` for production deployments

### Production Database Access

**Dashboard Access:**
- Production: https://supabase.com/dashboard/project/tanqgnztclrucfldxhuk
- Preview: https://supabase.com/dashboard/project/gozxjxtnrbuurmstjydo

**SQL Editor Access:**
```bash
# Production
PGPASSWORD="BHZnE4rPyZO4lSmA" psql -h aws-1-ap-southeast-1.pooler.supabase.com -U postgres.tanqgnztclrucfldxhuk -d postgres -p 6543

# Preview
PGPASSWORD="PawK0YK7sYbCzzMi" psql -h aws-1-ap-northeast-2.pooler.supabase.com -U postgres.gozxjxtnrbuurmstjydo -d postgres -p 6543
```

## Verification Checklist

- ✅ All critical migrations applied to production
- ✅ Schema comparison completed (no critical differences)
- ✅ Local development connected to preview database
- ✅ Build successful with no errors
- ✅ Environment variables documented
- ✅ Migration files preserved in `/migrations/` directory

## Recommendations

1. **Keep preview database** as the development/staging environment
2. **Production database** is ready but should only be used after merging to main
3. **Test thoroughly** on preview before merging to main
4. **Document all schema changes** in future migrations
5. **Always apply migrations to preview first**, then production

## Database Region Information

- **Production:** AWS Southeast Asia (Singapore) - `aws-1-ap-southeast-1`
- **Preview:** AWS Northeast Asia (Seoul) - `aws-1-ap-northeast-2`

Both databases use PgBouncer for connection pooling (port 6543).
