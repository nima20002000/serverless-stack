# Payment Method & Guest Tracking Deployment Guide

## Overview
This feature adds comprehensive payment gateway tracking and explicit guest status to the transaction system, enabling multi-gateway support (Zarinpal, Digipay, and future gateways).

## What Changed

### Database Changes
- **New Enum**: `PaymentMethod` with values `ZARINPAL`, `DIGIPAY`
- **New Column**: `paymentMethod` in transactions table (default: ZARINPAL)
- **New Column**: `isGuest` in transactions table (boolean)
- **New Indexes**: Performance indexes on `paymentMethod` and `isGuest`

### Code Changes
- Updated Prisma schema with new fields
- Modified transaction creation service to accept payment method
- Enhanced API routes to validate and log payment methods
- Updated admin dashboard to display payment gateway badges
- Added TypeScript types across frontend components
- Fixed guest-to-user conversion to update `isGuest` flag

## Database Migration Status

### ✅ Preview Database (gozxjxtnrbuurmstjydo)
**Status**: COMPLETED
- PaymentMethod enum created
- Columns added with defaults
- 9 existing transactions backfilled
- Indexes created

### ⚠️ Local Database
**Status**: NOT MIGRATED
- Run migration manually before testing locally

### ⚠️ Production Database (tanqgnztclrucfldxhuk)
**Status**: NOT MIGRATED
- Apply migration when ready for production deployment

## Deployment Steps

### Step 1: Apply Local Database Migration (For Testing)

```bash
# Connect to local database
PGPASSWORD="kitia_password" psql -h localhost -U kitia_user -d kitia

# Run migration
\i migrations/add_payment_method_tracking.sql

# Verify
SELECT "paymentMethod", "isGuest", COUNT(*)
FROM transactions
GROUP BY "paymentMethod", "isGuest";
```

### Step 2: Test Locally

```bash
# Generate Prisma client
npx prisma generate

# Run development server
npm run dev

# Test scenarios:
# 1. Guest checkout (no login)
# 2. Registered user checkout
# 3. Guest checkout with account creation
# 4. View transactions in admin dashboard
# 5. View transactions in user profile
```

### Step 3: Deploy to Preview Environment

```bash
# Push branch to GitHub (DONE)
git push origin feature/payment-method-tracking

# Vercel will auto-deploy to preview URL
# Preview database already has migration applied
```

### Step 4: Merge to Main (After Testing)

```bash
# Create pull request on GitHub
# Review changes
# Merge to main branch
```

### Step 5: Apply Production Database Migration

**IMPORTANT**: Run this AFTER merging to main and BEFORE Vercel deploys production

```bash
# Connect to production database
PGPASSWORD="BHZnE4rPyZO4lSmA" psql \
  -h aws-1-ap-southeast-1.pooler.supabase.com \
  -U postgres.tanqgnztclrucfldxhuk \
  -d postgres \
  -p 6543

# Run migration
\i migrations/add_payment_method_tracking.sql

# Verify
SELECT "paymentMethod", "isGuest", COUNT(*)
FROM transactions
GROUP BY "paymentMethod", "isGuest";
```

### Step 6: Deploy to Production

```bash
# Vercel will auto-deploy from main branch
# Or trigger manual deployment
vercel --prod
```

## Edge Cases Handled

### 1. ✅ Checkout Without Payment Method Selection
- **Issue**: Checkout form doesn't send `paymentMethod` parameter
- **Solution**: API defaults to ZARINPAL if not provided
- **Future**: Add payment gateway selector UI when Digipay is integrated

### 2. ✅ Guest User Account Creation
- **Issue**: When guest creates account after payment, `isGuest` wasn't updated
- **Solution**: Transaction verify endpoint now sets `isGuest=false` when linking user

### 3. ✅ Existing Transactions Backfill
- **Issue**: Existing transactions don't have new fields
- **Solution**: Migration sets default values and backfills `isGuest` based on `userId`

### 4. ✅ Query Compatibility
- **Issue**: Existing queries might not include new fields
- **Solution**: Prisma automatically includes all columns; TypeScript types updated

### 5. ✅ Index Performance
- **Issue**: Filtering by payment method or guest status could be slow
- **Solution**: Created indexes on both fields

## API Behavior

### Transaction Creation
```json
POST /api/transactions/create
{
  "items": [...],
  "shippingInfo": {...},
  "paymentMethod": "ZARINPAL" // Optional, defaults to ZARINPAL
}
```

### Admin Transaction List
Returns transactions with:
- `paymentMethod`: "ZARINPAL" | "DIGIPAY"
- `isGuest`: true | false

### User Transaction History
Returns user's transactions with new fields included

## Frontend Updates

### Admin Dashboard
- New column: "درگاه" (Gateway) showing payment method badge
- Enhanced user column: Gray "مهمان" badge for guest users
- Color-coded badges:
  - Blue badge: Payment gateway (زرین‌پال / دیجی‌پی)
  - Gray badge: Guest indicator

### User Profile
- Transaction interface updated with new fields
- No visual changes yet (can be added later)

## Future Work

### Phase 1: Add Digipay Integration
1. Implement Digipay client similar to Zarinpal
2. Add payment gateway selector UI in checkout
3. Update transaction verify endpoint to handle Digipay callbacks
4. Test full flow with Digipay

### Phase 2: Analytics Dashboard
1. Add payment gateway breakdown charts
2. Show guest conversion rate metrics
3. Compare gateway performance (success rates, speed)

### Phase 3: User UID (Optional)
1. Add human-readable `uid` field to users table
2. Display in user profile ("شناسه کاربری: U-000123")
3. Use for customer support lookups

## Rollback Plan

If issues arise in production:

```bash
# Rollback code (git)
git revert <commit-hash>
git push origin main

# Rollback database (PostgreSQL)
# CAUTION: This will delete the new columns and data
ALTER TABLE transactions DROP COLUMN "paymentMethod";
ALTER TABLE transactions DROP COLUMN "isGuest";
DROP INDEX transactions_paymentmethod_idx;
DROP INDEX transactions_isguest_idx;
DROP TYPE "PaymentMethod";
```

## Testing Checklist

- [ ] Local database migration applied successfully
- [ ] Build passes without errors
- [ ] Guest checkout creates transaction with `isGuest=true`
- [ ] Registered user checkout creates transaction with `isGuest=false`
- [ ] Guest account creation updates `isGuest=false`
- [ ] Admin dashboard shows payment method badge
- [ ] Admin dashboard shows guest indicator
- [ ] User profile loads transaction history
- [ ] Payment verification works (Zarinpal callback)
- [ ] Transaction status updates correctly
- [ ] Stock reduction happens after payment

## Support

For questions or issues:
1. Check GitHub issues: https://github.com/nima20002000/kitia/issues
2. Review commit: `55070d4` - feat: add payment method and guest tracking
3. Review this deployment guide

## Database Connection Strings

### Local Development
```
postgresql://kitia_user:kitia_password@localhost:5432/kitia
```

### Preview (gozxjxtnrbuurmstjydo)
```
postgresql://postgres.gozxjxtnrbuurmstjydo:PawK0YK7sYbCzzMi@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Production (tanqgnztclrucfldxhuk)
```
postgresql://postgres.tanqgnztclrucfldxhuk:BHZnE4rPyZO4lSmA@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
