/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', '@upstash/redis'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Webpack configuration for better builds
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only packages on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Ensure Socket.IO works properly in both development and production
    // Don't externalize socket.io-client - let it be bundled
    if (config.externals && !isServer) {
      // Remove any socket.io-client from externals if it exists
      config.externals = config.externals.filter(
        (external) => {
          if (typeof external === 'string') {
            return external !== 'socket.io-client';
          }
          return true;
        }
      );
    }
    
    return config;
  },

  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com', 'cdn.discordapp.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Enable TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
