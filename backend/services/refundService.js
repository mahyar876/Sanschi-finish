const Reservation = require('../models/Reservation');
const {
  toGatewayAmount,
  refundPayment,
  MERCHANT_ID,
} = require('./zarinpalClient');
const { completeRefund } = require('./cancelReservation');
const { appendHistory } = require('./bookingHistory');
const { BOOKING_STATUS } = require('../lib/bookingConstants');
function extractRefId(reservation) {
  const tid = reservation.payment?.transactionId || '';
  if (tid.startsWith('ZP-')) return tid.slice(3);
  if (tid.startsWith('TXN-')) return null;
  return tid || null;
}

async function executeRefundForReservation(reservation) {
  if (reservation.bookingStatus !== BOOKING_STATUS.REFUND_PENDING) {
    throw new Error('رزرو در وضعیت انتظار بازپرداخت نیست');
  }
  const refundToman = reservation.refundAmount || 0;
  if (refundToman <= 0) {
    return completeRefund(reservation);
  }

  const refId = extractRefId(reservation);
  const gatewayAmount =
    reservation.payment?.gatewayAmount || toGatewayAmount(refundToman);

  if (refId && MERCHANT_ID) {
    try {
      await refundPayment(refId, gatewayAmount);
      reservation.payment = reservation.payment || {};
      reservation.payment.refundId = 'RF-' + refId;
      await reservation.save();
    } catch (err) {
      if (process.env.ALLOW_MOCK_REFUND !== 'true') {
        throw err;
      }
      console.warn('refund gateway failed, mock refund:', err.message);
    }
  } else if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_MOCK_REFUND !== 'true'
  ) {
    throw new Error('شناسه تراکنش درگاه برای بازپرداخت یافت نشد');
  }

  const updated = await completeRefund(reservation);
  await appendHistory(updated._id, 'refund_gateway', 'بازپرداخت از درگاه ثبت شد');
  return updated;
}

/** تلاش خودکار پس از لغو با مبلغ بازپرداخت */
async function tryAutoRefund(reservationId) {
  const r = await Reservation.findById(reservationId);
  if (!r || r.bookingStatus !== BOOKING_STATUS.REFUND_PENDING) return;
  if (process.env.AUTO_REFUND !== 'true') return;
  try {
    await executeRefundForReservation(r);
  } catch (e) {
    console.error('auto refund failed:', e.message);
  }
}

module.exports = {
  executeRefundForReservation,
  tryAutoRefund,
  extractRefId,
};
