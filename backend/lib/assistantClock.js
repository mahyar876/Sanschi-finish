const { gregorianToJalali, jalaliToGregorian } = require('./jalaliTime');

function jalaliMonthLength(jy, jm) {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  const [gy, gm, gd] = jalaliToGregorian(jy, 12, 30);
  const back = gregorianToJalali(gy, gm, gd);
  return back[1] === 12 && back[2] === 30 ? 30 : 29;
}

function parseJalaliApiParts(jalaliStr) {
  const [jy, jm, jd] = String(jalaliStr || '')
    .split('/')
    .map((x) => parseInt(x, 10));
  return { jy, jm, jd };
}

function formatJalaliDate(jy, jm, jd) {
  return `${jy}/${pad2(jm)}/${pad2(jd)}`;
}

function addJalaliMonths(jy, jm, delta) {
  let nm = jm + delta;
  let ny = jy;
  while (nm > 12) {
    nm -= 12;
    ny += 1;
  }
  while (nm < 1) {
    nm += 12;
    ny -= 1;
  }
  return { jy: ny, jm: nm };
}

const TEHRAN_TZ = 'Asia/Tehran';

function tehranDateParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TEHRAN_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t) => parseInt(parts.find((p) => p.type === t)?.value || '0', 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** تاریخ جلالی «امروز» بر اساس تقویم تهران */
function todayJalaliTehran(now = new Date()) {
  const { year, month, day } = tehranDateParts(now);
  const [jy, jm, jd] = gregorianToJalali(year, month, day);
  return `${jy}/${pad2(jm)}/${pad2(jd)}`;
}

/** Date محلی نیمه‌شب امروز در تقویم تهران (برای جمع/تفریق روز) */
function tehranCalendarAnchor(now = new Date()) {
  const { year, month, day } = tehranDateParts(now);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function addCalendarDaysTehran(baseNow, days) {
  const anchor = tehranCalendarAnchor(baseNow);
  anchor.setDate(anchor.getDate() + days);
  const [jy, jm, jd] = gregorianToJalali(
    anchor.getFullYear(),
    anchor.getMonth() + 1,
    anchor.getDate(),
  );
  return `${jy}/${pad2(jm)}/${pad2(jd)}`;
}

function jalaliToDateCompare(jalaliStr) {
  const [jy, jm, jd] = jalaliStr.split('/').map((x) => parseInt(x, 10));
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd, 12, 0, 0);
}

function compareJalali(a, b) {
  const da = jalaliToDateCompare(a);
  const db = jalaliToDateCompare(b);
  return da.getTime() - db.getTime();
}

function tehranNowMinutes(now = new Date()) {
  const { hour, minute } = tehranDateParts(now);
  return hour * 60 + minute;
}

module.exports = {
  TEHRAN_TZ,
  tehranDateParts,
  todayJalaliTehran,
  tehranCalendarAnchor,
  addCalendarDaysTehran,
  compareJalali,
  tehranNowMinutes,
  jalaliMonthLength,
  parseJalaliApiParts,
  formatJalaliDate,
  addJalaliMonths,
};
