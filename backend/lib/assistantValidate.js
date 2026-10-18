const { todayJalaliTehran, compareJalali, tehranNowMinutes } = require('./assistantClock');
const { emptyAssistantIntent } = require('./assistantIntent');

function hasHourAmbiguity(intent) {
  return (intent.ambiguities || []).some((a) => a.code === 'hour_am_pm');
}

function ambiguousHour(intent) {
  const row = (intent.ambiguities || []).find((a) => a.code === 'hour_am_pm');
  if (row?.hour != null) return row.hour;
  return intent.hour;
}

function ambiguousTimeEndHour(intent) {
  const row = (intent.ambiguities || []).find((a) => a.code === 'hour_am_pm');
  return row?.endHour ?? null;
}

/** پاسخ کوتاه «شب» / «صبح» بعد از سؤال ابهام ساعت */
function resolveHourAmPmReply(intent, replyNormalized) {
  const t = String(replyNormalized || '').trim();
  if (!hasHourAmbiguity(intent)) return intent;

  const evening = /^(شب|عصر|بعدازظهر|بعد\s*از\s*ظهر|pm)$/.test(t);
  const morning = /^(صبح|am)$/.test(t);
  if (!evening && !morning) return intent;

  const h = ambiguousHour(intent);
  const endH = ambiguousTimeEndHour(intent);
  const timeRange = intent.timeRange;

  if (timeRange?.startHour != null && endH != null) {
    let h1 = timeRange.startHour;
    let h2 = timeRange.endHour;
    if (evening) {
      if (h1 >= 1 && h1 <= 11) h1 += 12;
      if (h2 >= 1 && h2 <= 11) h2 += 12;
    }
    return {
      ...intent,
      hour: Math.floor((h1 + h2) / 2),
      timeRange: { startHour: h1, endHour: h2 },
      timeExplicit: true,
      timeRangeExplicit: true,
      ambiguities: [],
      eveningWindow: false,
    };
  }

  const hour = evening ? (h >= 1 && h <= 11 ? h + 12 : h) : h;
  return {
    ...intent,
    hour,
    timeRange: { startHour: hour, endHour: hour + 1 },
    timeExplicit: true,
    timeRangeExplicit: true,
    ambiguities: [],
    eveningWindow: false,
  };
}

/** برای جستجو: بازه، بعد/قبل، انعطاف، یا ساعت روشن (مثلاً ۷ شب / ۱۹) */
function hasTimeIntent(intent) {
  if (hasHourAmbiguity(intent)) return false;
  if (intent.flexibleTime) return true;
  if (intent.timeRange && intent.timeRangeExplicit) return true;
  if (intent.timeRange && intent.timeExplicit) return true;
  if (intent.afterHour != null || intent.beforeHour != null) return true;
  if (intent.timeExplicit && intent.hour != null) return true;
  return false;
}

function hourHintFa(intent) {
  if (intent.hour == null || hasHourAmbiguity(intent)) return '';
  const h = Math.floor(intent.hour);
  const m = intent.minute || 0;
  if (m) return ` (حدود ساعت ${h}:${String(m).padStart(2, '0')} گفته بودی)`;
  return ` (حدود ساعت ${h} گفته بودی)`;
}

function hasLocationIntent(intent) {
  if (intent.searchAnywhere) return true;
  if (intent.pitchId) return true;
  if (intent.repeatPreviousPitch) return true;
  if (intent.districtExplicit && intent.district) return true;
  if (intent.zone) return true;
  return false;
}

function isReadyForLocationAsk(intent) {
  if (!intent.dateExplicit && !intent.date) return false;
  if (!intent.pitchType) return false;
  return hasTimeIntent(intent);
}

function inferMissingFields(intent) {
  const missing = [];
  if (!intent.dateExplicit && !intent.date && !intent.weekFlexible) missing.push('date');
  if (!hasTimeIntent(intent) && !intent.flexibleTime && !intent.weekFlexible) {
    missing.push('time');
  }
  if (!intent.pitchType) missing.push('pitchType');
  return missing;
}

