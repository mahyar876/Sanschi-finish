const { LAST_MINUTE_DEFAULTS } = require('../lib/bookingConstants');
const { hoursUntilSlotStart } = require('../lib/jalaliTime');

function resolveLastMinuteSettings(pitch) {
  const d = LAST_MINUTE_DEFAULTS;
  return {
    enabled: pitch.lastMinuteEnabled !== false,
    discount60: pitch.lastMinuteDiscount60 ?? d.discountPercent60Min,
    discount30: pitch.lastMinuteDiscount30 ?? d.discountPercent30Min,
    maxPct: pitch.lastMinuteMaxPct ?? d.maxDiscountPercent,
  };
}

/**
 * @param {number} sitePrice قیمت نمایشی (قیمت مالک + کمیسیون)
 * @param {string} dateStr تاریخ جلالی
 * @param {string} slotTimeStr
 * @param {object} pitch
 * @param {Date} [now]
 */
function applyLastMinuteToSlot(sitePrice, dateStr, slotTimeStr, pitch, now = new Date()) {
  const settings = resolveLastMinuteSettings(pitch);
  if (!settings.enabled) {
    return { sitePrice, flashDeal: false, discountPercent: 0 };
  }

  const hoursUntil = hoursUntilSlotStart(dateStr, slotTimeStr, now);
  if (hoursUntil <= 0 || hoursUntil > 1) {
    return { sitePrice, flashDeal: false, discountPercent: 0 };
  }

  let discountPercent = 0;
  let urgency = null;
  if (hoursUntil <= 0.5) {
    discountPercent = settings.discount30;
    urgency = '30m';
  } else {
    discountPercent = settings.discount60;
    urgency = '60m';
  }

  discountPercent = Math.min(Math.max(0, discountPercent), settings.maxPct);
  if (discountPercent <= 0) {
    return { sitePrice, flashDeal: false, discountPercent: 0 };
  }

  const discounted = Math.round(sitePrice * (1 - discountPercent / 100));
  return {
    sitePrice: discounted,
    originalSitePrice: sitePrice,
    discountPercent,
    flashDeal: true,
    urgency,
    minutesUntil: Math.round(hoursUntil * 60),
    /** @deprecated use minutesUntil */
    hoursUntil: Math.round(hoursUntil * 60),
  };
}

module.exports = {
  resolveLastMinuteSettings,
  applyLastMinuteToSlot,
};
