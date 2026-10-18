const { toAsciiDigits } = require('./jalaliTime');
const {
  todayJalaliTehran,
  addCalendarDaysTehran,
  tehranCalendarAnchor,
  parseJalaliApiParts,
  formatJalaliDate,
  addJalaliMonths,
  jalaliMonthLength,
} = require('./assistantClock');
const { emptyAssistantIntent } = require('./assistantIntent');
const { parseDistrictFromText } = require('./assistantDistricts');

const PAS_FARDA = '§pasfarda§';

const WEEKDAY_FA = {
  شنبه: 6,
  saturday: 6,
  یکشنبه: 0,
  yekshanbe: 0,
  sunday: 0,
  دوشنبه: 1,
  monday: 1,
  سهشنبه: 2,
  tuesday: 2,
  چهارشنبه: 3,
  wednesday: 3,
  پنجشنبه: 4,
  thursday: 4,
  پنجشنب: 4,
  جمعه: 5,
  friday: 5,
};

const FA_NUM_WORDS = {
  یک: 1,
  يك: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  ش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
};

const ZONE_KEYWORDS = [
  { zone: 'north', words: ['شمال', 'north'] },
  { zone: 'south', words: ['جنوب', 'south'] },
  { zone: 'east', words: ['شرق', 'east'] },
  { zone: 'west', words: ['غرب', 'west'] },
  { zone: 'center', words: ['مرکز', 'وسط', 'center'] },
];

function normalizeText(raw) {
  return toAsciiDigits(String(raw || ''))
    .toLowerCase()
    .replace(/\u200c/g, '')
    .replace(/می\s*خوام|میخوام|می\s*خام|می\s*خواهم/g, 'میخوام')
    .replace(/واسه|واس|برا\b|برای\s*اینکه/g, 'برای')
    .replace(/\btill\b/g, 'تا')
    .replace(/\bیه\b|\bی\s/g, 'یک ')
    .replace(/پیدا\s*کن|پیداش\s*کن/g, 'میخوام')
    .replace(/سه\s*شنبه/g, 'سهشنبه')
    .replace(/چهار\s*شنبه/g, 'چهارشنبه')
    .replace(/پنج\s*شنبه|پنج\s*شنب/g, 'پنجشنبه')
    .replace(/دو\s*شنبه/g, 'دوشنبه')
    .replace(/یک\s*شنبه/g, 'یکشنبه')
    .replace(/پس\s*فردا|پسفردا/g, PAS_FARDA)
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRelativeDays(t, now) {
  let m = t.match(/(\d+)\s*روز\s*دیگه/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 60) {
      return { date: addCalendarDaysTehran(now, n), label: `${n} روز دیگه` };
    }
  }
  m = t.match(/(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)\s*روز\s*دیگه/);
  if (m) {
    const n = FA_NUM_WORDS[m[1]] || 0;
    if (n >= 1) {
      return { date: addCalendarDaysTehran(now, n), label: `${m[1]} روز دیگه` };
    }
  }
  return null;
}

function pickWeekdayFromText(t) {
  const weekdayEntries = Object.entries(WEEKDAY_FA).sort(
    (a, b) => b[0].length - a[0].length,
  );
  const hits = [];
  for (const [name, jsDay] of weekdayEntries) {
    if (name.length < 3) continue;
    let idx = t.indexOf(name);
    while (idx !== -1) {
      const overlaps = hits.some(
        (h) => idx < h.idx + h.name.length && idx + name.length > h.idx,
      );
      if (!overlaps) hits.push({ name, jsDay, idx });
      idx = t.indexOf(name, idx + name.length);
    }
  }
  if (!hits.length) return null;

  const bagiIdx = t.indexOf('برای');
  if (bagiIdx >= 0) {
    const after = hits.filter((h) => h.idx >= bagiIdx);
    if (after.length) {
      after.sort((a, b) => a.idx - b.idx);
      return after[0];
    }
  }
  hits.sort((a, b) => b.idx - a.idx);
  return hits[0];
}

