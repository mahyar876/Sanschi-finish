/**
 * smoke test برای منطق فیلتر گالری (ساعت سانس، ظرفیت)
 * node scripts/gallery-filters.test.js
 */

function parseSlotStartHour(timeStr) {
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const norm = String(timeStr)
    .replace(/[۰-۹]/g, (c) => String(FA.indexOf(c)))
    .replace(/[–—−]/g, '-');
  const start = norm.split('-')[0]?.trim() || '';
  const m = start.match(/(\d{1,2})\s*:?\s*(\d{2})?/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

function slotTimeInPeriod(timeStr, period) {
  const h = parseSlotStartHour(timeStr);
  if (h == null) return false;
  if (period === 'morning') return h < 12;
  if (period === 'afternoon') return h >= 12 && h < 17;
  return h >= 17;
}

function catalogMatchesSlotPeriods(slotTimes, periods) {
  if (!periods.length) return true;
  const times = slotTimes || [];
  if (!times.length) return false;
  return periods.some((p) => times.some((t) => slotTimeInPeriod(t, p)));
}

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  }
}

ok(parseSlotStartHour('۱۸:۰۰–۱۹:۳۰') === 18, 'parse fa digits evening');
ok(slotTimeInPeriod('۰۹:۰۰–۱۰:۳۰', 'morning'), 'morning slot');
ok(slotTimeInPeriod('۱۵:۰۰–۱۶:۳۰', 'afternoon'), 'afternoon slot');
ok(
  catalogMatchesSlotPeriods(['۰۶:۰۰–۰۷:۳۰', '۱۸:۰۰–۱۹:۳۰'], ['evening']),
  'catalog evening match',
);
ok(
  !catalogMatchesSlotPeriods(['۰۶:۰۰–۰۷:۳۰'], ['evening']),
  'catalog evening miss',
);

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('gallery-filters: ok');
