const Pitch = require('../models/Pitch');
const DailyAvailability = require('../models/DailyAvailability');
const {
  getPitchCommission,
  confirmSlotBooked,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  legacyStatusFromBooking,
} = require('./slotService');
const { appendHistory } = require('./bookingHistory');

/**
 * تأیید پرداخت موفق (idempotent) — بعد از verify زرین‌پال یا mock dev
 */
async function confirmReservationPayment(reservation, refId, method = 'zarinpal') {
  if (reservation.paymentStatus === PAYMENT_STATUS.SUCCESSFUL) {
    return { already: true, reservation };
  }
  if (
    reservation.bookingStatus === BOOKING_STATUS.EXPIRED ||
    reservation.bookingStatus === BOOKING_STATUS.CANCELLED_BY_USER ||
    reservation.bookingStatus === BOOKING_STATUS.CANCELLED_BY_OWNER
  ) {
    throw new Error('این رزرو دیگر قابل پرداخت نیست');
  }

  const pitch = await Pitch.findById(reservation.pitch).select('commissionAmount');
  const commission =
    reservation.commissionAtBooking != null
      ? reservation.commissionAtBooking
      : getPitchCommission(pitch);

  reservation.status = 'paid';
  reservation.bookingStatus = BOOKING_STATUS.CONFIRMED;
  reservation.paymentStatus = PAYMENT_STATUS.SUCCESSFUL;
  reservation.lockExpiresAt = null;
  reservation.payment = reservation.payment || {};
  reservation.payment.transactionId =
    method === 'zarinpal' ? 'ZP-' + refId : 'TXN-' + refId;
  reservation.payment.method = method;
  reservation.payment.paidAt = new Date();
  reservation.siteCommission = commission;
  reservation.pitchAmount = Math.max(0, reservation.amount - commission);
  await reservation.save();

  const daily = await DailyAvailability.findOne({
    pitch: reservation.pitch,
    date: reservation.date,
  });
  if (daily) {
    await confirmSlotBooked(
      daily,
      reservation.slotIndex,
      reservation.user,
      reservation._id,
    );
  }

  await appendHistory(
    reservation._id,
    'payment_confirmed',
    'پرداخت تأیید شد؛ رزرو قطعی شد',
    { refId, method },
  );

  const { notifyBookingConfirmed } = require('./notify');
  await notifyBookingConfirmed(reservation);

  return { already: false, reservation };
}

module.exports = { confirmReservationPayment };