function isNextWeekContext(t, weekdayIdx) {
  const near =
    weekdayIdx >= 0
      ? t.slice(Math.max(0, weekdayIdx - 28), weekdayIdx + 52)
      : t;
  return (
    /(?:هفته|hafteh)\s*(?:بعد|آینده)|next\s*week/.test(near) ||
    /(?:هفته|hafteh)\s*(?:بعد|آینده)|next\s*week/.test(t) ||
    /بعدی/.test(near)
  );
}

function isThisWeekContext(t, weekdayIdx) {
  const near =
    weekdayIdx >= 0 ? t.slice(Math.max(0, weekdayIdx - 20), weekdayIdx + 20) : t;
  return /این\s*هفته/.test(near);
}

function weekdayToDate(name, jsDay, idx, t, now) {
  const anchor = tehranCalendarAnchor(now);
  const cur = anchor.getDay();
  let delta = (jsDay - cur + 7) % 7;
  const nextWeek = isNextWeekContext(t, idx);
  const thisWeek = isThisWeekContext(t, idx);

  if (nextWeek) {
    if (delta === 0) delta = 7;
    else delta += 7;
  } else if (!thisWeek && delta === 0 && !/همین|امروز/.test(t)) {
    delta = 7;
  }

  const date = addCalendarDaysTehran(now, delta);
  let label = name;
  if (nextWeek) label = `${name} هفتهٔ بعد`;
  else if (thisWeek) label = `${name} این هفته`;
  return { date, label };
}

function parseMonthEdge(t, now) {
  if (!/اول\s*ماه|آخر\s*ماه|ماه\s*بعد/.test(t)) return null;

  const today = todayJalaliTehran(now);
  const { jy, jm, jd } = parseJalaliApiParts(today);
  const nextMonthCtx = /ماه\s*بعد/.test(t);

  if (/آخر\s*ماه/.test(t)) {
    let ty = jy;
    let tm = jm;
    if (nextMonthCtx) ({ jy: ty, jm: tm } = addJalaliMonths(jy, jm, 1));
    const last = jalaliMonthLength(ty, tm);
    return {
      date: formatJalaliDate(ty, tm, last),
      label: nextMonthCtx ? 'آخر ماه بعد' : 'آخر ماه',
    };
  }

  if (/اول\s*ماه/.test(t) || nextMonthCtx) {
    let ty = jy;
    let tm = jm;
    if (nextMonthCtx || (jd > 1 && /اول\s*ماه/.test(t))) {
      ({ jy: ty, jm: tm } = addJalaliMonths(jy, jm, 1));
    }
    return {
      date: formatJalaliDate(ty, tm, 1),
      label: nextMonthCtx ? 'اول ماه بعد' : 'اول ماه',
    };
  }

  return null;
}

function parseRepeatPitch(text) {
  const t = normalizeText(text);
  const hit =
    /همون\s*زمین|همین\s*زمین|زمین\s*قبلی|همون\s*مجموعه|بار\s*قبل|دفعه\s*قبل|previous\s*pitch/.test(
      t,
    );
  return hit;
}

function parseSlotDurationHours(text) {
  const t = normalizeText(text);
  let m = t.match(/(\d+)\s*ساعت(?:ه|ی)?/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 4) return n;
  }
  m = t.match(/(یک|دو|سه|چهار)\s*ساعت(?:ه|ی)?/);
  if (m) {
    const n = FA_NUM_WORDS[m[1]];
    if (n >= 1 && n <= 4) return n;
  }
  if (/دو\s*ساعته|۲\s*ساعته/.test(t)) return 2;
  return null;
}

