/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker production builds
  // This creates a minimal production bundle in .next/standalone
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' } : {}),

  // Enable source maps in production for better debugging and Lighthouse score
  productionBrowserSourceMaps: true,

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    serverComponentsExternalPackages: ['@prisma/client'],
    instrumentationHook: true,
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 300,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/api/download/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/download/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/api/download/**',
      },
    ],
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Polyfill fallbacks for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        // Allow iframe embedding for download API (PDF viewer)
        source: '/api/download/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/((?!api/download).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Redirects for better SEO
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/workspaces',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
