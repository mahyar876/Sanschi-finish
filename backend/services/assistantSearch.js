const Pitch = require('../models/Pitch');
const Reservation = require('../models/Reservation');
const DailyAvailability = require('../models/DailyAvailability');
const { ensureDaily, expireStaleForDaily, normalizeSlot, SLOT_STATUS } = require('./slotService');
const { isSlotPast, slotTimeRange } = require('../lib/jalaliTime');
const { applyLastMinuteToSlot } = require('./lastMinutePricing');
const { toLegacyIntent } = require('../lib/assistantIntent');
const {
  pitchMatchesDistrict,
  districtMatchScore,
  districtTehranZone,
} = require('../lib/assistantDistricts');
const { pitchInZone, zoneLabelFa } = require('../lib/assistantZones');

function slotStartHour(dateStr, slotTimeStr) {
  const { start } = slotTimeRange(dateStr, slotTimeStr);
  return start.getHours() + start.getMinutes() / 60;
}

function hourDistance(wantHour, slotTimeStr, dateStr) {
  if (wantHour == null || !Number.isFinite(wantHour)) return 0;
  const h = slotStartHour(dateStr, slotTimeStr);
  return Math.abs(h - wantHour);
}

function isSlotBookable(sObj, dateStr, now) {
  let displayStatus = sObj.blocked
    ? SLOT_STATUS.BLOCKED
    : sObj.slotStatus || (sObj.taken ? SLOT_STATUS.BOOKED : SLOT_STATUS.FREE);
  if (isSlotPast(dateStr, sObj.time, now)) displayStatus = SLOT_STATUS.PAST;
  return displayStatus === SLOT_STATUS.FREE && !sObj.taken && !sObj.blocked;
}

function hasConsecutiveBookableSlots(slotsNorm, startIndex, count, dateStr, now) {
  const byIdx = new Map(slotsNorm.map((s) => [s.slotIndex, s]));
  for (let i = 0; i < count; i += 1) {
    const s = byIdx.get(startIndex + i);
    if (!s || !isSlotBookable(s, dateStr, now)) return false;
  }
  return true;
}

function slotMatchesTime(intent, slotTimeStr, dateStr, opts = {}) {
  const h = slotStartHour(dateStr, slotTimeStr);
  const hourTol = opts.relaxed ? 5 : 2.5;
  if (intent.flexibleTime) return true;

  if (intent.timeRange) {
    const { startHour, endHour } = intent.timeRange;
    const pad = opts.relaxed ? 1.5 : 0.25;
    const end = endHour <= startHour ? endHour + 24 : endHour;
    const hAdj = h < startHour - 2 ? h + 24 : h;
    return hAdj >= startHour - pad && hAdj <= end + pad;
  }
  if (intent.afterHour != null && intent.beforeHour != null) {
    if (h < intent.afterHour) return false;
    if (h >= intent.beforeHour) return false;
    if (intent.eveningWindow || intent.beforeHour - intent.afterHour >= 3) {
      return true;
    }
  }
  if (intent.afterHour != null && h < intent.afterHour) return false;
  if (intent.beforeHour != null && h >= intent.beforeHour) return false;
  if (intent.hour != null) {
    return hourDistance(intent.hour, slotTimeStr, dateStr) <= hourTol;
  }
  return true;
}

async function popularityByPitch(days = 90) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const rows = await Reservation.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
        paymentStatus: 'successful',
      },
    },
    { $group: { _id: '$pitch', count: { $sum: 1 } } },
  ]);
  const map = new Map();
  for (const r of rows) map.set(String(r._id), r.count);
  return map;
}

function resultPitchStub(r) {
  return { name: r.name, address: r.address, tags: [] };
}

function inferVenueCategory(pitch) {
  if (pitch.type === 'grass') return 'grass';
  const text = [pitch.name, pitch.desc, ...(pitch.tags || [])].filter(Boolean).join(' ');
  if (/چند\s*منظوره|چندکاره|چند\s*کاره|همه\s*کاره/i.test(text)) return 'multi';
  if (/والی\s*بال|والیبال|volleyball/i.test(text)) return 'volleyball';
  return 'futsal';
}

