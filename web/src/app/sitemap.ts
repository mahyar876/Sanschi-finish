import type { MetadataRoute } from 'next';
import { VENUES } from '@/data/venues';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sanschi.ir';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '',
    '/gallery',
    '/reserve',
    '/about',
    '/for-owners',
    '/terms',
    '/privacy',
    '/login',
    '/penalty',
  ].map(
    (path) => ({
      url: `${siteUrl}${path || '/'}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.8,
    }),
  );

  const venues = VENUES.map((v) => ({
    url: `${siteUrl}/gallery/${v.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...venues];
}
