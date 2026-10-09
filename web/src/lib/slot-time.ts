import { gregorianToJalali } from '@/lib/jalali';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export const SLOT_START_GRACE_MS = 10 * 60 * 1000;

function toAsciiDigits(str: string): string {
  return String(str).replace(/[۰-۹]/g, (c) => String(FA_DIGITS.indexOf(c)));
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
