/**
 * Get the application base URL from environment variables
 * This handles reverse proxy scenarios where req.url might contain internal URLs
 * (e.g., http://localhost:3001 instead of https://kitia.ir)
 */
export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  );
}

/**
 * Create a redirect URL using the proper app base URL
 * Use this instead of `new URL(path, req.url)` in API routes behind reverse proxy
 */
export function createRedirectUrl(path: string): string {
  const baseUrl = getAppBaseUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Remove trailing slash from baseUrl if present
  const normalizedBaseUrl = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return `${normalizedBaseUrl}${normalizedPath}`;
}