function venueCategoryLabel(category) {
  return {
    grass: 'زمین چمن',
    futsal: 'سالن فوتسال',
    volleyball: 'سالن والیبال',
    multi: 'سالن چندمنظوره',
    indoor: 'سالن ورزشی',
  }[category];
}

function buildReplySummary(intent, results, dateUsed, searchMeta = {}) {
  const parts = [];
  parts.push(`برای ${intent.dateLabel || '—'} (${dateUsed || intent.date})`);
  if (intent.timeRange && !intent.flexibleTime) {
    parts.push(`بین ساعت ${intent.timeRange.startHour} تا ${intent.timeRange.endHour}`);
  } else if (intent.hour != null && !intent.flexibleTime) {
    parts.push(`حدود ساعت ${intent.hour}`);
  } else if (intent.flexibleTime) {
    parts.push('هر سانس آزاد');
  }
  if (intent.womenOnly) parts.push('با اولویت مجموعه‌های مجاز برای بانوان');
  const requestedCategory = intent.venueCategory || intent.pitchType;
  if (requestedCategory) parts.push(`نوع: ${venueCategoryLabel(requestedCategory)}`);
  if (intent.district) parts.push(`محله: ${intent.district}`);
  if (intent.pitchName) parts.push(`زمین: ${intent.pitchName}`);
  if (intent.slotDurationHours > 1) {
    parts.push(`${intent.slotDurationHours} ساعت (چند سانس پشت‌سرهم)`);
  }
  if (!results.length) {
    const amenHint =
      intent.requiredAmenities?.length || intent.preferences?.includes('metro')
        ? ' (شاید فیلتر امکانات یا مترو محدودکننده باشد)'
        : '';
    return `${parts.join(' ')} — متأسفانه سانس آزاد مناسب پیدا نشد${amenHint}. تاریخ یا ساعت دیگری امتحان کنید یا از گالری فیلتر کنید.`;
  }

  if (results.length >= 2 && intent.sortBy === 'price_asc') {
    const prices = results.map((r) => r.slot?.sitePrice).filter((x) => x != null);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    if (maxP > minP) {
      parts.push(`(از ${minP.toLocaleString('fa-IR')} تا ${maxP.toLocaleString('fa-IR')} تومان)`);
    }
  }

  const districtKey = intent.district;
  let districtHits = 0;
  if (districtKey) {
    districtHits = results.filter((r) => pitchMatchesDistrict(resultPitchStub(r), districtKey)).length;
  }
  const zone = searchMeta.preferredZone;

  if (districtKey && districtHits === 0 && zone) {
    return `${parts.join(' ')} — در «${districtKey}» سانس نبود؛ ${results.length} پیشنهاد (اول ${zoneLabelFa(zone)}، بعد بقیه):`;
  }
  if (districtKey && districtHits > 0 && districtHits < results.length) {
    return `${parts.join(' ')} — ${districtHits} در «${districtKey}»، ${results.length - districtHits} پیشنهاد دیگر با سانس آزاد:`;
  }
  return `${parts.join(' ')} — ${results.length} پیشنهاد با سانس آزاد:`;
}

function locationTierForPitch(p, { districtKey, preferredZone }) {
  if (districtKey && pitchMatchesDistrict(p, districtKey)) return 0;
  if (preferredZone && pitchInZone(p, preferredZone)) return 1;
  return 2;
}

function pitchMatchesAmenities(p, requiredIds) {
  const amenities = new Set(p.amenities || []);
  const tagsText = [...(p.tags || []), p.address, p.name, p.desc].filter(Boolean).join(' ');
  for (const id of requiredIds || []) {
    if (id === 'parking' && !amenities.has('parking') && !/پارکینگ/i.test(tagsText)) {
      return false;
    }
  }
  return true;
}

function metroBoostScore(p) {
  const tagsText = [...(p.tags || []), p.address, p.name, p.desc].filter(Boolean).join(' ');
  return /مترو|metro/i.test(tagsText) ? -800 : 0;
}

