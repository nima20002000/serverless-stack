# Optional Cloudflare R2 Storage

The app can store product images and videos in a Cloudflare R2-compatible bucket. This integration is optional, but media upload features require an object storage provider with S3-compatible credentials.

## Variables

```env
R2_ACCOUNT_ID="replace-with-cloudflare-account-id"
R2_ACCESS_KEY_ID="replace-with-r2-access-key-id"
R2_SECRET_ACCESS_KEY="replace-with-r2-secret-access-key"
R2_BUCKET_NAME="commerce-media"
R2_PUBLIC_URL="https://media.example.com"
NEXT_PUBLIC_IMAGE_REMOTE_HOSTNAME="media.example.com"
```

## Setup

1. Create a bucket in Cloudflare R2.
2. Create an R2 API token with bucket read/write access.
3. Configure a public domain or other public delivery URL for media.
4. Add the variables above to `.env`, Vercel preview, and Vercel production as needed. Set `NEXT_PUBLIC_IMAGE_REMOTE_HOSTNAME` to the hostname portion of `R2_PUBLIC_URL`.
5. Upload a test image from the admin UI and confirm the public product page can load it.

## Validation

Run the bucket check with your own environment loaded:

```bash
node scripts/check-r2-bucket.mjs products/images/
```

## Notes

- Keep access keys server-side only.
- Use a separate bucket for test or preview environments.
- Do not commit real R2 account IDs, access keys, bucket names used for private projects, or custom domains tied to private infrastructure.
- If Cloudflare Image Resizing is enabled, see `docs/CLOUDFLARE_IMAGE_OPTIMIZATION.md`.
