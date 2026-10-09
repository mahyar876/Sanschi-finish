import { VENUES, type Venue, type VenueCategory } from '@/data/venues';
import { apiFetch } from '@/lib/fetch-api';
import { loadDemoPitches } from '@/lib/demo-pitches';
import { isDemoFrontend } from '@/lib/demo';
import type { Pitch } from '@/lib/pitch-types';
import { resolveCatalogImage } from '@/lib/venue-images';
import { inferTehranZone, type TehranZone } from '@/lib/tehran-zones';

export type CatalogVenue = {
  pitchId: string;
  slug: string;
  name: string;
  category: VenueCategory;
  size: 5 | 7 | 11;
  priceFrom: number;
  availSlots: number;
  address: string;
  city: string;
  zone: TehranZone;
  tags: string[];
  image: string;
  seoDescription: string;
  featured?: boolean;
  desc?: string;
  lat?: number;
  lng?: number;
};

function slugify(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
    .slice(0, 48)
    .toLowerCase();
}

function venueCategoryFromPitch(p: Pitch, venue?: Venue): VenueCategory {
  if (venue) {
    if (venue.category === 'volleyball' || venue.category === 'multi') {
      return venue.category;
    }
    return p.type === 'grass' ? 'grass' : 'futsal';
  }
  return p.type === 'grass' ? 'grass' : 'futsal';
}

function pitchTypeMatchesCategory(p: Pitch, category: VenueCategory): boolean {
  if (category === 'grass') return p.type === 'grass';
  return p.type === 'futsal';
}

function demoVenueId(pitchId: string): string | undefined {
  if (!pitchId.startsWith('demo-')) return undefined;
  return pitchId.slice('demo-'.length);
}

/** فقط برای pitchهای demo-{id} — بدون حدس از روی نام (جلوگیری از قاطی شدن «ستاره شرق» و …) */
function venueForPitch(p: Pitch): Venue | undefined {
  const vid = demoVenueId(p._id);
  if (!vid) return undefined;
  return VENUES.find((v) => v.id === vid);
}

export function pitchToCatalog(p: Pitch, avail?: number): CatalogVenue {
  const venue = venueForPitch(p);
  const slug =
    venue?.slug ||
    `${slugify(p.name)}-${p._id.replace(/[^a-zA-Z0-9]/g, '').slice(-6)}`;
  const displayName = p.name || venue?.name || 'مجموعه';
  const displayAddress =
    p.address?.trim() ||
    (venue ? `${venue.address}، ${venue.city}` : '');
  const slotFree =
    avail ??
    (typeof (p as Pitch & { avail?: number }).avail === 'number'
      ? (p as Pitch & { avail?: number }).avail!
      : (p.slots || []).filter((s) => !s.taken).length);
  const city = venue?.city || 'تهران';
  const addrForZone = displayAddress || venue?.address || p.address || '';
  const zone =
    venue?.zone ?? inferTehranZone(addrForZone, p.lng ?? venue?.lng);

  const category = venueCategoryFromPitch(p, venue);
  const pitchImage =
    venue && !pitchTypeMatchesCategory(p, category) ? undefined : p.image;

  return {
    pitchId: p._id,
    slug,
    name: displayName,
    category,
    size: p.size,
    priceFrom: p.price,
    availSlots: slotFree,
    address: displayAddress.includes('،')
      ? displayAddress.split('،')[0]?.trim() || displayAddress
      : displayAddress || venue?.address || '',
    city,
    zone,
    tags: p.tags?.length ? p.tags : venue?.tags || [],
    image: resolveCatalogImage(pitchImage, venue?.image, category),
    seoDescription: p.desc || venue?.seoDescription || displayName,
    featured: venue?.featured,
    desc: p.desc || venue?.seoDescription,
    lat: p.lat ?? venue?.lat,
    lng: p.lng ?? venue?.lng,
  };
}

export function catalogFromVenues(): CatalogVenue[] {
  return VENUES.map((v) =>
    pitchToCatalog(
      {
        _id: `demo-${v.id}`,
        name: v.name,
        type: v.category === 'grass' ? 'grass' : 'futsal',
        size: v.size,
        price: v.priceFrom,
        address: `${v.address}، ${v.city}`,
        desc: v.seoDescription,
        tags: v.tags,
        image: v.image,
        isActive: true,
        commissionAmount: 0,
        slots: [],
        lat: v.lat,
        lng: v.lng,
      },
      v.availSlots,
    ),
  );
}

export async function fetchCatalog(): Promise<{ items: CatalogVenue[]; live: boolean }> {
  if (isDemoFrontend()) {
    const pitches = loadDemoPitches().filter((p) => p.isActive);
    return { items: pitches.map((p) => pitchToCatalog(p)), live: false };
  }
  try {
    const data = await apiFetch<{
      success: boolean;
      pitches: (Pitch & { avail?: number })[];
    }>('/pitches?sort=avail');
    if (data.success && data.pitches.length) {
      return {
        items: data.pitches.map((p) => pitchToCatalog(p, p.avail)),
        live: true,
      };
    }
  } catch {
    /* fallback */
  }
  return { items: catalogFromVenues(), live: false };
}

export function findCatalogBySlug(items: CatalogVenue[], slug: string): CatalogVenue | undefined {
  return items.find((v) => v.slug === slug);
}

/** اگر slug قدیمی/تکراری بود، با pitchId قطعی پیدا می‌شود */
export function findCatalogItem(
  items: CatalogVenue[],
  slug: string,
  pitchId?: string | null,
): CatalogVenue | undefined {
  if (pitchId) {
    const byId = items.find((v) => v.pitchId === pitchId);
    if (byId) return byId;
  }
  return findCatalogBySlug(items, slug);
}

export function findCatalogByPitchId(items: CatalogVenue[], pitchId: string): CatalogVenue | undefined {
  return items.find((v) => v.pitchId === pitchId);
}
