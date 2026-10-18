import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sanschii.ir';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '',
    '/gallery',
    '/reserve',
    '/about',
    '/for-owners',
    '/terms',
    '/privacy',
    '/login',
    '/penalty',
  ].map((path) => ({
    url: `${siteUrl}${path || '/'}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8,
  }));
}
