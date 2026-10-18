const { normalizeText, parseTargetDate, parseHour, parseFilters } = require('./assistantParse');

/**
 * اصلاح نظر کاربر، انصراف از ساعت قبلی، ارجاع به گزینهٔ لیست.
 */
function parseConversationAdjustments(message, now = new Date()) {
  const t = normalizeText(message);
  const out = {
    clearHour: false,
    clearDate: false,
    clearDistrict: false,
    resultOrdinal: null,
    forceCheaper: false,
    pitchTypeOverride: null,
    dateOverride: null,
    dateLabelOverride: null,
  };

  if (/ارزون\s*تر|ارزان\s*تر|گرون\s*تر|گران\s*تر|cheaper/.test(t)) {
    out.forceCheaper = true;
  }

  let m = t.match(/(?:گزینه|شماره|نتیجه)\s*(\d+)/);
  if (m) out.resultOrdinal = parseInt(m[1], 10);
  if (/اولی|اول\s*ی/.test(t)) out.resultOrdinal = 1;
  else if (/دومی|دوم\s*ی/.test(t)) out.resultOrdinal = 2;
  else if (/سومی|سوم\s*ی/.test(t)) out.resultOrdinal = 3;

  if (/بی\s*خیال|بیخیال|cancel\s*time/.test(t) && /ساعت/.test(t)) {
    out.clearHour = true;
  }

  if (/منظورم|منظور\s*ام|نه\s*,/.test(t)) {
    const corr = t.match(/منظورم\s*(?:was\s*)?(.+?)\s*بود/);
    const chunk = corr ? corr[1] : t;
    const datePart = parseTargetDate(chunk, now);
    if (datePart) {
      out.dateOverride = datePart.date;
      out.dateLabelOverride = datePart.label;
    } else {
      const wd = parseTargetDate(`برای ${chunk}`, now);
      if (wd) {
        out.dateOverride = wd.date;
        out.dateLabelOverride = wd.label;
      }
    }
  }

  if (/فوتبال\s*چطور|چمن\s*چطور|فوتسال\s*نه|فوتبال\s*باش|فوتسال\s*باش/.test(t)) {
    const f = parseFilters(message);
    if (f.pitchType) out.pitchTypeOverride = f.pitchType;
    else if (/فوتبال|چمن/.test(t)) out.pitchTypeOverride = 'grass';
    else if (/فوتسال|سالن/.test(t)) out.pitchTypeOverride = 'futsal';
  }

  return out;
}

function applyAdjustmentsToIntent(intent, adjustments, timeFromMessage) {
  const out = { ...intent };

  if (adjustments.clearHour) {
    out.hour = null;
    out.minute = 0;
    out.timeRange = null;
    out.afterHour = null;
    out.beforeHour = null;
    out.timeExplicit = false;
    out.timeRangeExplicit = false;
    out.ambiguities = (out.ambiguities || []).filter((a) => a.code !== 'hour_am_pm');
  }

  if (adjustments.dateOverride) {
    out.date = adjustments.dateOverride;
    out.dateLabel = adjustments.dateLabelOverride || out.dateLabel;
    out.dateExplicit = true;
  }

  if (adjustments.pitchTypeOverride) {
    out.pitchType = adjustments.pitchTypeOverride;
    out.venueCategory = adjustments.pitchTypeOverride;
  }

  if (adjustments.forceCheaper) {
    out.sortBy = 'price_asc';
  }

  if (timeFromMessage?.hour != null) {
    out.hour = timeFromMessage.hour;
    out.minute = timeFromMessage.minute ?? 0;
    out.timeExplicit = true;
    if (timeFromMessage.timeRange) {
      out.timeRange = timeFromMessage.timeRange;
      out.timeRangeExplicit = true;
    }
    if (timeFromMessage.afterHour != null) out.afterHour = timeFromMessage.afterHour;
    if (timeFromMessage.beforeHour != null) out.beforeHour = timeFromMessage.beforeHour;
    out.ambiguities = [...(timeFromMessage.ambiguities || [])];
  }

  return out;
}

module.exports = { parseConversationAdjustments, applyAdjustmentsToIntent };
