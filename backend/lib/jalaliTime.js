/** تبدیل تاریخ جلالی API (1403/03/24) و سانس فارسی به Date محلی */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function toAsciiDigits(str) {
  return String(str).replace(/[۰-۹]/g, (c) => String(FA_DIGITS.indexOf(c)));
}

/** همان الگوریتم فرانت (script.js / web jalali.ts) — برای تطابق API و isSlotPast */
function jalaliToGregorian(jy, jm, jd) {
  jy = parseInt(jy, 10);
  jm = parseInt(jm, 10);
  jd = parseInt(jd, 10);
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

function gregorianToJalali(gy, gm, gd) {
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
  let jm;
  let jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

function todayJalaliApiDate(now = new Date()) {
  const [jy, jm, jd] = gregorianToJalali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

function parseJalaliApiDate(dateStr) {
  const ascii = toAsciiDigits(dateStr);
  const [jy, jm, jd] = ascii.split('/').map((x) => parseInt(x, 10));
  return jalaliToGregorian(jy, jm, jd);
}

/** "۱۸:۰۰–۱۹:۳۰" → { start: Date, end: Date } */
function slotTimeRange(dateStr, slotTimeStr, now = new Date()) {
  const [gy, gm, gd] = parseJalaliApiDate(dateStr);
  const norm = toAsciiDigits(slotTimeStr).replace(/[–—−]/g, '-');
  const chunks = norm.split('-').map((s) => s.trim());
  const parseHm = (part) => {
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

function hoursUntilSlotStart(dateStr, slotTimeStr, now = new Date()) {
  const { start } = slotTimeRange(dateStr, slotTimeStr, now);
  return (start.getTime() - now.getTime()) / (3600 * 1000);
}

function dayStartFromJalali(dateStr) {
  const [gy, gm, gd] = parseJalaliApiDate(dateStr);
  return new Date(gy, gm - 1, gd, 0, 0, 0, 0);
}

const { SLOT_START_GRACE_MS } = require('./bookingConstants');

/** سانس برای رزرو گذشته است: روز قبل، یا امروز بیش از ۱۰ دقیقه از شروع سانس گذشته */
function isSlotPast(dateStr, slotTimeStr, now = new Date()) {
  const dayStart = dayStartFromJalali(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dayStart.getTime() < todayStart.getTime()) return true;
  if (dayStart.getTime() > todayStart.getTime()) return false;
  const { start } = slotTimeRange(dateStr, slotTimeStr, now);
  return now.getTime() > start.getTime() + SLOT_START_GRACE_MS;
}

module.exports = {
  slotTimeRange,
  hoursUntilSlotStart,
  dayStartFromJalali,
  isSlotPast,
  toAsciiDigits,
  todayJalaliApiDate,
};
