const DailyAvailability = require('../models/DailyAvailability');
const Reservation = require('../models/Reservation');
const {
  releaseSlotForReservation,
  releaseOwnedLock,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  legacyStatusFromBooking,
} = require('./slotService');
const { computeRefundForReservation } = require('./cancelPolicy');
const { appendHistory } = require('./bookingHistory');
const { notifyCancelled } = require('./notify');

async function cancelReservationByUser(reservation, now = new Date()) {
  if (
    reservation.bookingStatus === BOOKING_STATUS.CANCELLED_BY_USER ||
    reservation.bookingStatus === BOOKING_STATUS.CANCELLED_BY_OWNER ||
    reservation.bookingStatus === BOOKING_STATUS.EXPIRED
  ) {
    throw new Error('این رزرو قبلاً لغو شده است');
  }

  if (reservation.bookingStatus === BOOKING_STATUS.PENDING_PAYMENT) {
    const daily = await DailyAvailability.findOne({
      pitch: reservation.pitch,
      date: reservation.date,
    });
    if (daily) {
      await releaseSlotForReservation(daily._id, reservation.slotIndex, reservation._id);
      await releaseOwnedLock(daily._id, reservation.slotIndex, reservation.user);
    }
    reservation.status = 'cancelled';
    reservation.bookingStatus = BOOKING_STATUS.CANCELLED_BY_USER;
    reservation.paymentStatus = PAYMENT_STATUS.FAILED;
    reservation.cancelledBy = 'user';
    reservation.lockExpiresAt = null;
    await reservation.save();
    await appendHistory(reservation._id, 'cancelled_by_user', 'لغو قبل از پرداخت');
    return { reservation, refundAmount: 0 };
  }

  const refund = computeRefundForReservation(reservation, now);
  if (!refund.allowed && reservation.paymentStatus === PAYMENT_STATUS.SUCCESSFUL) {
    throw new Error(refund.reason);
  }

  const daily = await DailyAvailability.findOne({
    pitch: reservation.pitch,
    date: reservation.date,
  });
  if (daily) {
    await releaseSlotForReservation(daily._id, reservation.slotIndex, reservation._id);
  }

  reservation.status = legacyStatusFromBooking(
    refund.refundAmount > 0
      ? BOOKING_STATUS.REFUND_PENDING
      : BOOKING_STATUS.CANCELLED_BY_USER,
  );
  reservation.bookingStatus =
    refund.refundAmount > 0
      ? BOOKING_STATUS.REFUND_PENDING
      : BOOKING_STATUS.CANCELLED_BY_USER;
  reservation.cancelledBy = 'user';
  reservation.refundAmount = refund.refundAmount;
  reservation.refundReason = refund.reason;
  if (refund.refundAmount === 0 && reservation.paymentStatus === PAYMENT_STATUS.SUCCESSFUL) {
    reservation.paymentStatus = PAYMENT_STATUS.SUCCESSFUL;
  }
  await reservation.save();
  await appendHistory(
    reservation._id,
    'cancelled_by_user',
    refund.reason + (refund.refundAmount ? ` · مبلغ بازپرداخت: ${refund.refundAmount}` : ''),
  );
  await notifyCancelled(reservation, 'user');
  const {
    tryAutoRefund,
    executeRefundForReservation,
  } = require('./refundService');
  const { reservationPaidViaWallet } = require('./walletService');

  let refundedToWallet = false;
  if (
    reservation.bookingStatus === BOOKING_STATUS.REFUND_PENDING &&
    refund.refundAmount > 0 &&
    reservationPaidViaWallet(reservation)
  ) {
    const fresh = await executeRefundForReservation(
      await Reservation.findById(reservation._id),
    );
    refundedToWallet = true;
    return {
      reservation: fresh,
      refundAmount: refund.refundAmount,
      refund,
      refundedToWallet,
    };
  }

  if (reservation.bookingStatus === BOOKING_STATUS.REFUND_PENDING) {
    setImmediate(() => tryAutoRefund(reservation._id));
  }
  return { reservation, refundAmount: refund.refundAmount, refund, refundedToWallet };
}

async function completeRefund(reservation) {
  if (reservation.bookingStatus !== BOOKING_STATUS.REFUND_PENDING) {
    throw new Error('این رزرو در انتظار بازپرداخت نیست');
  }
  reservation.bookingStatus = BOOKING_STATUS.REFUNDED;
  reservation.paymentStatus = PAYMENT_STATUS.REFUNDED;
  reservation.status = legacyStatusFromBooking(BOOKING_STATUS.REFUNDED);
  reservation.refundCompletedAt = new Date();
  await reservation.save();
  await appendHistory(reservation._id, 'refund_completed', 'بازپرداخت انجام شد');
  return reservation;
}

module.exports = { cancelReservationByUser, completeRefund };
