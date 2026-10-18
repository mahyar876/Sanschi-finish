import type { VenueCategory } from '@/data/venues';
import { fetchCatalog, type CatalogVenue } from '@/lib/catalog';
import { DEFAULT_CATEGORY_IMAGE } from '@/lib/venue-images';
import { tehranZoneLabel } from '@/lib/tehran-zones';
import { loadDemoPitches } from '@/lib/demo-pitches';
import { isDemoFrontend } from '@/lib/demo';
import { apiFetch } from '@/lib/fetch-api';
import {
  applyLastMinuteToSlot,
  resolveLastMinuteSettings,
} from '@/lib/last-minute-pricing';
import { DEFAULT_SLOT_TIMES } from '@/lib/pitch-types';
import { fetchPitch } from '@/lib/pitch-service';
import { isSlotPastForBooking, jalaliApiDateFromDate } from '@/lib/slot-time';

export type FlashDeal = {
  pitchId: string;
  pitchName: string;
  slug: string;
  city: string;
  image: string;
  category?: VenueCategory;
  date: string;
  slotIndex: number;
  time: string;
  sitePrice: number;
  originalSitePrice: number;
  discountPercent: number;
  urgency: '30m' | '60m';
  minutesUntil: number;
};

function demoFlashDeals(catalog: CatalogVenue[]): FlashDeal[] {
  const date = jalaliApiDateFromDate(new Date());
  const now = new Date();
  const pitches = loadDemoPitches().filter((p) => p.isActive);
  const deals: FlashDeal[] = [];

  for (const p of pitches) {
    const venue = catalog.find((v) => v.pitchId === p._id);
    const commission = p.commissionAmount ?? 45_000;
    p.slots.forEach((s, slotIndex) => {
      if (s.taken) return;
      if (isSlotPastForBooking(date, s.time, now)) return;
      const baseSite = s.price + commission;
      const lm = applyLastMinuteToSlot(baseSite, date, s.time, p, now);
      if (!lm.flashDeal || !lm.originalSitePrice || !lm.urgency) return;
      deals.push({
        pitchId: p._id,
        pitchName: p.name,
        slug: venue?.slug || p._id,
        city: venue ? tehranZoneLabel(venue.zone) : 'تهران',
        image: venue?.image || p.image || DEFAULT_CATEGORY_IMAGE.futsal,
        category: venue?.category,
        date,
        slotIndex,
        time: s.time,
        sitePrice: lm.sitePrice,
        originalSitePrice: lm.originalSitePrice,
        discountPercent: lm.discountPercent,
        urgency: lm.urgency,
        minutesUntil: lm.minutesUntil ?? 0,
      });
    });
  }

  return sortFlashDeals(deals);
}

/** وقتی الان سانس واقعی لحظه‌آخر نیست — برای نمایش صفحهٔ اصلی */
function buildHomeFlashDealsFallback(
  catalog: CatalogVenue[],
  limit: number,
): FlashDeal[] {
  const date = jalaliApiDateFromDate(new Date());
  const now = new Date();
  const pitches = loadDemoPitches().filter((p) => p.isActive);
  const out: FlashDeal[] = [];

  for (const p of pitches) {
    if (out.length >= limit) break;
    const venue = catalog.find((v) => v.pitchId === p._id);
    const commission = p.commissionAmount ?? 45_000;
    let slotIndex = -1;
    let slot: (typeof p.slots)[number] | undefined;
    for (let i = 0; i < p.slots.length; i++) {
      const s = p.slots[i];
      if (s.taken) continue;
      if (isSlotPastForBooking(date, s.time, now)) continue;
      slot = s;
      slotIndex = i;
      break;
    }
    if (!slot || slotIndex < 0) continue;

    const baseSite = slot.price + commission;
    const settings = resolveLastMinuteSettings(p);
    const discountPercent = Math.min(settings.discount60, settings.maxPct);
    const sitePrice = Math.round(baseSite * (1 - discountPercent / 100));

    out.push({
      pitchId: p._id,
      pitchName: p.name,
      slug: venue?.slug || p._id,
      city: venue ? tehranZoneLabel(venue.zone) : 'تهران',
      image: venue?.image || p.image || DEFAULT_CATEGORY_IMAGE.futsal,
      category: venue?.category,
      date,
      slotIndex,
      time: slot.time,
      sitePrice,
      originalSitePrice: baseSite,
      discountPercent,
      urgency: '60m',
      minutesUntil: 45,
    });
  }

  for (const venue of catalog) {
    if (out.length >= limit) break;
    if (out.some((d) => d.pitchId === venue.pitchId)) continue;
    const discountPercent = 15;
    const base = venue.priceFrom;
    out.push({
      pitchId: venue.pitchId,
      pitchName: venue.name,
      slug: venue.slug,
      city: tehranZoneLabel(venue.zone),
      image: venue.image,
      category: venue.category,
      date,
      slotIndex: 0,
      time: 'امروز',
      sitePrice: Math.round(base * (1 - discountPercent / 100)),
      originalSitePrice: base,
      discountPercent,
      urgency: '60m',
      minutesUntil: 45,
    });
  }

  return out.slice(0, limit);
}

