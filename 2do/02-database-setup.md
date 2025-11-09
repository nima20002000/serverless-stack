# Database Setup Tasks

## Status: Partially Complete
**Priority**: Critical
**Estimated Complexity**: Low

---

## Overview
Set up PostgreSQL database, run migrations, and create seed data for development.

---

## Tasks

### 1. Database Installation & Configuration
- [ ] Install PostgreSQL locally or use cloud provider (Supabase/Neon/Railway)
- [ ] Create database named 'kitia'
- [ ] Update DATABASE_URL in .env file
- [ ] Test database connection

### 2. Prisma Migrations
- [ ] Run initial migration: `npx prisma migrate dev --name init`
- [ ] Verify all tables are created correctly
- [ ] Check indexes and constraints
- [ ] Test foreign key relationships

### 3. Prisma Studio
- [ ] Test Prisma Studio access: `npx prisma studio`
- [ ] Verify all models are visible
- [ ] Test basic CRUD operations through Studio

### 4. Seed Data
- [ ] Create seed script (`prisma/seed.ts`)
- [ ] Add seed script to package.json
- [ ] Create admin user (email: admin@kitia.com)
- [ ] Create sample products (5-10 items)
- [ ] Create test user accounts
- [ ] Add sample transactions
- [ ] Generate test promo codes

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
- [ ] Can connect to database
- [ ] All tables created successfully
- [ ] Foreign keys work correctly
- [ ] Seed data loads without errors
- [ ] Prisma Studio accessible
- [ ] Can perform CRUD operations
- [ ] Cascade deletes work properly
- [ ] Unique constraints enforced

---

## Notes
- Use PostgreSQL 14 or higher
- Keep connection pooling in mind for production
- Consider using Supabase for free PostgreSQL hosting
- Never commit .env file with real database credentials
