# Development Workflow Guide

## 🎯 Setup: Local Dev → Supabase Production

### Current Configuration

**Local Development (`.env`):**
- Uses local PostgreSQL database
- Test changes safely without affecting production
- Full control over data and schema

**Production (Vercel + Supabase):**
- Environment variables set in Vercel dashboard
- Automatically deploys when pushing to `main` branch
- Uses Supabase for production database

---

## 📋 Daily Development Workflow

### 1. **Develop Locally**

```bash
# Start development server
npm run dev

# Your app runs at http://localhost:3000
# Using local PostgreSQL database
```

### 2. **Make Changes**

**For Code Changes Only (no database):**
```bash
# Edit your files
# Test locally
# When satisfied, commit and push
git add .
git commit -m "feat: add fancy login animation"
git push origin main
```

**For Database Schema Changes:**
```bash
# 1. Edit prisma/schema.prisma
# Add/modify models

# 2. Create migration
npx prisma migrate dev --name add_2fa_fields
# This updates your LOCAL database

# 3. Test thoroughly
npm run dev

# 4. When satisfied, sync to production (see step 3)
```

### 3. **Sync to Production**

```bash
# Run the sync script
./sync-to-production.sh

# This will:
# - Apply migrations to Supabase
# - Generate Prisma client
# - Prepare for deployment
```

### 4. **Deploy to Production**

```bash
# Commit your changes
git add .
git commit -m "feat: add 2FA support"

# Push to GitHub
git push origin main

# Vercel automatically deploys to production
# Visit https://kitia.vercel.app to verify
```

---

## 🔄 Example: Adding 2FA Feature

```bash
# 1. Create feature branch (optional but recommended)
git checkout -b feature/add-2fa

# 2. Update database schema
# Edit prisma/schema.prisma - add 2FA fields to User model

# 3. Create migration on LOCAL database
npx prisma migrate dev --name add_2fa_support

# 4. Update code
# Add 2FA logic, UI components, etc.

# 5. Test locally
npm run dev
# Test thoroughly at http://localhost:3000

# 6. When satisfied, sync to Supabase
./sync-to-production.sh

# 7. Commit and push
git add .
git commit -m "feat: add two-factor authentication"
git push origin feature/add-2fa

# 8. Merge to main
git checkout main
git merge feature/add-2fa
git push origin main

# 9. Vercel auto-deploys
# Monitor deployment at https://vercel.com
```

---

## 🗄️ Database Management

### Check Local Database

```bash
# View all tables
PGPASSWORD="kitia_password" psql -U kitia_user -d kitia -h localhost -c "\dt"

# Open Prisma Studio
npx prisma studio
# Opens at http://localhost:5555
```

### Check Production Database (Supabase)

```bash
# Option 1: Supabase Dashboard
# Visit https://supabase.com/dashboard/project/tanqgnztclrucfldxhuk

# Option 2: Using MCP (if available)
# Check via Claude Code with Supabase MCP tools

# Option 3: Direct SQL via psql
PGPASSWORD="rA0jhy9CLqLItSha" psql \
  -h aws-1-ap-southeast-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.tanqgnztclrucfldxhuk \
  -d postgres \
  -c "SELECT * FROM users;"
```

### Reset Local Database

```bash
# If you need to start fresh locally
npx prisma migrate reset

# Re-seed with test data
npx prisma db seed
```

---

## 🌿 Branch Strategy (Recommended)

### For Small Changes
```bash
# Work directly on main
git checkout main
# Make changes
git commit -m "fix: minor bug"
git push origin main
```

### For Features
```bash
# Create feature branch
git checkout -b feature/my-feature

# Develop and test
# When ready, merge to main
git checkout main
git merge feature/my-feature
git push origin main
```

---

## ⚠️ Important Notes

### Environment Variables

**Local (`.env`):**
- Automatically loaded by Next.js
- Points to local PostgreSQL
- Never committed to git

**Production (Vercel Dashboard):**
- Set manually in Vercel
- Points to Supabase
- Includes production secrets

### Migrations

**Local:**
```bash
# Create and apply migration locally
npx prisma migrate dev --name my_migration
```

**Production:**
```bash
# Apply migrations to Supabase
./sync-to-production.sh
```

### What Gets Deployed

When you push to GitHub:
1. Vercel pulls your code
2. Runs `npm run build`
   - Executes `prisma generate` (generates client)
   - Does NOT run migrations (already done via sync script)
3. Deploys to https://kitia.vercel.app

---

## 🛠️ Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Test production build
npm start                      # Run production build locally

# Database
npx prisma studio              # GUI for database
npx prisma migrate dev         # Create migration (local)
npx prisma migrate reset       # Reset local database
npx prisma db seed             # Seed local database
./sync-to-production.sh        # Sync to Supabase

# Git
git status                     # Check changes
git add .                      # Stage all changes
git commit -m "message"        # Commit changes
git push origin main           # Deploy to production

# Deployment
npx vercel                     # Manual deploy (if needed)
npx vercel ls                  # List deployments
```

---

## 🔍 Troubleshooting

### "Can't reach database server"
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Start if needed: `sudo systemctl start postgresql`

### "Migration already applied"
- Check migration status: `npx prisma migrate status`
- May need to: `npx prisma migrate resolve --applied [migration_name]`

### Production not updating after push
- Check Vercel deployment logs
- Verify environment variables in Vercel
- Check if build succeeded

### Local and production out of sync
- Run `./sync-to-production.sh` to apply pending migrations
- Check `npx prisma migrate status` on both environments

---

## 📚 Quick Reference

| Task | Command |
|------|---------|
| Start dev | `npm run dev` |
| Create migration | `npx prisma migrate dev --name description` |
| Sync to production | `./sync-to-production.sh` |
| Deploy | `git push origin main` |
| View local DB | `npx prisma studio` |
| Check deployments | Visit vercel.com |

---

## ✅ Checklist for New Features

- [ ] Create feature branch (optional)
- [ ] Make changes locally
- [ ] Update Prisma schema if needed
- [ ] Run `npx prisma migrate dev` for DB changes
- [ ] Test thoroughly locally
- [ ] Run `./sync-to-production.sh`
- [ ] Commit changes
- [ ] Push to GitHub
- [ ] Verify deployment on Vercel
- [ ] Test on production URL
