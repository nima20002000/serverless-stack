/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      enabled: true,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.kitia.ir',
        pathname: '/products/**',
      },
    ],
    // Disable Next.js image optimization - Cloudflare CDN already optimizes
    // This avoids IPv6 timeout issues when fetching from cdn.kitia.ir
    unoptimized: true,
  },
};

module.exports = nextConfig;