function parseWeekend(t, now) {
  if (!/آخر\s*هفته|weekend/.test(t)) return null;
  const nextWeek = /(?:هفته|hafteh)\s*(?:بعد|آینده)|هفته\s*بعد/.test(t);
  if (nextWeek) {
    const anchor = tehranCalendarAnchor(now);
    const cur = anchor.getDay();
    let delta = (5 - cur + 7) % 7;
    if (delta === 0) delta = 7;
    delta += 7;
    return {
      date: addCalendarDaysTehran(now, delta),
      label: 'آخر هفتهٔ بعد (جمعه)',
    };
  }
  return weekdayToDate('جمعه', 5, t.indexOf('آخر'), t, now);
}

function parseTargetDate(text, now = new Date()) {
  const t = normalizeText(text);

  if (/امروز\s*نه|نه\s*امروز/.test(t) && /فردا/.test(t)) {
    return { date: addCalendarDaysTehran(now, 1), label: 'فردا' };
  }

  const rel = parseRelativeDays(t, now);
  if (rel) return rel;

  const monthEdge = parseMonthEdge(t, now);
  if (monthEdge) return monthEdge;

  const weekend = parseWeekend(t, now);
  if (weekend) return weekend;

  const weekdayPick = pickWeekdayFromText(t);
  if (weekdayPick) {
    const { name, jsDay, idx } = weekdayPick;
    return weekdayToDate(name, jsDay, idx, t, now);
  }

  if (/امشب|امروز|tonight|today/.test(t) && !/امروز\s*نه/.test(t)) {
    return { date: todayJalaliTehran(now), label: 'امروز' };
  }
  if (t.includes(PAS_FARDA) || /day\s*after\s*tomorrow/.test(t)) {
    return { date: addCalendarDaysTehran(now, 2), label: 'پس‌فردا' };
  }
  if (/فردا|tomorrow/.test(t)) {
    const label = /فردا\s*صبح/.test(t)
      ? 'فردا صبح'
      : /فردا\s*شب/.test(t)
        ? 'فردا شب'
        : 'فردا';
    return { date: addCalendarDaysTehran(now, 1), label };
  }

  const m = t.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) {
    const date = `${m[1]}/${String(m[2]).padStart(2, '0')}/${String(m[3]).padStart(2, '0')}`;
    return { date, label: date };
  }

  return null;
}

function parseAlternateDates(text, now) {
  const t = normalizeText(text);
  const alts = [];
  if (/اگه\s*نبود|اگر\s*نبود|ولی\s*اگه|ولی\s*اگر/.test(t) && /فردا/.test(t)) {
    alts.push({
      date: addCalendarDaysTehran(now, 1),
      label: 'فردا (جایگزین)',
    });
  }
  return alts;
}

function wordToHour(word) {
  return FA_NUM_WORDS[word] ?? null;
}

