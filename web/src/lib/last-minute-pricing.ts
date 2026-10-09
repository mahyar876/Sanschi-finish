import type { Pitch } from '@/lib/pitch-types';
import { hoursUntilSlotStart } from '@/lib/slot-time';

export const LAST_MINUTE_PLATFORM_DEFAULTS = {
  discountPercent60Min: 15,
  discountPercent30Min: 25,
  maxDiscountPercent: 40,
};

export type LastMinutePricingResult = {
  sitePrice: number;
  originalSitePrice?: number;
  discountPercent: number;
  flashDeal: boolean;
  urgency?: '30m' | '60m';
  minutesUntil?: number;
};

export function resolveLastMinuteSettings(pitch: Pick<
  Pitch,
  | 'lastMinuteEnabled'
  | 'lastMinuteDiscount60'
  | 'lastMinuteDiscount30'
  | 'lastMinuteMaxPct'
>) {
  const d = LAST_MINUTE_PLATFORM_DEFAULTS;
  return {
    enabled: pitch.lastMinuteEnabled !== false,
    discount60: pitch.lastMinuteDiscount60 ?? d.discountPercent60Min,
    discount30: pitch.lastMinuteDiscount30 ?? d.discountPercent30Min,
    maxPct: pitch.lastMinuteMaxPct ?? d.maxDiscountPercent,
  };
}

export function applyLastMinuteToSlot(
  sitePrice: number,
  dateStr: string,
  slotTimeStr: string,
  pitch: Pick<
    Pitch,
    | 'lastMinuteEnabled'
    | 'lastMinuteDiscount60'
    | 'lastMinuteDiscount30'
    | 'lastMinuteMaxPct'
  >,
  now: Date = new Date(),
): LastMinutePricingResult {
  const settings = resolveLastMinuteSettings(pitch);
  if (!settings.enabled) {
    return { sitePrice, discountPercent: 0, flashDeal: false };
  }

  const hoursUntil = hoursUntilSlotStart(dateStr, slotTimeStr, now);
  if (hoursUntil <= 0 || hoursUntil > 1) {
    return { sitePrice, discountPercent: 0, flashDeal: false };
  }

  let discountPercent = 0;
  let urgency: '30m' | '60m' | undefined;
  if (hoursUntil <= 0.5) {
    discountPercent = settings.discount30;
    urgency = '30m';
  } else {
    discountPercent = settings.discount60;
    urgency = '60m';
  }

  discountPercent = Math.min(Math.max(0, discountPercent), settings.maxPct);
  if (discountPercent <= 0) {
    return { sitePrice, discountPercent: 0, flashDeal: false };
  }

  return {
    sitePrice: Math.round(sitePrice * (1 - discountPercent / 100)),
    originalSitePrice: sitePrice,
    discountPercent,
    flashDeal: true,
    urgency,
    minutesUntil: Math.round(hoursUntil * 60),
  };
}
