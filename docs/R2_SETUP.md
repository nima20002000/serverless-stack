# Cloudflare R2 Storage Setup Guide

This guide walks you through setting up Cloudflare R2 for product image/video storage in Kitia.

## Why R2?

- **10GB free storage** (vs 1GB for Supabase)
- **Zero egress fees** - unlimited bandwidth at no cost
- **Fast CDN delivery** - global edge network
- **S3-compatible API** - easy migration path
- **Cost-effective at scale** - ~$1.50/month for 100GB vs $25+ for alternatives

---

## Step 1: Create R2 Bucket

### 1.1 Sign up for Cloudflare

1. Go to https://dash.cloudflare.com/sign-up
2. Create a free account
3. Verify your email

### 1.2 Create R2 Bucket

1. In Cloudflare Dashboard, go to **R2 Object Storage**
2. Click **Create bucket**
3. Bucket name: `kitia-products` (or your preferred name)
4. Location: **Automatic** (recommended)
5. Click **Create bucket**

---

## Step 2: Get API Credentials

### 2.1 Create API Token

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Token name: `kitia-upload`
4. Permissions: **Object Read & Write**
5. Bucket: Select `kitia-products` (or your bucket name)
6. Click **Create API token**

### 2.2 Save Credentials

You'll see three values - **COPY THEM NOW** (won't be shown again):

```
Access Key ID: abc123def456...
Secret Access Key: xyz789uvw456...
```

Also note your **Account ID** from the R2 dashboard URL:
```
https://dash.cloudflare.com/{account-id}/r2/overview
```

---

## Step 3: Configure Public Access

To make uploaded images publicly accessible:

### Option A: R2.dev Subdomain (Quick & Easy)

1. In your bucket settings, go to **Settings** tab
2. Find **Public access** section
3. Click **Allow Access**
4. Enable **R2.dev subdomain**
5. Copy the URL: `https://pub-{hash}.r2.dev`

Use this as your `R2_PUBLIC_URL` (see Step 4).

### Option B: Custom Domain (Recommended for Production)

1. In bucket settings, go to **Settings** tab
2. Click **Connect Domain**
3. Enter your domain: `cdn.kitia.ir` (or subdomain of your choice)
4. Follow DNS instructions to add CNAME record
5. Wait for DNS propagation (5-15 minutes)

Use your custom domain as `R2_PUBLIC_URL`: `https://cdn.kitia.ir`

---

## Step 4: Configure Environment Variables

### 4.1 Update `.env`

Add these variables to your `.env` file (NOT `.env.example`):

```bash
# Cloudflare R2 Storage
R2_ACCOUNT_ID="dd63dacc73e373d4f298797c0400a419"
R2_ACCESS_KEY_ID="your-access-key-id-here"
R2_SECRET_ACCESS_KEY="your-secret-access-key-here"
R2_BUCKET_NAME="kitia-products"
R2_PUBLIC_URL="https://pub-{hash}.r2.dev"  # or your custom domain
```

**Replace:**
- `your-access-key-id-here` with your Access Key ID from Step 2.2
- `your-secret-access-key-here` with your Secret Access Key from Step 2.2
- `https://pub-{hash}.r2.dev` with your actual R2.dev URL or custom domain from Step 3

### 4.2 Verify Configuration

```bash
# Check if variables are set
grep R2_ .env
```

---

## Step 5: Test Upload

### 5.1 Start Development Server

```bash
npm run dev
```

### 5.2 Test Upload

1. Log in as admin: http://localhost:3000/login
2. Go to Products → New Product
3. Upload a test image
4. Check the console logs - you should see:
   ```
   R2 Storage adapter initialized
   File uploaded to R2
   ```
5. Verify the image URL in the response starts with your `R2_PUBLIC_URL`

### 5.3 Verify in Cloudflare Dashboard

1. Go to Cloudflare Dashboard → R2
2. Click on `kitia-products` bucket
3. You should see your uploaded file under `products/images/`

---

## Step 6: Migrate Existing Files (Optional)

If you have existing files in `public/uploads/products/`, migrate them to R2:

### 6.1 Dry Run (Preview)

```bash
npx ts-node scripts/migrate-to-r2.ts --dry-run
```

This shows what would be migrated without making changes.

### 6.2 Run Migration

```bash
npx ts-node scripts/migrate-to-r2.ts
```

The script will:
1. ✓ Upload all local files to R2
2. ✓ Update database URLs to point to R2
3. ✓ Show summary of migrated files

### 6.3 Verify Migration

1. Check your products pages - images should load from R2
2. Inspect image URLs in browser DevTools - should use R2_PUBLIC_URL
3. Verify all files in Cloudflare R2 dashboard

### 6.4 Clean Up Local Files

**⚠️ Only after confirming everything works:**

```bash
rm -rf public/uploads/products/*
```

---

## Step 7: Update .gitignore (Important!)

Ensure local uploads are not committed to git:

```bash
# Already added to .gitignore
public/uploads/
```

---

## Troubleshooting

### Issue: "R2 credentials not configured"

**Solution:**
- Check `.env` file has all R2_* variables
- Restart dev server after adding variables
- Verify no typos in variable names

### Issue: "Upload succeeds but image not visible"

**Solution:**
- Check bucket has public access enabled (Step 3)
- Verify `R2_PUBLIC_URL` is correct in `.env`
- Try accessing the R2 URL directly in browser
- Check CORS settings in R2 bucket (should allow GET)

### Issue: "Access Denied" error

**Solution:**
- Verify API token has **Object Read & Write** permissions
- Check API token is scoped to correct bucket
- Regenerate API token if needed

### Issue: Images work locally but not in production (Vercel)

**Solution:**
- Add R2_* environment variables to Vercel project settings
- Redeploy after adding variables
- Check Vercel logs for errors

---

## Cost Estimates

### Free Tier (Always Free)
- 10 GB storage
- Unlimited egress (bandwidth)
- 10 million Class A operations/month (writes)
- 100 million Class B operations/month (reads)

**For typical e-commerce:**
- 500 product images (~2MB each) = 1GB = **FREE**
- 10,000 page views/day = ~300K reads/month = **FREE**
- **Total cost: $0/month** ✅

### Paid Tier (If you exceed free tier)
- $0.015/GB storage/month
- $0.00 egress (still free!)
- $4.50/million Class A operations
- $0.36/million Class B operations

**Example (1000 products, 100K visitors/month):**
- 2GB storage = $0.03
- Bandwidth = $0.00 (free!)
- Operations = ~$1.00
- **Total: ~$1.03/month** 💰

---

## Production Checklist

Before deploying to production:

- [ ] R2 bucket created
- [ ] Public access enabled (R2.dev or custom domain)
- [ ] Custom domain DNS configured (if using)
- [ ] API credentials generated
- [ ] Environment variables set in Vercel/production
- [ ] Test upload from admin panel works
- [ ] Existing files migrated (if applicable)
- [ ] Local uploads directory cleaned up
- [ ] Images loading correctly on frontend
- [ ] CORS configured (if using from different domain)

---

## Next Steps

1. **Set up custom domain** for better branding (cdn.kitia.ir)
2. **Enable image optimization** via Cloudflare Transform API
3. **Monitor usage** in Cloudflare dashboard
4. **Set up alerts** for quota limits

---

## Support

- Cloudflare R2 Docs: https://developers.cloudflare.com/r2/
- Cloudflare Community: https://community.cloudflare.com/
- Kitia Issues: https://github.com/your-repo/issues