function applyBasePitchFilters(allPitches, intent) {
  let pitches = allPitches;
  if (intent.pitchType) pitches = pitches.filter((p) => p.type === intent.pitchType);
  if (intent.venueCategory === 'volleyball') {
    pitches = pitches.filter((p) => {
      const category = inferVenueCategory(p);
      return category === 'volleyball' || category === 'multi';
    });
  } else if (intent.venueCategory === 'multi') {
    pitches = pitches.filter((p) => inferVenueCategory(p) === 'multi');
  } else if (intent.venueCategory === 'futsal') {
    pitches = pitches.filter((p) => {
      const category = inferVenueCategory(p);
      return category === 'futsal' || category === 'multi';
    });
  }
  if (intent.womenOnly) {
    pitches = pitches.filter((p) => p.womenBookingAllowed === true);
  }
  if (intent.pitchId) {
    pitches = pitches.filter((p) => String(p._id) === String(intent.pitchId));
  }
  if (intent.zone) {
    pitches = pitches.filter((p) => pitchInZone(p, intent.zone));
  }
  if (intent.requiredAmenities?.length) {
    pitches = pitches.filter((p) => pitchMatchesAmenities(p, intent.requiredAmenities));
  }
  return pitches;
}

function datesForIntent(intent, now) {
  const { addCalendarDaysTehran, todayJalaliTehran } = require('../lib/assistantClock');
  const base = [intent.date, ...(intent.alternateDates || []).map((d) => d.date)].filter(Boolean);
  if (intent.weekFlexible) {
    const start = todayJalaliTehran(now);
    const week = [start];
    for (let i = 1; i < 7; i += 1) week.push(addCalendarDaysTehran(now, i));
    return week;
  }
  return base;
}

async function searchInPitchPool(
  intent,
  pitches,
  { limit, now, districtForScore, preferredZone, relaxed = false } = {},
) {
  const datesToTry = datesForIntent(intent, now);

  const durationHours = Math.min(
    4,
    Math.max(1, parseInt(String(intent.slotDurationHours || 1), 10) || 1),
  );

  const pop = await popularityByPitch(90);
  let bestResults = [];
  let usedDate = intent.date;

  for (const dateStr of datesToTry) {
    const scored = [];
    const searchIntent = { ...intent, date: dateStr };

    for (const p of pitches) {
      let daily = await ensureDaily(p, p._id, dateStr);
      await expireStaleForDaily(daily);
      daily = await DailyAvailability.findById(daily._id);
      if (!daily) continue;

      const pitchComm = p.commissionAmount || 0;
      let bestSlot = null;
      let bestScore = Infinity;
      const slotsNorm = daily.slots.map((s) => normalizeSlot(s, now));

      for (const s of daily.slots) {
        const sObj = normalizeSlot(s, now);
        if (!isSlotBookable(sObj, dateStr, now)) continue;
        if (!slotMatchesTime(searchIntent, sObj.time, dateStr, { relaxed })) continue;
        if (
          durationHours > 1 &&
          !hasConsecutiveBookableSlots(slotsNorm, sObj.slotIndex, durationHours, dateStr, now)
        ) {
          continue;
        }

        let sitePrice = 0;
        let flashDeal = false;
        for (let i = 0; i < durationHours; i += 1) {
          const part = daily.slots.find((x) => normalizeSlot(x, now).slotIndex === sObj.slotIndex + i);
          if (!part) break;
          let partPrice = part.price + pitchComm;
          const lm = applyLastMinuteToSlot(partPrice, dateStr, part.time, p, now);
          partPrice = lm.sitePrice;
          if (lm.flashDeal) flashDeal = true;
          sitePrice += partPrice;
        }

        if (intent.maxPrice != null && sitePrice > intent.maxPrice) continue;

        const dist = hourDistance(searchIntent.hour, sObj.time, dateStr);
        let score = dist * 10 - (pop.get(String(p._id)) || 0) * 0.5;
        if (districtForScore) {
          const dScore = districtMatchScore(p, districtForScore);
          if (dScore >= 0) score -= dScore * 2;
        }
        if (intent.sortBy === 'price_asc') score = sitePrice + dist * 2;

        const locTier = locationTierForPitch(p, {
          districtKey: districtForScore,
          preferredZone,
        });
        score += locTier * 5000;
        if (intent.preferences?.includes('metro')) {
          score += metroBoostScore(p);
        }

        if (score < bestScore) {
          bestScore = score;
          bestSlot = {
            slotIndex: sObj.slotIndex,
            time: sObj.time,
            sitePrice,
            flashDeal,
            durationHours,
          };
        }
      }

      if (!bestSlot) continue;

      scored.push({
        pitchId: String(p._id),
        name: p.name,
        type: p.type,
        venueCategory: inferVenueCategory(p),
        size: p.size,
        address: p.address,
        womenBookingAllowed: p.womenBookingAllowed ?? null,
        popularity90d: pop.get(String(p._id)) || 0,
        slot: bestSlot,
        score: bestScore,
        date: dateStr,
      });
    }

    scored.sort((a, b) => a.score - b.score);
    if (scored.length) {
      bestResults = scored;
      usedDate = dateStr;
      break;
    }
  }

  const cap = Math.min(parseInt(String(limit), 10) || 5, 10);
  const results = bestResults.slice(0, cap).map(({ score, ...rest }) => rest);

  return { results, usedDate };
}