/**
 * اعتبارسنجی تاریخ/ساعت — بدون جابجایی خودکار به آینده مگر alternateDates از پارسر.
 */
function validateAssistantIntent(intent, now = new Date()) {
  const out = { ...intent };
  out.warnings = [...(out.warnings || [])];
  out.ambiguities = [...(out.ambiguities || [])];
  out.missingFields = inferMissingFields(out);
  out.needsClarification = false;
  out.clarificationQuestion = null;

  const today = todayJalaliTehran(now);

  if (out.date && compareJalali(out.date, today) < 0) {
    out.warnings.push('تاریخ درخواستی در گذشته است.');
    out.needsClarification = true;
    out.clarificationQuestion =
      'تاریخی که گفتید گذشته است. لطفاً تاریخ دیگری بگویید (مثلاً فردا یا یک روز هفته).';
  }

  if (out.date === today && out.hour != null && !out.flexibleTime) {
    const slotStartMin = out.hour * 60 + (out.minute || 0);
    if (slotStartMin <= tehranNowMinutes(now) - 15) {
      out.warnings.push('ساعت درخواستی برای امروز گذشته است.');
    }
  }

  if (!out.needsClarification) {
    const missTime = out.missingFields.includes('time');
    const missDate = out.missingFields.includes('date');
    const missType = out.missingFields.includes('pitchType');
    const hourGuess = ambiguousHour(out);

    if (hasHourAmbiguity(out) && hourGuess != null) {
      const endGuess = ambiguousTimeEndHour(out);
      out.needsClarification = true;
      out.clarificationQuestion =
        endGuess != null
          ? `بازه ${hourGuess} تا ${endGuess} صبح مدنظرته یا ${hourGuess} تا ${endGuess} بعدازظهر/شب؟`
          : `ساعت ${hourGuess} صبح مدنظرته یا ${hourGuess} بعدازظهر/شب؟`;
    } else if (missDate) {
      out.needsClarification = true;
      out.clarificationQuestion = 'برای چه روزی می‌خوای زمین پیدا کنم؟ (مثلاً فردا، پنجشنبه، یا سه روز دیگه)';
    } else if (missType && (out.dateExplicit || out.timeExplicit || out.weekFlexible)) {
      out.needsClarification = true;
      out.clarificationQuestion =
        'چه فضایی می‌خوای؛ زمین چمن، سالن فوتسال، سالن والیبال یا سالن چندمنظوره؟';
    } else if (missTime) {
      out.needsClarification = true;
      out.clarificationQuestion =
        `چه ساعتی برات مناسبه؟${hourHintFa(out)} (مثلاً ۸ تا ۱۰ شب یا بین ۶ تا ۹)`;
    } else if (
      isReadyForLocationAsk(out) &&
      !hasLocationIntent(out)
    ) {
      out.needsClarification = true;
      out.clarificationQuestion =
        'حدود کدوم محله یا منطقهٔ تهران مدنظرته؟ (مثلاً پیروزی، تهرانپارس، غرب تهران — اگر فرقی نداره بنویس «همه جا».)';
    } else if (
      out.confidence === 'low' &&
      !out.dateExplicit &&
      !out.timeExplicit &&
      !out.weekFlexible
    ) {
      out.needsClarification = true;
      out.clarificationQuestion =
        'بگو چه روزی و چه ساعتی — مثلاً «فردا ۷ شب فوتسال» یا «پنجشنبه بین ۶ تا ۸».';
    }
  }

  if (!out.date) {
    out.date = todayJalaliTehran(now);
    out.dateLabel = out.dateLabel || 'امروز';
  }

  return out;
}

function sanitizeUserMessage(raw) {
  const s = String(raw || '').slice(0, 2000).trim();
  return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

module.exports = {
  validateAssistantIntent,
  sanitizeUserMessage,
  inferMissingFields,
  hasTimeIntent,
  hasLocationIntent,
  hasHourAmbiguity,
  ambiguousHour,
  ambiguousTimeEndHour,
  resolveHourAmPmReply,
};
