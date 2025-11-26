# Vercel Build Troubleshooting

## Current Status

All API routes and dynamic pages have `export const dynamic = 'force-dynamic'` which should prevent static generation errors.

**Local build:** ✅ **Passes**
**Vercel build:** May still show errors due to caching

## If Vercel Build Fails

### 1. Clear Vercel Build Cache

In your Vercel dashboard:
1. Go to Settings → General
2. Scroll down to "Build & Development Settings"
3. Click "Clear Build Cache"
4. Trigger a new deployment

### 2. Verify Environment Variables

Make sure these are set in Vercel:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Auth secret
- `NEXTAUTH_URL` - Your app URL
- `ZARINPAL_MERCHANT_ID` (if using payment)

### 3. Check Build Logs

If the error persists, check the full build logs in Vercel for:
- Database connection errors
- Missing environment variables
- Import/module resolution issues

### 4. Force Fresh Deployment

```bash
# Make a trivial change and push
echo "" >> README.md
git add README.md
git commit -m "chore: trigger fresh vercel deployment"
git push
```

## Verification

Run locally before pushing:
```bash
npm run verify:routes  # Check all routes have dynamic export
npm run build          # Verify build passes
```

## Technical Details

### Why "Failed to collect page data" happens

This error occurs when Next.js tries to statically pre-render a page/route at build time but the page:
1. Needs database connection
2. Uses dynamic params
3. Relies on authentication
4. Accesses request-specific data

### The Solution

```typescript
export const dynamic = 'force-dynamic';
```

This tells Next.js to skip static generation and always render at request time.

### Why it works locally but not on Vercel

- Local builds may use cached data or skip optimization steps
- Vercel's production builds are stricter about static optimization
- Vercel attempts full pre-rendering of all routes at build time
- Environment differences (Node version, dependencies, etc.)

## Current Configuration

- **29 API routes** - All have `dynamic = 'force-dynamic'`
- **1 Server Component page** - `/products/[id]` has dynamic export
- **Automatic verification** - `npm run build` checks before building

## Contact

If issues persist after clearing cache and environment variables are correct, there may be a Vercel-specific configuration issue. Check:
- `vercel.json` (if it exists)
- `.vercelignore` configuration
- Vercel project settings