function cloneIntent(intent) {
  return JSON.parse(JSON.stringify(intent));
}

async function runSearchAttempt(intent, allPitches, { limit, now, relaxed }) {
  const base = applyBasePitchFilters(allPitches, intent);
  const preferredZone =
    intent.district && intent.districtExplicit
      ? districtTehranZone(intent.district)
      : intent.zone || null;
  return searchInPitchPool(intent, base, {
    limit,
    now,
    districtForScore: intent.district || null,
    preferredZone,
    relaxed,
  });
}

async function searchPitchesForIntent(intent, { limit = 6, now = new Date() } = {}) {
  const { addCalendarDaysTehran, todayJalaliTehran } = require('../lib/assistantClock');
  const allPitches = await Pitch.find({ isActive: true }).lean();
  const preferredZone =
    intent.district && intent.districtExplicit
      ? districtTehranZone(intent.district)
      : intent.zone || null;
  const searchMeta = { preferredZone, fallbackNote: null };

  let working = cloneIntent(intent);
  let { results, usedDate } = await runSearchAttempt(working, allPitches, { limit, now, relaxed: false });

  const today = todayJalaliTehran(now);
  if (!results.length && working.date === today) {
    const tomorrow = addCalendarDaysTehran(now, 1);
    const tryTomorrow = { ...working, date: tomorrow, dateLabel: 'فردا (به‌جای امروز)' };
    const alt = await runSearchAttempt(tryTomorrow, allPitches, { limit, now, relaxed: false });
    if (alt.results.length) {
      results = alt.results;
      usedDate = alt.usedDate;
      working = tryTomorrow;
      searchMeta.fallbackNote =
        'برای امروز سانس مناسب (یا آزاد) نبود؛ نتیجه برای فردا است.';
    }
  }

  if (!results.length) {
    const relaxed = {
      ...working,
      flexibleTime: true,
      eveningWindow: false,
      afterHour: null,
      beforeHour: null,
      timeRange: null,
      timeRangeExplicit: false,
      requiredAmenities: [],
    };
    const alt = await runSearchAttempt(relaxed, allPitches, { limit, now, relaxed: true });
    if (alt.results.length) {
      results = alt.results;
      usedDate = alt.usedDate;
      searchMeta.fallbackNote =
        searchMeta.fallbackNote ||
        'سانس دقیق پیدا نشد؛ نزدیک‌ترین سانس‌های آزاد در همان روز نشان داده می‌شود.';
    }
  }

  if (!results.length && working.pitchType) {
    const anyType = { ...working, pitchType: null, venueCategory: null, requiredAmenities: [] };
    const alt = await runSearchAttempt(anyType, allPitches, { limit, now, relaxed: true });
    if (alt.results.length) {
      results = alt.results;
      usedDate = alt.usedDate;
      searchMeta.fallbackNote = 'با نوع زمین درخواستی چیزی نبود؛ گزینه‌های دیگر (چمن/سالن) آورده شد.';
    }
  }

  if (!results.length && !allPitches.length) {
    searchMeta.fallbackNote = 'در سیستم زمین فعالی ثبت نشده است.';
  }

  let summary = buildReplySummary(working, results, usedDate, searchMeta);
  if (searchMeta.fallbackNote && results.length) {
    summary = `${searchMeta.fallbackNote} ${summary}`;
  }

  return {
    results,
    usedDate,
    summary,
    legacyIntent: { ...toLegacyIntent(working), date: usedDate },
    searchMeta,
  };
}

module.exports = { searchPitchesForIntent, buildReplySummary, slotMatchesTime };
