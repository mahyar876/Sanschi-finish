const DailyAvailability = require('../models/DailyAvailability');
const Reservation = require('../models/Reservation');
const {
  LOCK_DURATION_MS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  SLOT_STATUS,
  legacyStatusFromBooking,
} = require('../lib/bookingConstants');
const { appendHistory } = require('./bookingHistory');

function getPitchCommission(pitch) {
  return (pitch && pitch.commissionAmount) || 0;
}

function computeTotals(slotPrice, pitch, discountAmount = 0) {
  const commission = getPitchCommission(pitch);
  const basePrice = slotPrice;
  const discount = Math.max(0, Math.min(discountAmount || 0, basePrice));
  const totalAmount = Math.max(0, basePrice - discount + commission);
  return { basePrice, discount, commission, totalAmount };
}

async function ensureDaily(pitch, pitchId, date) {
  let daily = await DailyAvailability.findOne({ pitch: pitchId, date });
  if (!daily) {
    const slots = pitch.slots.map((s, i) => ({
      slotIndex: i,
      time: s.time,
      price: s.price,
      taken: s.taken || false,
      takenBy: s.takenBy || null,
      reservationId: null,
      slotStatus: s.taken ? SLOT_STATUS.BOOKED : SLOT_STATUS.FREE,
      lockUntil: null,
      lockedBy: null,
      blocked: false,
    }));
    daily = await DailyAvailability.create({ pitch: pitchId, date, slots });
  }
  return daily;
}

/** همگام‌سازی slotStatus با taken و قفل منقضی */
function normalizeSlot(slot, now = new Date()) {
  const s = slot.toObject ? slot.toObject() : { ...slot };
  if (s.blocked) {
    s.slotStatus = SLOT_STATUS.BLOCKED;
    return s;
  }
  if (s.lockUntil && new Date(s.lockUntil) <= now) {
    if (s.slotStatus === SLOT_STATUS.LOCKED && !s.taken) {
      s.slotStatus = SLOT_STATUS.FREE;
      s.lockUntil = null;
      s.lockedBy = null;
      s.reservationId = null;
    }
  }
  if (s.taken && s.slotStatus !== SLOT_STATUS.BLOCKED) {
    s.slotStatus = SLOT_STATUS.BOOKED;
  }
  if (!s.slotStatus) {
    s.slotStatus = s.taken ? SLOT_STATUS.BOOKED : SLOT_STATUS.FREE;
  }
  return s;
}

async function persistSlotNormalization(daily, slotIndex, normalized) {
  const idx = daily.slots.findIndex((s) => s.slotIndex === slotIndex);
  if (idx === -1) return;
  const slot = daily.slots[idx];
  slot.slotStatus = normalized.slotStatus;
  slot.lockUntil = normalized.lockUntil;
  slot.lockedBy = normalized.lockedBy;
  slot.reservationId = normalized.reservationId;
  slot.taken = normalized.taken ?? slot.taken;
  slot.takenBy = normalized.takenBy ?? slot.takenBy;
  await daily.save();
}

async function expireReservationAndSlot(reservation, daily, slotIndex) {
  reservation.bookingStatus = BOOKING_STATUS.EXPIRED;
  reservation.paymentStatus = PAYMENT_STATUS.FAILED;
  reservation.status = legacyStatusFromBooking(BOOKING_STATUS.EXPIRED);
  reservation.lockExpiresAt = null;
  await reservation.save();
  await appendHistory(
    reservation._id,
    'expired',
    'زمان پرداخت به پایان رسید؛ سانس آزاد شد',
  );

  const slot = daily.slots.find((s) => s.slotIndex === slotIndex);
  if (slot) {
    slot.taken = false;
    slot.takenBy = null;
    slot.reservationId = null;
    slot.slotStatus = SLOT_STATUS.FREE;
    slot.lockUntil = null;
    slot.lockedBy = null;
    await daily.save();
  }
}

/** رزروهای pending_payment منقضی + قفل سانس */
async function expireStaleForDaily(daily) {
  const now = new Date();
  for (const slot of daily.slots) {
    if (
      slot.lockUntil &&
      new Date(slot.lockUntil) <= now &&
      slot.slotStatus === SLOT_STATUS.LOCKED &&
      !slot.taken
    ) {
      const resId = slot.reservationId;
      slot.slotStatus = SLOT_STATUS.FREE;
      slot.lockUntil = null;
      slot.lockedBy = null;
      slot.reservationId = null;
      await daily.save();
      if (resId) {
        const r = await Reservation.findById(resId);
        if (
          r &&
          r.bookingStatus === BOOKING_STATUS.PENDING_PAYMENT &&
          r.paymentStatus !== PAYMENT_STATUS.SUCCESSFUL
        ) {
          r.bookingStatus = BOOKING_STATUS.EXPIRED;
          r.paymentStatus = PAYMENT_STATUS.FAILED;
          r.status = legacyStatusFromBooking(BOOKING_STATUS.EXPIRED);
          r.lockExpiresAt = null;
          await r.save();
          await appendHistory(
            r._id,
            'expired',
            'زمان پرداخت به پایان رسید؛ سانس آزاد شد',
          );
        }
      }
    }
  }
}

