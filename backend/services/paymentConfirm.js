const Pitch = require('../models/Pitch');
const Reservation = require('../models/Reservation');
const DailyAvailability = require('../models/DailyAvailability');
const {
  getPitchCommission,
  confirmSlotBooked,
  assertNoSlotBookingConflict,
  releaseSlotForReservation,
  BOOKING_STATUS,
  PAYMENT_STATUS,
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
  const walletPart = existing.payment?.walletAmount || 0;
  const payMethod =
    method === 'zarinpal' && walletPart > 0
      ? 'mixed'
      : method === 'zarinpal'
        ? 'zarinpal'
        : method;
  const transactionId =
    payMethod === 'zarinpal' || payMethod === 'mixed'
      ? 'ZP-' + refId
      : 'TXN-' + refId;
  const siteCommission = commission;
  const pitchAmount = Math.max(0, existing.amount - commission);

  await assertNoSlotBookingConflict(
    existing.pitch,
    existing.date,
    existing.slotIndex,
    existing._id,
  );

  const daily = await DailyAvailability.findOne({
    pitch: existing.pitch,
    date: existing.date,
  });
  if (daily) {
    await confirmSlotBooked(
      daily,
      existing.slotIndex,
      existing.user,
      existing._id,
    );
  }

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
        'payment.method': payMethod,
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
    if (daily) {
      const stillUnpaid = await Reservation.findOne({
        _id: reservationId,
        paymentStatus: { $ne: PAYMENT_STATUS.SUCCESSFUL },
      }).select('_id');
      if (stillUnpaid) {
        await releaseSlotForReservation(daily._id, existing.slotIndex, existing._id);
      }
    }
    throw new Error('این رزرو دیگر قابل پرداخت نیست');
  }

  await appendHistory(
    updated._id,
    'payment_confirmed',
    'پرداخت تأیید شد؛ رزرو قطعی شد',
    { refId, method },
  );

  try {
    const { notifyBookingConfirmed } = require('./notify');
    await notifyBookingConfirmed(updated);
  } catch (notifyErr) {
    console.error('notifyBookingConfirmed failed:', notifyErr.message);
  }

  return { already: false, reservation: updated };
}

module.exports = { confirmReservationPayment };