function parseHour(text) {
  const t = normalizeText(text);
  const isAfternoon = /شب|عصر|ظهر|بعدازظهر|بعد\s*از\s*ظهر|pm/.test(t);
  const isMorning = /صبح|am/.test(t);
  const ambiguities = [];

  let mWord = t.match(
    /(?:ساعت\s*)?(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)\s*(?:و\s*نیم\s*)?(?:شب|عصر|ظهر|بعدازظهر|بعد\s*از\s*ظهر)/,
  );
  if (mWord) {
    let h = wordToHour(mWord[1]);
    if (h != null) {
      if (/نیم/.test(mWord[0])) {
        if (h >= 1 && h <= 11) h += 12;
        return { hour: h, minute: 30, ambiguities };
      }
      if (h >= 1 && h <= 11) h += 12;
      return { hour: h, minute: 0, ambiguities };
    }
  }

  mWord = t.match(/(?:ساعت\s*)?(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)\s*صبح/);
  if (mWord) {
    const h = wordToHour(mWord[1]);
    if (h != null) return { hour: h, minute: 0, ambiguities };
  }

  function rangeNeedsAmPm(h1, h2) {
    return h1 >= 1 && h1 <= 11 && h2 >= 1 && h2 <= 11;
  }

  function parseHourRange(h1, h2) {
    if (h2 < h1) [h1, h2] = [h2, h1];
    if (!isAfternoon && !isMorning && rangeNeedsAmPm(h1, h2)) {
      ambiguities.push({ code: 'hour_am_pm', hour: h1, endHour: h2 });
      return {
        timeRange: { startHour: h1, endHour: h2 },
        hour: Math.floor((h1 + h2) / 2),
        minute: 0,
        ambiguities,
      };
    }
    if (isAfternoon) {
      if (h1 >= 1 && h1 <= 11) h1 += 12;
      if (h2 >= 1 && h2 <= 11) h2 += 12;
    }
    return {
      timeRange: { startHour: h1, endHour: h2 },
      hour: Math.floor((h1 + h2) / 2),
      minute: 0,
      ambiguities,
    };
  }

  let m = t.match(
    /(?:^|\s)(?:ساعت\s*)?(\d{1,2})\s*(?:تا|و|-)\s*(\d{1,2})\s*(?:شب|عصر|ظهر|بعدازظهر|بعد\s*از\s*ظهر)/,
  );
  if (m) {
    return parseHourRange(parseInt(m[1], 10), parseInt(m[2], 10));
  }

  m = t.match(
    /(?:^|\s)(?:ساعت\s*)?(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)\s*(?:تا|و|-)\s*(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)\s*(?:شب|عصر|ظهر|بعدازظهر|بعد\s*از\s*ظهر)/,
  );
  if (m) {
    const h1 = wordToHour(m[1]);
    const h2 = wordToHour(m[2]);
    if (h1 != null && h2 != null) return parseHourRange(h1, h2);
  }

  m = t.match(
    /(?:^|\s)(?:ساعت\s*)?(\d{1,2})\s*(?:تا|و|-)\s*(\d{1,2})(?:\s*$|[،,.]|\s+(?:شب|صبح|عصر))/,
  );
  if (m) {
    return parseHourRange(parseInt(m[1], 10), parseInt(m[2], 10));
  }

  m = t.match(
    /بین\s*(?:ساعت\s*)?(\d{1,2})\s*(?:تا|و|-)\s*(\d{1,2})\s*(?:شب|عصر|ظهر|بعدازظهر|بعد\s*از\s*ظهر)?/,
  );
  if (m) {
    return parseHourRange(parseInt(m[1], 10), parseInt(m[2], 10));
  }

  m = t.match(/بعد\s*از\s*(?:ساعت\s*)?(\d{1,2})/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (isAfternoon && h >= 1 && h <= 11) h += 12;
    return { afterHour: h, hour: h + 1, minute: 0, ambiguities };
  }

  m = t.match(/قبل\s*از\s*(?:ساعت\s*)?(\d{1,2})/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (isAfternoon && h >= 1 && h <= 11) h += 12;
    return { beforeHour: h, hour: Math.max(6, h - 1), minute: 0, ambiguities };
  }

  m = t.match(/(?:ساعت\s*)?(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    return { hour: h, minute: min, ambiguities };
  }

  m = t.match(/(\d{1,2})\s*و\s*نیم/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (isAfternoon && h >= 1 && h <= 11) h += 12;
    return { hour: h, minute: 30, ambiguities };
  }

  m = t.match(/(?:ساعت\s*)?(\d{1,2})\s*(?:شب|عصر|ظهر|بعدازظهر|بعد\s*از\s*ظهر)/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (h >= 1 && h <= 11) h += 12;
    return { hour: h, minute: 0, ambiguities };
  }

  m = t.match(/(?:ساعت\s*)?(\d{1,2})\s*(?:صبح)/);
  if (m) {
    return { hour: parseInt(m[1], 10), minute: 0, ambiguities };
  }

  m = t.match(/(\d{1,2})\s*شب/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (h >= 1 && h <= 11) h += 12;
    return { hour: h, minute: 0, ambiguities };
  }

  m = t.match(/(?:ساعت\s*)?(\d{1,2})(?:\s|$|[،,.])/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (h >= 13 && h <= 23) {
      return { hour: h, minute: 0, ambiguities };
    }
    if (isAfternoon && h >= 1 && h <= 11) h += 12;
    else if (!isMorning && h >= 1 && h <= 9) {
      ambiguities.push({ code: 'hour_am_pm', hour: h });
    }
    return { hour: h, minute: 0, ambiguities };
  }

  return null;
}

function parseFilters(text) {
  const t = normalizeText(text);
  const womenOnly =
    /بانوان|خانم|دختر|زنان|تیم\s*بانوان|ladies|women/.test(t) &&
    !/بدون\s*بانوان|نه\s*بانوان/.test(t);

  let pitchType = null;
  let venueCategory = null;
  let surface = null;
  const wantsVolleyball = /والی\s*بال|والیبال|volleyball|volley/.test(t);
  const wantsMulti =
    /چند\s*منظوره|چندکاره|چند\s*کاره|همه\s*کاره|multi[\s-]*purpose/.test(t);
  const wantsFutsal = /فوتسال|futsal|فوتبال\s*سالنی|توپ\s*سالنی/.test(t);
  const wantsHall = /سالن|سرپوشیده|سالنی/.test(t);
  const hasZaminWord = /(?:^|\s)زمین(?:\s|$)/.test(` ${t} `);
  const wantsFootball =
    /فوتبال|football|گل\s*کوچک|گلکوچک|زمین\s*بازی|زمین\s*فوتبال/.test(t);
  const wantsIndoor = wantsVolleyball || wantsMulti || wantsFutsal || wantsHall;
  const wantsGrass =
    /چمن|grass|زمین\s*چمن|چمن\s*طبیعی|چمن\s*مصنوعی|فضای\s*باز/.test(t) ||
    ((hasZaminWord || wantsFootball) && !wantsIndoor);

  if (/چمن\s*مصنوعی|مصنوعی/.test(t)) {
    surface = 'artificial_grass';
    pitchType = 'grass';
    venueCategory = 'grass';
  } else if (wantsVolleyball) {
    pitchType = 'futsal';
    venueCategory = 'volleyball';
  } else if (wantsMulti) {
    pitchType = 'futsal';
    venueCategory = 'multi';
  } else if (wantsFutsal) {
    pitchType = 'futsal';
    venueCategory = 'futsal';
  } else if (wantsHall) {
    pitchType = 'futsal';
    venueCategory = 'indoor';
  } else if (wantsGrass) {
    pitchType = 'grass';
    venueCategory = 'grass';
  }

  let zone = null;
  for (const row of ZONE_KEYWORDS) {
    if (row.words.some((w) => t.includes(w))) {
      zone = row.zone;
      break;
    }
  }

  let district = null;
  let districtExplicit = false;
  const districtPart = parseDistrictFromText(text);
  if (districtPart) {
    district = districtPart.district;
    districtExplicit = districtPart.districtExplicit;
  }

  let maxPrice = null;
  const looksLikeTimeRange =
    /\d{1,2}\s*(?:تا|و|-)\s*\d{1,2}\s*(?:شب|عصر|صبح|ظهر)/.test(t) ||
    /(?:ساعت\s*)?\d{1,2}\s*(?:تا|و|-)\s*\d{1,2}/.test(t);
  if (!looksLikeTimeRange) {
    const priceM = t.match(
      /(?:زیر|حداکثر)\s*(\d[\d,.]*)\s*(?:هزار|تومان)?|(?:تا)\s*(\d[\d,.]*)\s*(?:هزار|تومان)/,
    );
    if (priceM) {
      const raw = priceM[1] || priceM[2];
      let n = parseInt(String(raw).replace(/[,.]/g, ''), 10);
      if (/هزار/.test(priceM[0])) n *= 1000;
      if (n >= 1000) maxPrice = n;
    }
  }

  let playersCount = null;
  const pc = t.match(/(\d+)\s*نفر/);
  if (pc) playersCount = parseInt(pc[1], 10);

  const preferences = [];
  const requiredAmenities = [];
  if (/پارکینگ/.test(t)) {
    preferences.push('parking');
    requiredAmenities.push('parking');
  }
  if (/مترو|نزدیک\s*مترو/.test(t)) preferences.push('metro');

  return {
    womenOnly,
    pitchType,
    venueCategory,
    surface,
    zone,
    district,
    districtExplicit,
    maxPrice,
    playersCount,
    preferences,
    requiredAmenities,
  };
}

function parseConversationMeta(text) {
  const t = normalizeText(text);
  let sortHint = null;
  if (/ارزون|ارزان|ارزونتر|ارزانتر|cheaper|هر\s*ساعتی\s*ارزون/.test(t)) {
    sortHint = 'price_asc';
  }
  if (/نزدیک|نزدیکتر|closer/.test(t)) sortHint = 'distance';
  const weekFlexible = /همین\s*هفته|این\s*هفته/.test(t) && /هر\s*ساعت|ارزون|ارزان/.test(t);
  return { sortHint, weekFlexible };
}

/** «فردا شب» / «امشب» بدون ساعت دقیق → بازهٔ عصر */
function parseSearchAnywhere(text) {
  const t = normalizeText(text);
  if (
    /^(همه\s*جا|کل\s*تهران|هر\s*جا|فرقی\s*نداره|مهم\s*نیست|کل\s*شهر)$/.test(t) ||
    /همه\s*جا|کل\s*تهران|هر\s*جا|فرقی\s*نداره|مهم\s*نیست/.test(t)
  ) {
    return true;
  }
  return false;
}

function inferEveningWindow(text, datePart, timePart) {
  if (timePart?.hour != null) return null;
  const t = normalizeText(text);
  if (/^(شب|صبح|عصر|بعدازظهر|بعد\s*از\s*ظهر)$/.test(t)) return null;
  const eveningDate =
    /(?:امشب|فردا\s*شب)|(?:^|\s)شب(?:\s|$)/.test(t) ||
    (datePart?.label && /شب/.test(datePart.label));
  if (!eveningDate) return null;
  return {
    afterHour: 17,
    beforeHour: 24,
    hour: 20,
    flexibleTime: false,
    eveningWindow: true,
  };
}

function resolveTimeWindow(text, timePart) {
  const t = normalizeText(text);
  const flexibleTime = /هر\s*ساعتی|هر\s*زمانی|خالی\s*بود/.test(t);
  let timeRange = timePart?.timeRange || null;
  let afterHour = timePart?.afterHour ?? null;
  let beforeHour = timePart?.beforeHour ?? null;
  let timeRangeExplicit = !!(timeRange || flexibleTime || afterHour != null || beforeHour != null);

  const hour = timePart?.hour;
  const hourAmbiguous = (timePart?.ambiguities || []).some((a) => a.code === 'hour_am_pm');
  const hasExplicitRange = /\d{1,2}\s*(?:تا|و|-)\s*\d{1,2}\s*(?:شب|عصر)/.test(t);
  const disambiguatedSingle =
    hour != null &&
    !hourAmbiguous &&
    !hasExplicitRange &&
    (/(?:ساعت\s*)?\d{1,2}\s*(?:شب|عصر|ظهر|بعدازظهر|بعد\s*از\s*ظهر|صبح)|\d{1,2}\s*شب|\d{1,2}\s*[:：]\s*\d{2}|\d{1,2}\s*و\s*نیم/.test(
      t,
    ) ||
      (hour >= 13 && hour <= 23));
  const lockedSingle =
    /فقط|همین\s*ساعت|دقیقا|دقیقاً|همون\s*ساعت|همین\s*ساعته/.test(t) && hour != null;
  if ((lockedSingle || disambiguatedSingle) && !timeRange && hour != null) {
    timeRange = { startHour: hour, endHour: hour + 1 };
    timeRangeExplicit = true;
  }

  return {
    hour,
    minute: timePart?.minute ?? 0,
    timeRange,
    afterHour,
    beforeHour,
    flexibleTime,
    timeRangeExplicit,
  };
}

function parseMessageToIntent(message, now = new Date()) {
  const text = String(message || '').trim();
  const datePart = parseTargetDate(text, now);
  const timePart = parseHour(text);
  const filters = parseFilters(text);
  const alts = parseAlternateDates(text, now);
  const meta = parseConversationMeta(text);
  const repeatPreviousPitch = parseRepeatPitch(text);
  const durationHours = parseSlotDurationHours(text);

  let timeWin = resolveTimeWindow(text, timePart);
  const evening = inferEveningWindow(text, datePart, timePart);
  if (evening) {
    timeWin = {
      ...timeWin,
      hour: evening.hour,
      afterHour: evening.afterHour,
      beforeHour: evening.beforeHour,
      minute: 0,
      timeExplicit: true,
      timeRangeExplicit: !!(timeWin.timeRange || evening.afterHour != null),
      eveningWindow: true,
    };
  }

  let confidence = 'medium';
  if (!datePart && !timePart) confidence = 'low';
  if (datePart && (timePart?.hour != null || timeWin.flexibleTime || timeWin.timeRangeExplicit)) {
    confidence = 'high';
  }

  const out = {
    ...emptyAssistantIntent(),
    date: datePart?.date || null,
    dateLabel: datePart?.label || null,
    dateExplicit: !!datePart,
    alternateDates: alts,
    hour: timeWin.hour,
    minute: timeWin.minute,
    timeRange: timeWin.timeRange,
    afterHour: timeWin.afterHour,
    beforeHour: timeWin.beforeHour,
    flexibleTime: timeWin.flexibleTime,
    timeRangeExplicit: timeWin.timeRangeExplicit,
    timeExplicit: !!(
      timePart?.hour != null ||
      timeWin.timeRange ||
      timeWin.flexibleTime ||
      timeWin.afterHour != null ||
      timeWin.beforeHour != null
    ),
    womenOnly: filters.womenOnly,
    pitchType: filters.pitchType,
    venueCategory: filters.venueCategory,
    surface: filters.surface,
    zone: filters.zone,
    district: filters.district,
    districtExplicit: filters.districtExplicit,
    maxPrice: filters.maxPrice,
    playersCount: filters.playersCount,
    preferences: filters.preferences || [],
    requiredAmenities: filters.requiredAmenities || [],
    ambiguities: [...(timePart?.ambiguities || [])],
    confidence,
    repeatPreviousPitch,
    ...(parseSearchAnywhere(text) ? { searchAnywhere: true } : {}),
    eveningWindow: !!timeWin.eveningWindow,
    ...(durationHours != null
      ? { slotDurationHours: durationHours, durationExplicit: true }
      : {}),
  };

  return {
    extracted: out,
    meta: { ...meta, weekFlexible: meta.weekFlexible || false },
  };
}

function parseBookingIntent(message, now = new Date()) {
  const { extracted } = parseMessageToIntent(message, now);
  return {
    date: extracted.date,
    dateLabel: extracted.dateLabel || 'نزدیک‌ترین روز',
    hour: extracted.hour,
    minute: extracted.minute ?? 0,
    womenOnly: extracted.womenOnly,
    pitchType: extracted.pitchType,
    zone: extracted.zone,
    confidence: extracted.confidence,
  };
}

module.exports = {
  parseBookingIntent,
  parseMessageToIntent,
  normalizeText,
  parseTargetDate,
  parseFilters,
  parseHour,
  PAS_FARDA,
};
