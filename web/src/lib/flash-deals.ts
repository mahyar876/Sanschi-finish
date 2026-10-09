import { fetchCatalog, type CatalogVenue } from '@/lib/catalog';
import { DEFAULT_CATEGORY_IMAGE } from '@/lib/venue-images';
import { tehranZoneLabel } from '@/lib/tehran-zones';
import { loadDemoPitches } from '@/lib/demo-pitches';
import { isDemoFrontend } from '@/lib/demo';
import { apiFetch } from '@/lib/fetch-api';
import { applyLastMinuteToSlot } from '@/lib/last-minute-pricing';
import { DEFAULT_SLOT_TIMES } from '@/lib/pitch-types';
import { fetchPitch } from '@/lib/pitch-service';
import { isSlotPastForBooking, jalaliApiDateFromDate } from '@/lib/slot-time';

export type FlashDeal = {
  pitchId: string;
  pitchName: string;
  slug: string;
  city: string;
  image: string;
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

function sortFlashDeals(deals: FlashDeal[]): FlashDeal[] {
  return [...deals].sort((a, b) => {
    const ua = a.urgency === '30m' ? 0 : 1;
    const ub = b.urgency === '30m' ? 0 : 1;
    if (ua !== ub) return ua - ub;
    return a.minutesUntil - b.minutesUntil;
  });
}

export async function fetchFlashDeals(limit = 12): Promise<FlashDeal[]> {
  const { items: catalog } = await fetchCatalog();

  if (isDemoFrontend()) {
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

    if (!data.success) return demoFlashDeals(catalog).slice(0, limit);

    const enriched: FlashDeal[] = [];
    for (const d of data.deals) {
      const venue = catalog.find((v) => v.pitchId === d.pitchId);
      enriched.push({
        ...d,
        slug: venue?.slug || d.pitchId,
        city: venue ? tehranZoneLabel(venue.zone) : 'تهران',
        image: venue?.image || DEFAULT_CATEGORY_IMAGE.futsal,
      });
    }
    return enriched;
  } catch {
    return demoFlashDeals(catalog).slice(0, limit);
  }
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
