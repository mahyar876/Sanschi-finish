const Pitch = require('../models/Pitch');
const Reservation = require('../models/Reservation');
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
  const reservationId = reservation._id || reservation.id;
  const existing = await Reservation.findById(reservationId);
  if (!existing) {
    throw new Error('رزرو پیدا نشد');
  }
  if (existing.paymentStatus === PAYMENT_STATUS.SUCCESSFUL) {
    return { already: true, reservation: existing };
  }
  if (
    existing.bookingStatus === BOOKING_STATUS.EXPIRED ||
    existing.bookingStatus === BOOKING_STATUS.CANCELLED_BY_USER ||
    existing.bookingStatus === BOOKING_STATUS.CANCELLED_BY_OWNER
  ) {
    throw new Error('این رزرو دیگر قابل پرداخت نیست');
  }

  const pitch = await Pitch.findById(existing.pitch).select('commissionAmount');
  const commission =
    existing.commissionAtBooking != null
      ? existing.commissionAtBooking
      : getPitchCommission(pitch);

  const paidAt = new Date();
  const transactionId = method === 'zarinpal' ? 'ZP-' + refId : 'TXN-' + refId;
  const siteCommission = commission;
  const pitchAmount = Math.max(0, existing.amount - commission);

  const updated = await Reservation.findOneAndUpdate(
    {
      _id: reservationId,
      paymentStatus: { $ne: PAYMENT_STATUS.SUCCESSFUL },
      bookingStatus: {
        $nin: [
          BOOKING_STATUS.EXPIRED,
          BOOKING_STATUS.CANCELLED_BY_USER,
          BOOKING_STATUS.CANCELLED_BY_OWNER,
        ],
      },
    },
    {
      $set: {
        status: 'paid',
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
        lockExpiresAt: null,
        siteCommission,
        pitchAmount,
        'payment.transactionId': transactionId,
        'payment.method': method,
        'payment.paidAt': paidAt,
      },
    },
    { new: true },
  );

  if (!updated) {
    const again = await Reservation.findById(reservationId);
    if (again?.paymentStatus === PAYMENT_STATUS.SUCCESSFUL) {
      return { already: true, reservation: again };
    }
    throw new Error('این رزرو دیگر قابل پرداخت نیست');
  }

  const daily = await DailyAvailability.findOne({
    pitch: updated.pitch,
    date: updated.date,
  });
  if (daily) {
    await confirmSlotBooked(
      daily,
      updated.slotIndex,
      updated.user,
      updated._id,
    );
  }

  await appendHistory(
    updated._id,
    'payment_confirmed',
    'پرداخت تأیید شد؛ رزرو قطعی شد',
    { refId, method },
  );

  const { notifyBookingConfirmed } = require('./notify');
  await notifyBookingConfirmed(updated);

  return { already: false, reservation: updated };
}

module.exports = { confirmReservationPayment };