function sortFlashDeals(deals: FlashDeal[]): FlashDeal[] {
  return [...deals].sort((a, b) => a.minutesUntil - b.minutesUntil);
}

async function enrichDealsFromCatalog(
  deals: Array<{
    pitchId: string;
    pitchName: string;
    date: string;
    slotIndex: number;
    time: string;
    sitePrice: number;
    originalSitePrice: number;
    discountPercent: number;
    urgency: '30m' | '60m';
    minutesUntil: number;
  }>,
  catalog: CatalogVenue[],
): Promise<FlashDeal[]> {
  return deals.map((d) => {
    const venue = catalog.find((v) => v.pitchId === d.pitchId);
    return {
      ...d,
      slug: venue?.slug || d.pitchId,
      city: venue ? tehranZoneLabel(venue.zone) : 'تهران',
      image: venue?.image || DEFAULT_CATEGORY_IMAGE.futsal,
      category: venue?.category,
    };
  });
}

export async function fetchFlashDeals(limit = 12): Promise<FlashDeal[]> {
  if (isDemoFrontend()) {
    const { items: catalog } = await fetchCatalog();
    return demoFlashDeals(catalog).slice(0, limit);
  }

  try {
    const data = await apiFetch<{
      success: boolean;
      deals: Array<{
        pitchId: string;
        pitchName: string;
        date: string;
        slotIndex: number;
        time: string;
        sitePrice: number;
        originalSitePrice: number;
        discountPercent: number;
        urgency: '30m' | '60m';
        minutesUntil: number;
      }>;
    }>(`/pitches/flash-deals?limit=${limit}`);

    if (!data.success || !data.deals.length) {
      const { items: catalog } = await fetchCatalog();
      return demoFlashDeals(catalog).slice(0, limit);
    }

    const { items: catalog } = await fetchCatalog();
    return await enrichDealsFromCatalog(data.deals, catalog);
  } catch {
    const { items: catalog } = await fetchCatalog();
    return demoFlashDeals(catalog).slice(0, limit);
  }
}

/** صفحهٔ اصلی — یک بار کاتالوگ + flash-deals (بدون درخواست تکراری) */
export async function fetchHomeFlashDeals(limit = 4): Promise<FlashDeal[]> {
  const catalogPromise = fetchCatalog();
  if (isDemoFrontend()) {
    const { items: catalog } = await catalogPromise;
    return demoFlashDeals(catalog).slice(0, limit);
  }
  try {
    const data = await apiFetch<{
      success: boolean;
      deals: Parameters<typeof enrichDealsFromCatalog>[0];
    }>(`/pitches/flash-deals?limit=${limit}`);
    if (data.success && data.deals.length) {
      const { items: catalog } = await catalogPromise;
      const enriched = await enrichDealsFromCatalog(data.deals, catalog);
      return enriched.slice(0, limit);
    }
  } catch {
    /* fallback */
  }
  const { items: catalog } = await catalogPromise;
  return buildHomeFlashDealsFallback(catalog, limit);
}

/** سانس‌های دمو/API با زمان واقعی و تخفیف لحظه‌آخر */
export async function buildDemoSlotsForPitch(
  pitchId: string,
  date: Date,
): Promise<
  Array<{
    slotIndex: number;
    time: string;
    sitePrice: number;
    originalSitePrice?: number;
    discountPercent?: number;
    flashDeal?: boolean;
    urgency?: string;
    taken: boolean;
    bookable: boolean;
    displayStatus: string;
  }>
> {
  const dateStr = jalaliApiDateFromDate(date);
  const now = new Date();
  let pitch;
  try {
    pitch = await fetchPitch(pitchId);
  } catch {
    pitch = null;
  }
  const commission = pitch?.commissionAmount ?? 45_000;
  const times = pitch?.slots?.length ? pitch.slots : DEFAULT_SLOT_TIMES.map((time, i) => ({
    time,
    price: i >= 7 ? 580_000 : 520_000,
    taken: false,
  }));

  return times.map((s, slotIndex) => {
    const price = 'price' in s ? s.price : 520_000;
    const taken = 'taken' in s ? Boolean(s.taken) : false;
    const past = isSlotPastForBooking(dateStr, s.time, now);
    const baseSite = price + commission;
    let sitePrice = baseSite;
    let originalSitePrice: number | undefined;
    let discountPercent = 0;
    let flashDeal = false;
    let urgency: string | undefined;
    if (!past && !taken) {
      const lm = applyLastMinuteToSlot(baseSite, dateStr, s.time, pitch ?? {}, now);
      sitePrice = lm.sitePrice;
      originalSitePrice = lm.originalSitePrice;
      discountPercent = lm.discountPercent;
      flashDeal = lm.flashDeal;
      urgency = lm.urgency;
    }
    const bookable = !taken && !past;
    return {
      slotIndex,
      time: s.time,
      sitePrice,
      originalSitePrice,
      discountPercent,
      flashDeal,
      urgency,
      taken: taken || past,
      bookable,
      displayStatus: past ? 'past' : taken ? 'booked' : 'free',
    };
  });
}
