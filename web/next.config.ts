import type { NextConfig } from 'next';

const apiOrigin =
  process.env.API_PROXY_TARGET || 'http://localhost:5000';

const nextConfig: NextConfig = {
  /** Dev / preview: proxy /api to Express. Production (Vercel): set NEXT_PUBLIC_API_URL. */
  async rewrites() {
    if (process.env.VERCEL && !process.env.API_PROXY_TARGET) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
