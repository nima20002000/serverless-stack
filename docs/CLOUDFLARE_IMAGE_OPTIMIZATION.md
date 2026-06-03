# Optional Cloudflare Image Resizing

Cloudflare Image Resizing can transform product media at the edge when `R2_PUBLIC_URL` is served through a Cloudflare-proxied hostname.

## Enable

1. Configure Cloudflare R2 or another public media origin.
2. Point `R2_PUBLIC_URL` to a public hostname such as `https://media.example.com`.
3. Enable Image Resizing in the Cloudflare dashboard for that zone.
4. Set:

   ```env
   NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED="true"
   ```

Set the variable to `"false"` to serve raw media URLs without transformation.

Use this only when the media hostname is proxied through Cloudflare. Other storage providers must set the variable to `"false"`.

## Validation

- Confirm a raw media URL returns HTTP `200`.
- Confirm transformed URLs under `/cdn-cgi/image/...` return HTTP `200`.
- Check product grids, product detail pages, and admin media previews in local and preview environments.
