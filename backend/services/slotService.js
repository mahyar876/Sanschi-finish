const DailyAvailability = require('../models/DailyAvailability');
const Reservation = require('../models/Reservation');
const {
  LOCK_DURATION_MS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  SLOT_STATUS,
  ACTIVE_SLOT_BOOKING_STATUSES,
  legacyStatusFromBooking,
} = require('../lib/bookingConstants');

function parseSlotIndex(slotIndex) {
  const idx = parseInt(slotIndex, 10);
  return Number.isNaN(idx) ? null : idx;
}
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
  if (daily) return daily;

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

  try {
    daily = await DailyAvailability.create({ pitch: pitchId, date, slots });
    return daily;
  } catch (err) {
    if (err && err.code === 11000) {
      daily = await DailyAvailability.findOne({ pitch: pitchId, date });
      if (daily) return daily;
    }
    throw err;
  }
}

/** همگام‌سازی slotStatus با taken و قفل منقضی */
function normalizeSlot(slot, now = new Date()) {
  const s = slot.toObject ? slot.toObject() : { ...slot };
  if (s.blocked) {
    s.slotStatus = SLOT_STATUS.BLOCKED;
    return s;
  }
  if (
    s.lockUntil &&
    new Date(s.lockUntil) > now &&
    s.lockedBy &&
    !s.taken &&
    s.slotStatus !== SLOT_STATUS.BOOKED
  ) {
    s.slotStatus = SLOT_STATUS.LOCKED;
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

  await releaseSlotForReservation(daily._id, slotIndex, reservation._id);
}

/** رزروهای pending_payment منقضی + قفل سانس — فقط همان سانس، بدون save کل سند */
async function expireStaleForDaily(daily) {
  const now = new Date();
  if (!daily?.slots?.length) return;
  for (const slot of daily.slots) {
    if (
      slot.lockUntil &&
      new Date(slot.lockUntil) <= now &&
      slot.slotStatus === SLOT_STATUS.LOCKED &&
      !slot.taken
    ) {
      const resId = slot.reservationId;
      const released = await DailyAvailability.updateOne(
        {
          _id: daily._id,
          slots: {
            $elemMatch: {
              slotIndex: slot.slotIndex,
              taken: { $ne: true },
              slotStatus: SLOT_STATUS.LOCKED,
              lockUntil: { $lte: now },
            },
          },
        },
        {
          $set: {
            'slots.$.slotStatus': SLOT_STATUS.FREE,
            'slots.$.taken': false,
            'slots.$.takenBy': null,
            'slots.$.reservationId': null,
            'slots.$.lockUntil': null,
            'slots.$.lockedBy': null,
          },
        },
      );
      if (!released.modifiedCount) continue;
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
  const slotIdx = parseSlotIndex(slotIndex);
  if (slotIdx == null) {
    return { ok: false, code: 400, message: 'سانس نامعتبر است' };
  }

  const daily = await ensureDaily(pitch, pitchId, date);
  await expireStaleForDaily(daily);

  const refreshedDaily = await DailyAvailability.findById(daily._id);
  const slot = refreshedDaily.slots.find((s) => s.slotIndex === slotIdx);
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
  const lockHeldByOther =
    norm.lockUntil &&
    new Date(norm.lockUntil) > now &&
    norm.lockedBy &&
    norm.lockedBy.toString() !== userId.toString();
  if (
    lockHeldByOther ||
    (norm.slotStatus === SLOT_STATUS.LOCKED &&
      norm.lockedBy &&
      norm.lockedBy.toString() !== userId.toString())
  ) {
    return {
      ok: false,
      code: 409,
      message:
        'این سانس همین الان توسط کاربر دیگری در حال رزرو است. لطفاً سانس دیگری انتخاب کنید.',
    };
  }

  await releaseOtherOwnedLocks(refreshedDaily._id, userId, slotIdx, now);

  const existingActive = await Reservation.findOne({
    pitch: pitchId,
    date,
    slotIndex: slotIdx,
    bookingStatus: { $in: ACTIVE_SLOT_BOOKING_STATUSES },
  });
  if (
    existingActive &&
    existingActive.user.toString() !== userId.toString()
  ) {
    return {
      ok: false,
      code: 409,
      message:
        'این سانس توسط کاربر دیگری رزرو شده است. لطفاً سانس دیگری انتخاب کنید.',
    };
  }

  const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS);
  const claim = await DailyAvailability.updateOne(
    {
      _id: refreshedDaily._id,
      slots: {
        $elemMatch: {
          slotIndex: slotIdx,
          blocked: { $ne: true },
          taken: false,
          slotStatus: { $ne: SLOT_STATUS.BOOKED },
          $nor: [
            {
              lockUntil: { $gt: now },
              lockedBy: { $exists: true, $nin: [null, userId] },
            },
          ],
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

  const refreshed = await DailyAvailability.findById(refreshedDaily._id);
  const lockedSlot = refreshed.slots.find((s) => s.slotIndex === slotIdx);
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

const SLOT_FREE_SET = {
  'slots.$.slotStatus': SLOT_STATUS.FREE,
  'slots.$.taken': false,
  'slots.$.takenBy': null,
  'slots.$.reservationId': null,
  'slots.$.lockUntil': null,
  'slots.$.lockedBy': null,
};

/** قبل از قفل جدید، بقیهٔ قفل‌های موقت همین کاربر در همان روز را آزاد می‌کند */
async function releaseOtherOwnedLocks(dailyId, userId, keepSlotIndex, now = new Date()) {
  const daily = await DailyAvailability.findById(dailyId);
  if (!daily || !userId) return;
  const uid = userId.toString();
  const keep = parseSlotIndex(keepSlotIndex);
  for (const slot of daily.slots) {
    if (slot.slotIndex === keep) continue;
    const norm = normalizeSlot(slot, now);
    if (
      norm.lockedBy &&
      norm.lockedBy.toString() === uid &&
      norm.lockUntil &&
      new Date(norm.lockUntil) > now &&
      !norm.taken &&
      norm.slotStatus !== SLOT_STATUS.BOOKED
    ) {
      await releaseOwnedLock(dailyId, slot.slotIndex, userId);
    }
  }
}

/** فقط قفل همین کاربر را برمی‌دارد — سند روزانه را کامل save نمی‌کند */
async function releaseOwnedLock(dailyId, slotIndex, userId) {
  const slotIdx = parseSlotIndex(slotIndex);
  if (slotIdx == null || !dailyId || !userId) return { released: false };
  const result = await DailyAvailability.updateOne(
    {
      _id: dailyId,
      slots: {
        $elemMatch: {
          slotIndex: slotIdx,
          taken: { $ne: true },
          slotStatus: { $nin: [SLOT_STATUS.BOOKED, SLOT_STATUS.BLOCKED] },
          lockedBy: userId,
        },
      },
    },
    { $set: SLOT_FREE_SET },
  );
  return { released: result.modifiedCount > 0 };
}

/** آزاد کردن سانسی که به همین رزرو وصل است، بدون دست زدن به سانس‌های دیگر */
async function releaseSlotForReservation(dailyId, slotIndex, reservationId) {
  const slotIdx = parseSlotIndex(slotIndex);
  if (slotIdx == null || !dailyId || !reservationId) return { released: false };
  const result = await DailyAvailability.updateOne(
    {
      _id: dailyId,
      slots: {
        $elemMatch: {
          slotIndex: slotIdx,
          reservationId,
          slotStatus: { $ne: SLOT_STATUS.BLOCKED },
        },
      },
    },
    { $set: SLOT_FREE_SET },
  );
  return { released: result.modifiedCount > 0 };
}

/** قبل از تأیید پرداخت — رزرو دیگری نباید همان سانس را اشغال کرده باشد */
async function assertNoSlotBookingConflict(pitchId, date, slotIndex, reservationId) {
  const slotIdx = parseSlotIndex(slotIndex);
  if (slotIdx == null) return;

  const conflict = await Reservation.findOne({
    _id: { $ne: reservationId },
    pitch: pitchId,
    date,
    slotIndex: slotIdx,
    bookingStatus: { $in: ACTIVE_SLOT_BOOKING_STATUSES },
  }).select('_id bookingStatus paymentStatus');

  if (conflict) {
    const err = new Error(
      'این سانس قبلاً توسط کاربر دیگری رزرو شده است. در صورت کسر وجه با پشتیبانی تماس بگیرید.',
    );
    err.code = 'SLOT_CONFLICT';
    err.statusCode = 409;
    throw err;
  }
}

async function confirmSlotBooked(daily, slotIndex, userId, reservationId) {
  const slotIdx = parseSlotIndex(slotIndex);
  if (slotIdx == null) {
    const err = new Error('سانس نامعتبر است');
    err.statusCode = 400;
    throw err;
  }

  const alreadyOurs = await DailyAvailability.findOne({
    _id: daily._id,
    slots: {
      $elemMatch: {
        slotIndex: slotIdx,
        taken: true,
        reservationId,
        slotStatus: SLOT_STATUS.BOOKED,
      },
    },
  }).select('_id');
  if (alreadyOurs) return;

  await assertNoSlotBookingConflict(daily.pitch, daily.date, slotIdx, reservationId);

  const claim = await DailyAvailability.updateOne(
    {
      _id: daily._id,
      slots: {
        $elemMatch: {
          slotIndex: slotIdx,
          taken: { $ne: true },
          slotStatus: { $nin: [SLOT_STATUS.BOOKED, SLOT_STATUS.BLOCKED] },
          $or: [
            { reservationId },
            { reservationId: null },
            { reservationId: { $exists: false } },
          ],
        },
      },
    },
    {
      $set: {
        'slots.$.slotStatus': SLOT_STATUS.BOOKED,
        'slots.$.taken': true,
        'slots.$.takenBy': userId,
        'slots.$.reservationId': reservationId,
        'slots.$.lockUntil': null,
        'slots.$.lockedBy': null,
      },
    },
  );
  if (!claim.modifiedCount) {
    const err = new Error(
      'این سانس قبلاً توسط کاربر دیگری رزرو شده است. در صورت کسر وجه با پشتیبانی تماس بگیرید.',
    );
    err.code = 'SLOT_CONFLICT';
    err.statusCode = 409;
    throw err;
  }
}

module.exports = {
  getPitchCommission,
  computeTotals,
  ensureDaily,
  normalizeSlot,
  parseSlotIndex,
  expireStaleForDaily,
  tryAcquireLock,
  assertNoSlotBookingConflict,
  releaseSlotOnDaily,
  releaseOwnedLock,
  releaseSlotForReservation,
  confirmSlotBooked,
  expireReservationAndSlot,
  appendHistory,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  SLOT_STATUS,
  ACTIVE_SLOT_BOOKING_STATUSES,
  legacyStatusFromBooking,
  LOCK_DURATION_MS,
};
