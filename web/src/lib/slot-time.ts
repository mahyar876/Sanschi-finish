import { gregorianToJalali, numFa } from '@/lib/jalali';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export const SLOT_START_GRACE_MS = 10 * 60 * 1000;

function toAsciiDigits(str: string): string {
  return String(str).replace(/[۰-۹]/g, (c) => String(FA_DIGITS.indexOf(c)));
}

const DEFAULT_SLOT_MINUTES = 90;

export type SlotHm = { h: number; m: number };

function parseHmPart(part: string): [number, number] | null {
  const m = toAsciiDigits(part)
    .trim()
    .match(/(\d{1,2})\s*:?\s*(\d{2})?/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2] || '0', 10)];
}

/** ساعت ۲۴ساعته ایران — مثلاً ۱۴:۰۰ (دو ظهر) */
export function formatClock24Fa(h: number, m: number): string {
  return `${numFa(String(h).padStart(2, '0'))}:${numFa(String(m).padStart(2, '0'))}`;
}

/** پارس بازهٔ ذخیره‌شده — «۰۶:۰۰–۰۷:۳۰» */
export function parseSlotRange(raw: string): { start: SlotHm; end: SlotHm } | null {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  const norm = toAsciiDigits(trimmed).replace(/[–—−]/g, '-');
  const chunks = norm
    .split('-')
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length >= 2) {
    const a = parseHmPart(chunks[0]);
    const b = parseHmPart(chunks[1]);
    if (a && b) return { start: { h: a[0], m: a[1] }, end: { h: b[0], m: b[1] } };
  }
  const start = parseHmPart(chunks[0] || norm);
  if (!start) return null;
  const totalMin = start[0] * 60 + start[1] + DEFAULT_SLOT_MINUTES;
  return {
    start: { h: start[0], m: start[1] },
    end: { h: Math.floor(totalMin / 60) % 24, m: totalMin % 60 },
  };
}

/** فرمت استاندارد DB — ارقام فارسی و خط تیرهٔ اصلی */
export function formatSlotRangeStorage(start: SlotHm, end: SlotHm): string {
  return `${formatClock24Fa(start.h, start.m)}–${formatClock24Fa(end.h, end.m)}`;
}

export function slotHmToInputValue({ h, m }: SlotHm): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function inputValueToSlotHm(v: string): SlotHm | null {
  const parts = String(v || '').trim().split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return { h, m };
}

export function addMinutesToHm({ h, m }: SlotHm, minutes: number): SlotHm {
  let total = h * 60 + m + minutes;
  if (total < 0) total = 0;
  total %= 24 * 60;
  return { h: Math.floor(total / 60), m: total % 60 };
}

/** نمایش یکسان سانس — ۲۴ساعته با ارقام فارسی: «۱۴:۰۰–۱۵:۳۰» */
export function displaySlotTime(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed || trimmed === '—') return trimmed || '—';
  const range = parseSlotRange(trimmed);
  if (range) return formatSlotRangeStorage(range.start, range.end);
  return trimmed;
}

function parseJalaliApiDate(dateStr: string): [number, number, number] {
  const ascii = toAsciiDigits(dateStr);
  const [jy, jm, jd] = ascii.split('/').map((x) => parseInt(x, 10));
  const g = jalaliToGregorianLocal(jy, jm, jd);
  return g;
}

function jalaliToGregorianLocal(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const salA = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = salA[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

export function slotTimeRange(dateStr: string, slotTimeStr: string): { start: Date; end: Date } {
  const [gy, gm, gd] = parseJalaliApiDate(dateStr);
  const norm = toAsciiDigits(slotTimeStr).replace(/[–—−]/g, '-');
  const chunks = norm.split('-').map((s) => s.trim());
  const parseHm = (part: string): [number, number] => {
    const m = part.match(/(\d{1,2})\s*:?\s*(\d{2})?/);
    if (!m) return [0, 0];
    return [parseInt(m[1], 10), parseInt(m[2] || '0', 10)];
  };
  const [sh, sm] = parseHm(chunks[0] || '');
  const [eh, em] = parseHm(chunks[1] || chunks[0] || '');
  const start = new Date(gy, gm - 1, gd, sh, sm, 0, 0);
  const end = new Date(gy, gm - 1, gd, eh, em, 0, 0);
  if (end <= start) end.setHours(end.getHours() + 1);
  return { start, end };
}

export function dayStartFromJalaliApi(dateStr: string): Date {
  const [gy, gm, gd] = parseJalaliApiDate(dateStr);
  return new Date(gy, gm - 1, gd, 0, 0, 0, 0);
}

/** بیش از ۱۰ دقیقه از شروع سانس گذشته → دیگر در لیست رزرو نیاید */
export function isSlotPastForBooking(
  dateStr: string,
  slotTimeStr: string,
  now: Date = new Date(),
): boolean {
  const dayStart = dayStartFromJalaliApi(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dayStart.getTime() < todayStart.getTime()) return true;
  if (dayStart.getTime() > todayStart.getTime()) return false;
  const { start } = slotTimeRange(dateStr, slotTimeStr);
  return now.getTime() > start.getTime() + SLOT_START_GRACE_MS;
}

export function hoursUntilSlotStart(
  dateStr: string,
  slotTimeStr: string,
  now: Date = new Date(),
): number {
  const { start } = slotTimeRange(dateStr, slotTimeStr);
  return (start.getTime() - now.getTime()) / (3600 * 1000);
}

export function jalaliApiDateFromDate(d: Date): string {
  const j = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${j[0]}/${String(j[1]).padStart(2, '0')}/${String(j[2]).padStart(2, '0')}`;
}

export function startOfLocalDayFrom(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function addLocalDays(day: Date, days: number): Date {
  const out = startOfLocalDayFrom(day);
  out.setDate(out.getDate() + days);
  return out;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** حداقل یک سانس هنوز قابل رزرو (شروع + ۱۰ دقیقه grace نگذشته) */
export function dayHasRemainingBookableSlots(
  day: Date,
  slotTimes: string[],
  now: Date = new Date(),
): boolean {
  if (!slotTimes.length) return true;
  const dateStr = jalaliApiDateFromDate(day);
  return slotTimes.some((time) => !isSlotPastForBooking(dateStr, time, now));
}

/** امروز اگر همه سانس‌ها گذشته‌اند → فردا */
export function defaultReserveLocalDay(
  slotTimes: string[],
  now: Date = new Date(),
): Date {
  const today = startOfLocalDayFrom(now);
  if (dayHasRemainingBookableSlots(today, slotTimes, now)) return today;
  return addLocalDays(today, 1);
}
