import { pitchSizeLabel } from '@/lib/format';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function toAsciiDigits(str: string): string {
  return String(str).replace(/[۰-۹]/g, (c) => String(FA_DIGITS.indexOf(c)));
}

/** ساعت شروع سانس از رشتهٔ «۱۸:۰۰–۱۹:۳۰» */
export function parseSlotStartHour(timeStr: string): number | null {
  const norm = toAsciiDigits(timeStr).replace(/[–—−]/g, '-');
  const start = norm.split('-')[0]?.trim() || '';
  const m = start.match(/(\d{1,2})\s*:?\s*(\d{2})?/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

export type SlotPeriodFilter = 'morning' | 'afternoon' | 'evening';

export const SLOT_PERIOD_OPTIONS: { id: SlotPeriodFilter; label: string }[] = [
  { id: 'morning', label: 'صبح (تا ۱۲)' },
  { id: 'afternoon', label: 'بعدازظهر (۱۲–۱۷)' },
  { id: 'evening', label: 'شب (۱۷ به بعد)' },
];

export function slotTimeInPeriod(timeStr: string, period: SlotPeriodFilter): boolean {
  const h = parseSlotStartHour(timeStr);
  if (h == null) return false;
  if (period === 'morning') return h < 12;
  if (period === 'afternoon') return h >= 12 && h < 17;
  return h >= 17;
}

export function catalogMatchesSlotPeriods(
  slotTimes: string[] | undefined,
  periods: SlotPeriodFilter[],
): boolean {
  if (!periods.length) return true;
  const times = slotTimes || [];
  if (!times.length) return false;
  return periods.some((p) => times.some((t) => slotTimeInPeriod(t, p)));
}

export type PitchSizeFilter = 'all' | 5 | 7 | 11;

export const PITCH_SIZE_FILTER_OPTIONS: { id: PitchSizeFilter; label: string }[] = [
  { id: 'all', label: 'همه ابعاد' },
  { id: 5, label: pitchSizeLabel(5) },
  { id: 7, label: pitchSizeLabel(7) },
  { id: 11, label: pitchSizeLabel(11) },
];

export const MIN_CAPACITY_OPTIONS = [
  { value: 0, label: 'هر ظرفیتی' },
  { value: 10, label: 'حداقل ۱۰ نفر' },
  { value: 14, label: 'حداقل ۱۴ نفر' },
  { value: 18, label: 'حداقل ۱۸ نفر' },
] as const;

export function catalogMatchesMinCapacity(
  maxCapacity: number | null | undefined,
  minRequired: number,
): boolean {
  if (minRequired <= 0) return true;
  if (maxCapacity == null || !Number.isFinite(maxCapacity)) return false;
  return maxCapacity >= minRequired;
}
