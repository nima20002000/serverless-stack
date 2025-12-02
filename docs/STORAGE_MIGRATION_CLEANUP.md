# Storage Migration Cleanup Guide

This document explains how to safely remove the old local filesystem upload code after migrating to Cloudflare R2.

## Overview

The codebase has been migrated from local filesystem storage to Cloudflare R2. This guide helps you clean up the old code safely.

---

## What Changed

### New Storage System (R2)
- ✅ Storage abstraction layer: `/src/lib/storage/`
- ✅ R2 adapter: `/src/lib/storage/adapters/r2.ts`
- ✅ Updated upload API: `/src/app/api/upload/product-media/route.ts`
- ✅ Migration script: `/scripts/migrate-to-r2.ts`

### Old System (To be removed)
- ❌ `/src/lib/upload.ts` - Old local filesystem upload functions
- ❌ `/public/uploads/` - Local files directory (after migration)

---

## Safe Cleanup Process

### Phase 1: Verify New System Works

**Before removing ANY code**, verify:

1. **R2 credentials configured:**
   ```bash
   grep R2_ .env
   ```
   Should show all R2_* variables set.

2. **Test upload works:**
   - Start dev server: `npm run dev`
   - Login as admin
   - Go to Products → New Product
   - Upload a test image
   - Verify image displays correctly
   - Check browser DevTools → image URL should start with `R2_PUBLIC_URL`

3. **Check existing products:**
   - Visit product pages
   - All images should load (either from R2 or local, depending on migration status)

### Phase 2: Migrate Existing Files (If Applicable)

**Only if you have existing products with local files:**

1. **Dry run to preview:**
   ```bash
   npx ts-node scripts/migrate-to-r2.ts --dry-run
   ```

2. **Run actual migration:**
   ```bash
   npx ts-node scripts/migrate-to-r2.ts
   ```

3. **Verify migration:**
   - Check all product images load
   - Inspect URLs - should use R2_PUBLIC_URL
   - Verify files in Cloudflare R2 dashboard

### Phase 3: Remove Old Code

**Only after verifying steps 1-2 work perfectly:**

#### 3.1 Remove Old Upload Library

```bash
# Delete old upload utility
rm src/lib/upload.ts
```

This file is now replaced by `/src/lib/storage/`.

#### 3.2 Remove Local Upload Files

**⚠️ CRITICAL: Only do this after confirming migration succeeded!**

```bash
# Remove local uploads (files now in R2)
rm -rf public/uploads/products/*
```

Note: The directory structure remains (`.gitignore`d), but files are deleted.

#### 3.3 Verify Build Still Works

```bash
npm run build
```

Should complete without errors.

#### 3.4 Test Production Build

```bash
npm start
```

Navigate to product pages and verify images load from R2.

---

## Rollback Plan (If Something Goes Wrong)

If you encounter issues after cleanup:

### Option 1: Restore Old Code from Git

```bash
# Restore old upload.ts file
git checkout HEAD -- src/lib/upload.ts

# Restore old API route
git checkout HEAD -- src/app/api/upload/product-media/route.ts

# Rebuild
npm run build
```

### Option 2: Revert to Previous Commit

```bash
# View recent commits
git log --oneline -10

# Revert to before migration
git revert <commit-hash>
```

### Option 3: Keep Both Systems (Temporary)

If you're unsure, you can keep both systems running:
- New uploads go to R2 (current system)
- Old URLs still work (local files remain)
- Migrate gradually over time

---

## What NOT to Delete

**Keep these files - they are part of the NEW system:**

- ✅ `/src/lib/storage/` - Storage abstraction (needed!)
- ✅ `/scripts/migrate-to-r2.ts` - Useful for future migrations
- ✅ `/docs/R2_SETUP.md` - Documentation
- ✅ `CLAUDE.md` - Updated with R2 info

---

## After Cleanup Checklist

- [ ] Old `/src/lib/upload.ts` removed
- [ ] Local `/public/uploads/products/*` files deleted
- [ ] `npm run build` succeeds
- [ ] Test upload creates file in R2
- [ ] All product images load from R2
- [ ] No console errors in browser
- [ ] Production deployment tested (if applicable)

---

## Production Deployment Notes

When deploying to Vercel/production after cleanup:

1. **Ensure R2 environment variables are set** in production:
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Add all `R2_*` variables

2. **Deploy:**
   ```bash
   git push
   ```
   Or trigger manual deployment in Vercel dashboard.

3. **Verify production:**
   - Upload test image in production admin panel
   - Check image loads on public product page
   - Monitor Vercel logs for errors

4. **Monitor R2 usage:**
   - Cloudflare Dashboard → R2 → Check storage/bandwidth usage
   - Should see files appearing in bucket

---

## Cost Monitoring

After cleanup, monitor your R2 usage:

- **Storage:** Check bucket size in Cloudflare dashboard
- **Bandwidth:** R2 is free egress, no cost concern
- **Operations:** Monitor API calls (should be well within free tier)

**Free tier limits:**
- 10GB storage
- Unlimited bandwidth
- 10M writes/month
- 100M reads/month

For typical e-commerce: **$0/month** ✅

---

## Need Help?

If you encounter issues during cleanup:

1. **Check logs:**
   ```bash
   npm run dev
   # Upload test file and check terminal logs
   ```

2. **Verify R2 credentials:**
   ```bash
   # Test R2 connection
   npx ts-node -e "import { storage } from './src/lib/storage'; storage.getPublicUrl('test');"
   ```

3. **Review documentation:**
   - `/docs/R2_SETUP.md` - Setup guide
   - `CLAUDE.md` - Architecture overview

4. **Rollback if needed** - Use rollback plan above

---

## Summary

**Safe cleanup order:**
1. ✅ Verify new R2 system works
2. ✅ Migrate existing files
3. ✅ Test thoroughly
4. ✅ Remove old code
5. ✅ Verify build succeeds
6. ✅ Deploy to production

**Don't rush this!** Better to keep old code for a few days while you verify everything works than to delete prematurely and cause issues.
