/** Minimal Jalali helpers — full port from legacy script.js as pages migrate. */

export function numFa(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const JALALI_WEEKDAYS = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه',
];

export function toJalaliString(input: Date | string): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return String(input);
  const j = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const weekday = JALALI_WEEKDAYS[(d.getDay() + 1) % 7];
  return `${weekday} ${numFa(j[2])} ${JALALI_MONTHS[j[1] - 1]} ${numFa(j[0])}`;
}

/** فرمت API: 1403/03/24 */
export function toJalaliApiDate(input: Date): string {
  const j = gregorianToJalali(input.getFullYear(), input.getMonth() + 1, input.getDate());
  return `${j[0]}/${String(j[1]).padStart(2, '0')}/${String(j[2]).padStart(2, '0')}`;
}

export function toJalaliParts(input: Date): { y: number; m: number; d: number } {
  const j = gregorianToJalali(input.getFullYear(), input.getMonth() + 1, input.getDate());
  return { y: j[0], m: j[1], d: j[2] };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
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
    0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = salA[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

export function daysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const g1 = jalaliToGregorian(jy, 12, 29);
  const g2 = jalaliToGregorian(jy + 1, 1, 1);
  const d1 = new Date(g1[0], g1[1] - 1, g1[2]);
  const d2 = new Date(g2[0], g2[1] - 1, g2[2]);
  return d2.getTime() - d1.getTime() === 86400000 ? 29 : 30;
}

export function dateFromJalali(y: number, m: number, d: number): Date {
  const g = jalaliToGregorian(y, m, d);
  const out = new Date(g[0], g[1] - 1, g[2]);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** ابتدای روز در timezone مرورگر/Node محلی */
export function startOfLocalDay(input: Date = new Date()): Date {
  return new Date(input.getFullYear(), input.getMonth(), input.getDate(), 0, 0, 0, 0);
}

export function todayLocalDay(): Date {
  return startOfLocalDay(new Date());
}
