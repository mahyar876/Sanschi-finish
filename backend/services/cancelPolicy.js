const { hoursUntilSlotStart } = require('../lib/jalaliTime');

/**
 * سیاست کنسلی سانس‌چی (قابل تنظیم با env)
 * بازپرداخت فقط روی سهم قابل‌برگشت مشتری (pitchAmount) — کمیسیون سایت برنمی‌گردد.
 */
function getCancelPolicy() {
  return {
    fullRefundHours: parseInt(process.env.CANCEL_FULL_REFUND_HOURS || '48', 10),
    partialRefundHours: parseInt(process.env.CANCEL_PARTIAL_REFUND_HOURS || '24', 10),
    partialRefundPercent: parseInt(process.env.CANCEL_PARTIAL_REFUND_PCT || '50', 10),
  };
}

function describeCancelPolicy() {
  const p = getCancelPolicy();
  return [
    `بیش از ${p.fullRefundHours} ساعت قبل از سانس: بازپرداخت کامل سهم زمین`,
    `بین ${p.partialRefundHours} تا ${p.fullRefundHours} ساعت: ${p.partialRefundPercent}٪ سهم زمین`,
    `کمتر از ${p.partialRefundHours} ساعت: بدون بازپرداخت سهم زمین (کمیسیون سانس‌چی غیرقابل برگشت است)`,
  ];
}

function computeRefundForReservation(reservation, now = new Date()) {
  const policy = getCancelPolicy();
  const refundableBase =
    reservation.pitchAmount != null
      ? reservation.pitchAmount
      : Math.max(0, reservation.amount - (reservation.siteCommission || 0));

  if (reservation.paymentStatus !== 'successful') {
    return {
      allowed: true,
      refundAmount: 0,
      refundPercent: 0,
      reason: 'پرداخت انجام نشده',
    };
  }

  const hours = hoursUntilSlotStart(reservation.date, reservation.slotTime, now);
  if (hours >= policy.fullRefundHours) {
    return {
      allowed: true,
      refundAmount: refundableBase,
      refundPercent: 100,
      reason: 'بازپرداخت کامل طبق قوانین',
    };
  }
  if (hours >= policy.partialRefundHours) {
    const refundAmount = Math.round(
      (refundableBase * policy.partialRefundPercent) / 100,
    );
    return {
      allowed: true,
      refundAmount,
      refundPercent: policy.partialRefundPercent,
      reason: 'بازپرداخت جزئی طبق قوانین',
    };
  }
  return {
    allowed: false,
    refundAmount: 0,
    refundPercent: 0,
    reason: 'کمتر از مهلت لغو؛ بازپرداختی برای سهم زمین وجود ندارد',
  };
}

module.exports = {
  getCancelPolicy,
  describeCancelPolicy,
  computeRefundForReservation,
};
