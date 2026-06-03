const imageRemoteHostname = process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTNAME;

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
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.cache = false;
    }

    // Fix for module resolution issues in Next.js 14
    // Prevents "Cannot read properties of undefined (reading 'call')" webpack error
    // when Node.js modules are referenced in client code import chains
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  images: {
    remotePatterns: imageRemoteHostname
      ? [
          {
            protocol: 'https',
            hostname: imageRemoteHostname,
            pathname: '/**',
          },
        ]
      : [],
    // Disable Next.js image optimization when an external CDN handles images.
    unoptimized: true,
  },
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
