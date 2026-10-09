import type { VenueCategory } from '@/data/venues';

/** تصاویر پیش‌فرض بر اساس نوع مجموعه (فایل‌های SVG در public/venues) */
export const DEFAULT_CATEGORY_IMAGE: Record<VenueCategory, string> = {
  futsal: '/venues/venue-futsal-aria.jpg',
  grass: '/venues/venue-grass-mellat.jpg',
  volleyball: '/venues/venue-volleyball-setare.jpg',
  multi: '/venues/venue-multi-omid.jpg',
};

function isValidDataImage(s: string): boolean {
  if (!s.startsWith('data:image/')) return false;
  const comma = s.indexOf(',');
  if (comma === -1) return false;
  const payload = s.slice(comma + 1).trim();
  return payload.length >= 64;
}

export function isUsablePitchImage(src?: string | null): src is string {
  if (!src || !src.trim()) return false;
  const s = src.trim();
  if (s.startsWith('data:image/')) return isValidDataImage(s);
  if (s.startsWith('/')) return true;
  if (s.startsWith('http://') || s.startsWith('https://')) return true;
  return false;
}

export function resolveCatalogImage(
  pitchImage: string | undefined,
  venueImage: string | undefined,
  category: VenueCategory,
): string {
  if (isUsablePitchImage(pitchImage)) return pitchImage.trim();
  if (isUsablePitchImage(venueImage)) return venueImage.trim();
  return DEFAULT_CATEGORY_IMAGE[category];
}

export function pitchImageNeedsUnoptimized(src: string): boolean {
  return src.startsWith('data:') || src.includes('.svg');
}

export function fallbackImageForCategory(category?: VenueCategory): string {
  return DEFAULT_CATEGORY_IMAGE[category ?? 'futsal'];
}
