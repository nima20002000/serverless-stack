/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      enabled: true,
      bodySizeLimit: '60mb', // Allow larger uploads for video files
    },
    optimizeCss: true, // Enable CSS optimization
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.kitia.ir',
        pathname: '/**', // Allow all paths (products/*, media-library/*, cdn-cgi/image/*)
      },
    ],
    // Disable Next.js image optimization - Cloudflare CDN already optimizes
    // This avoids IPv6 timeout issues when fetching from cdn.kitia.ir
    unoptimized: true,
  },
  // Optimize font loading
  optimizeFonts: true,
  // Enable SWC minification for smaller bundles
  swcMinify: true,
  // Reduce chunk size for better caching
  productionBrowserSourceMaps: false,
  // Configure aggressive caching for static assets
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
