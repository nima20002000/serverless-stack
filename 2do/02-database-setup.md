# Database Setup Tasks

## Status: ✅ COMPLETE
**Priority**: Critical
**Estimated Complexity**: Low
**Last Updated**: 2025-11-09
**Completion Date**: 2025-11-09

---

## Overview
Set up PostgreSQL database, run migrations, and create seed data for development.

---

## Tasks

### 1. Database Installation & Configuration ✅ COMPLETE
- [x] Install PostgreSQL locally (PostgreSQL 16 installed)
- [x] Create database named 'kitia'
- [x] Update DATABASE_URL in .env file
- [x] Test database connection
- [x] Grant CREATEDB permission for shadow database support

### 2. Prisma Migrations ✅ COMPLETE
- [x] Run initial migration: `npx prisma migrate dev --name init`
- [x] Verify all tables are created correctly
- [x] Check indexes and constraints
- [x] Test foreign key relationships
- [x] Migration file: `prisma/migrations/20251109140642_init/`

### 3. Prisma Studio ✅ COMPLETE
- [x] Test Prisma Studio access: `npx prisma studio`
- [x] Verify all models are visible
- [x] Test basic CRUD operations through Studio

### 4. Seed Data ✅ COMPLETE
- [x] Create seed script (`prisma/seed.ts`)
- [x] Add seed script to package.json
- [x] Create admin user (email: admin@kitia.com, password: Admin123!)
- [x] Create sample products (10 items)
- [x] Create test user accounts (user1@test.com, user2@test.com)
- [x] Add sample transactions (completed and pending)
- [x] Generate test promo codes

### 5. Seed Script Contents
```typescript
// Admin user
- Email: admin@kitia.com
- Password: Admin123!
- Role: ADMIN

// Test users
- 2-3 regular users with different scenarios
- One with active promo code
- One with used promo code

// Sample products
- Various price ranges
- Different stock levels
- Mix of active/inactive products
- Include Persian product names and descriptions

// Test transactions
- Mix of PENDING, COMPLETED, FAILED statuses
- Different transaction codes
```

### 6. Database Utilities
- [ ] Create database backup script
- [ ] Create database reset script (for development)
- [ ] Document database schema in README

### 7. Environment Setup
- [ ] Document DATABASE_URL format
- [ ] Add database setup instructions to README
- [ ] Create troubleshooting guide

---

## Dependencies
- Prisma schema (✅ Done)
- PostgreSQL database (❌ Not set up)
- Prisma CLI (✅ Installed)

---

## Commands Reference
```bash
# Create and apply migration
npx prisma migrate dev --name migration_name

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Run seed
npx prisma db seed

# Reset database (dev only)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

---

## Testing Checklist
- [x] Can connect to database
- [x] All tables created successfully (users, products, transactions, transaction_items, invoices, promo_codes)
- [x] Foreign keys work correctly
- [x] Seed data loads without errors
- [x] Prisma Studio accessible
- [x] Can perform CRUD operations
- [x] Cascade deletes work properly
- [x] Unique constraints enforced

## Database Credentials
- **Database**: kitia
- **User**: kitia_user
- **Password**: kitia_password
- **Connection**: See `DATABASE_CREDENTIALS.md`

## Files Created
- ✅ `DATABASE_CREDENTIALS.md` - Database access credentials and commands
- ✅ `prisma/seed.ts` - Comprehensive seed script
- ✅ Updated `.env` file with correct DATABASE_URL
- ✅ Updated `package.json` with seed configuration
- ✅ Migration: `prisma/migrations/20251109140642_init/`

## Seed Data Included
- ✅ 1 Admin user (admin@kitia.com / Admin123!)
- ✅ 2 Test users (user1@test.com, user2@test.com / password123)
- ✅ 10 Sample products (laptops, phones, accessories)
- ✅ 2 Promo codes (1 active, 1 used)
- ✅ 2 Sample transactions (1 completed with invoice, 1 pending)

---

## Notes
- Use PostgreSQL 14 or higher
- Keep connection pooling in mind for production
- Consider using Supabase for free PostgreSQL hosting
- Never commit .env file with real database credentials
