import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sanschii.ir';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/owner',
        '/player',
        '/profile',
        '/finance',
        '/settlement',
        '/payment',
        '/payment/test',
        '/mobile-preview',
        '/responsive-preview',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
