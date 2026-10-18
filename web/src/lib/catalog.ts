import { VENUES, type Venue, type VenueCategory } from '@/data/venues';
import { apiFetch } from '@/lib/fetch-api';
import { cachedRequest } from '@/lib/request-cache';
import { loadDemoPitches } from '@/lib/demo-pitches';
import { isDemoFrontend } from '@/lib/demo';
import { DEFAULT_SLOT_TIMES, type Pitch } from '@/lib/pitch-types';
import { resolveCatalogImage } from '@/lib/venue-images';
import { inferTehranZone, type TehranZone } from '@/lib/tehran-zones';
import { normalizeAmenityIds, type PitchAmenityId } from '@/lib/pitch-amenities';
import { enrichPitchCatalogFields } from '@/lib/pitch-catalog-enrichment';
import { matchPitchNameToCoords } from '@/lib/pitch-venue-coords';

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
  womenBookingAllowed?: boolean | null;
  amenities: PitchAmenityId[];
  rulesText?: string;
  maxCapacity?: number | null;
  /** بازه‌های زمانی سانس (برای فیلتر ساعت) */
  slotTimes: string[];
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

function venueForCatalog(p: Pitch): Venue | undefined {
  const demo = venueForPitch(p);
  if (demo) return demo;
  const name = (p.name || '').trim();
  if (!name) return undefined;
  const exact = VENUES.find((v) => v.name.trim() === name);
  if (exact) return exact;
  const coords = matchPitchNameToCoords(name);
  if (!coords) return undefined;
  return VENUES.find((v) => v.lat === coords.lat && v.lng === coords.lng);
}

export function pitchToCatalog(p: Pitch, avail?: number): CatalogVenue {
  const venue = venueForCatalog(p);
  const coordsFallback = matchPitchNameToCoords(p.name || '');
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

  const enriched = enrichPitchCatalogFields({
    name: displayName,
    address: displayAddress,
    type: p.type === 'grass' ? 'grass' : 'futsal',
    size: p.size,
    tags: p.tags?.length ? p.tags : venue?.tags || [],
    amenities: p.amenities,
    maxCapacity: p.maxCapacity,
    womenBookingAllowed: p.womenBookingAllowed,
    rulesText: p.rulesText,
  });

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
    lat: p.lat ?? venue?.lat ?? coordsFallback?.lat,
    lng: p.lng ?? venue?.lng ?? coordsFallback?.lng,
    womenBookingAllowed: enriched.womenBookingAllowed,
    amenities: enriched.amenities,
    rulesText: enriched.rulesText,
    maxCapacity: enriched.maxCapacity,
    slotTimes: (() => {
      const fromApi = (p as Pitch & { slotTimes?: string[] }).slotTimes?.filter(Boolean);
      if (fromApi?.length) return fromApi;
      const fromSlots = (p.slots || []).map((s) => s.time).filter(Boolean);
      if (fromSlots.length) return fromSlots;
      return [...DEFAULT_SLOT_TIMES];
    })(),
  };
}

/** demo-1 + venue=futsal-aria-tehran → pitchId واقعی از API وقتی کاتالوگ live است */
export function resolveCatalogPitchId(
  items: CatalogVenue[],
  opts: { pitchId?: string | null; venueSlug?: string | null },
): string {
  const { pitchId, venueSlug } = opts;
  if (venueSlug) {
    const bySlug = items.find((i) => i.slug === venueSlug);
    if (bySlug && !bySlug.pitchId.startsWith('demo-')) return bySlug.pitchId;
    const venueDef = VENUES.find((v) => v.slug === venueSlug);
    if (venueDef) {
      const byName = items.find(
        (i) => !i.pitchId.startsWith('demo-') && i.name.trim() === venueDef.name.trim(),
      );
      if (byName) return byName.pitchId;
    }
  }
  if (pitchId && !pitchId.startsWith('demo-')) {
    const byId = items.find((i) => i.pitchId === pitchId);
    if (byId) return byId.pitchId;
  }
  if (pitchId?.startsWith('demo-')) {
    const localId = pitchId.slice('demo-'.length);
    const venue = VENUES.find((v) => v.id === localId);
    if (venue) {
      const mapped = items.find((i) => i.slug === venue.slug && !i.pitchId.startsWith('demo-'));
      if (mapped) return mapped.pitchId;
    }
    const fallback = items.find((i) => i.pitchId === pitchId);
    if (fallback) return fallback.pitchId;
  }
  const firstLive = items.find((i) => !i.pitchId.startsWith('demo-'));
  return firstLive?.pitchId ?? items[0]?.pitchId ?? '';
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

export type CatalogFetchResult = {
  items: CatalogVenue[];
  /** API وصل است و زمین از DB آمده */
  live: boolean;
  apiReachable: boolean;
  pitchesFromDb: boolean;
};

export async function fetchCatalog(): Promise<CatalogFetchResult> {
  if (isDemoFrontend()) {
    const pitches = loadDemoPitches().filter((p) => p.isActive);
    return {
      items: pitches.map((p) => pitchToCatalog(p)),
      live: false,
      apiReachable: false,
      pitchesFromDb: false,
    };
  }
  return cachedRequest('catalog:live', 30_000, async () => {
    try {
      const data = await apiFetch<{
        success: boolean;
        pitches: (Pitch & { avail?: number })[];
      }>('/pitches?sort=avail&catalog=1');
      if (data.success && data.pitches.length) {
        return {
          items: data.pitches.map((p) => pitchToCatalog(p, p.avail)),
          live: true,
          apiReachable: true,
          pitchesFromDb: true,
        } satisfies CatalogFetchResult;
      }
      if (data.success) {
        return {
          items: catalogFromVenues(),
          live: false,
          apiReachable: true,
          pitchesFromDb: false,
        } satisfies CatalogFetchResult;
      }
    } catch {
      /* fallback */
    }
    return {
      items: catalogFromVenues(),
      live: false,
      apiReachable: false,
      pitchesFromDb: false,
    } satisfies CatalogFetchResult;
  });
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