async function tryAcquireLock({ pitch, pitchId, date, slotIndex, userId }) {
  const daily = await ensureDaily(pitch, pitchId, date);
  await expireStaleForDaily(daily);

  const slot = daily.slots.find((s) => s.slotIndex === slotIndex);
  if (!slot) {
    return { ok: false, code: 400, message: 'سانس نامعتبر است' };
  }

  const now = new Date();
  const norm = normalizeSlot(slot, now);
  if (norm.blocked || norm.slotStatus === SLOT_STATUS.BLOCKED) {
    return { ok: false, code: 400, message: 'این سانس غیرفعال است' };
  }
  if (norm.slotStatus === SLOT_STATUS.BOOKED || norm.taken) {
    return {
      ok: false,
      code: 409,
      message:
        'این سانس توسط کاربر دیگری رزرو شده است. لطفاً سانس دیگری انتخاب کنید.',
    };
  }
  if (
    norm.slotStatus === SLOT_STATUS.LOCKED &&
    norm.lockedBy &&
    norm.lockedBy.toString() !== userId.toString()
  ) {
    return {
      ok: false,
      code: 409,
      message:
        'این سانس همین الان توسط کاربر دیگری در حال رزرو است. لطفاً سانس دیگری انتخاب کنید.',
    };
  }

  const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS);
  const claim = await DailyAvailability.updateOne(
    {
      _id: daily._id,
      slots: {
        $elemMatch: {
          slotIndex,
          blocked: { $ne: true },
          taken: false,
          $or: [
            { slotStatus: SLOT_STATUS.FREE },
            { slotStatus: { $exists: false } },
            { slotStatus: SLOT_STATUS.LOCKED, lockedBy: userId },
          ],
        },
      },
    },
    {
      $set: {
        'slots.$.slotStatus': SLOT_STATUS.LOCKED,
        'slots.$.lockUntil': lockUntil,
        'slots.$.lockedBy': userId,
        'slots.$.taken': false,
      },
    },
  );

  if (!claim.modifiedCount) {
    return {
      ok: false,
      code: 409,
      message:
        'این سانس همین الان توسط کاربر دیگری رزرو شد. لطفاً سانس یا تاریخ دیگری انتخاب کنید.',
    };
  }

  const refreshed = await DailyAvailability.findById(daily._id);
  const lockedSlot = refreshed.slots.find((s) => s.slotIndex === slotIndex);
  return { ok: true, daily: refreshed, slot: lockedSlot, lockUntil };
}

function releaseSlotOnDaily(daily, slotIndex) {
  const slot = daily.slots.find((s) => s.slotIndex === slotIndex);
  if (!slot) return;
  slot.taken = false;
  slot.takenBy = null;
  slot.reservationId = null;
  slot.slotStatus = SLOT_STATUS.FREE;
  slot.lockUntil = null;
  slot.lockedBy = null;
}

async function confirmSlotBooked(daily, slotIndex, userId, reservationId) {
  const claim = await DailyAvailability.updateOne(
    {
      _id: daily._id,
      slots: {
        $elemMatch: {
          slotIndex,
          reservationId: reservationId,
        },
      },
    },
    {
      $set: {
        'slots.$.slotStatus': SLOT_STATUS.BOOKED,
        'slots.$.taken': true,
        'slots.$.takenBy': userId,
        'slots.$.lockUntil': null,
        'slots.$.lockedBy': null,
      },
    },
  );
  if (!claim.modifiedCount) {
    const slot = daily.slots.find((s) => s.slotIndex === slotIndex);
    if (slot) {
      slot.slotStatus = SLOT_STATUS.BOOKED;
      slot.taken = true;
      slot.takenBy = userId;
      slot.reservationId = reservationId;
      slot.lockUntil = null;
      slot.lockedBy = null;
      await daily.save();
    }
  }
}

module.exports = {
  getPitchCommission,
  computeTotals,
  ensureDaily,
  normalizeSlot,
  expireStaleForDaily,
  tryAcquireLock,
  releaseSlotOnDaily,
  confirmSlotBooked,
  expireReservationAndSlot,
  appendHistory,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  SLOT_STATUS,
  legacyStatusFromBooking,
  LOCK_DURATION_MS,
};
