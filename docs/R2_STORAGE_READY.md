# ✅ Cloudflare R2 Storage - Ready to Use

## Setup Complete

All R2 storage infrastructure is configured and ready for production use.

### What's Configured:

**Bucket**: `kitia-products` (WEUR - West Europe)
**Public URL**: https://pub-8d4e28d9e22840fb873c6e29bbab9b55.r2.dev
**S3 Endpoint**: https://dd63dacc73e373d4f298797c0400a419.r2.cloudflarestorage.com

**API Credentials**:
- Account Token (Read/Write/List): ✅ Configured in `.env`
- User Token (Read-Only): ✅ Available for frontend if needed

**Environment**: ✅ `.env` file updated with all R2 variables
**Build**: ✅ Verified successful
**Git**: ✅ Committed to feature/new-feature branch

---

## Usage

### Upload Files (Admin)

```typescript
import { storage } from '@/lib/storage';

// Upload
const result = await storage.upload({
  file: fileBuffer,
  path: 'products/images/example.jpg',
  contentType: 'image/jpeg',
  isPublic: true
});

// result.url = "https://pub-xxx.r2.dev/products/images/example.jpg"
```

### Test Upload

```bash
npm run dev
# Login as admin → Products → New Product → Upload image
# Image will be stored in R2 and URL will start with:
# https://pub-8d4e28d9e22840fb873c6e29bbab9b55.r2.dev/
```

---

## Migration (If Needed)

If you have existing local product images:

```bash
# Preview migration
npx ts-node scripts/migrate-to-r2.ts --dry-run

# Run migration
npx ts-node scripts/migrate-to-r2.ts

# After verification, clean up local files
rm -rf public/uploads/products/*
```

---

## Production Deployment

Add these to Vercel environment variables:

```
R2_ACCOUNT_ID=dd63dacc73e373d4f298797c0400a419
R2_ACCESS_KEY_ID=afa45d7d809fce2bbc99fdfc4a41375e
R2_SECRET_ACCESS_KEY=9b8b7d4ceea1412a9c2183a9654c7db931510c4904ab355bedcedc1a37bce4de
R2_BUCKET_NAME=kitia-products
R2_PUBLIC_URL=https://pub-8d4e28d9e22840fb873c6e29bbab9b55.r2.dev
```

---

## Benefits

✅ **10GB free storage** (vs 1GB alternatives)
✅ **Unlimited bandwidth** (zero egress fees)
✅ **Global CDN** delivery
✅ **Production-ready** architecture
✅ **Future-proof** (can switch providers)

**Cost**: $0/month for typical e-commerce usage

---

## Documentation

- Full setup guide: `/docs/R2_SETUP.md`
- Cleanup guide: `/docs/STORAGE_MIGRATION_CLEANUP.md`
- All credentials: `CREDENTIALS.md`
- Architecture: `CLAUDE.md` (File Storage Architecture section)

---

## API Tokens

### Account Token (Admin - Use This)
- **Permissions**: Read, Write, List
- **Use for**: Application uploads (admin panel)
- **Configured in**: `.env` file ✅

### User Token (Read-Only)
- **Permissions**: Read, List only
- **Use for**: Public frontend access (if needed)
- **Available in**: `CREDENTIALS.md`

---

## Next Steps

1. **Test upload**: Start dev server and upload an image
2. **Verify**: Check image URL uses R2.dev domain
3. **Migrate existing files** (if applicable)
4. **Deploy to production**: Add env vars to Vercel
5. **Optional**: Configure custom domain (cdn.kitia.ir)

Everything is ready! Just test the upload functionality. 🚀
