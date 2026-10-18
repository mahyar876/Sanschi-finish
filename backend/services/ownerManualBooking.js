const crypto = require('crypto');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const DailyAvailability = require('../models/DailyAvailability');
const {
  ensureDaily,
  computeTotals,
  normalizeSlot,
  expireStaleForDaily,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  SLOT_STATUS,
} = require('./slotService');
const { confirmReservationPayment } = require('./paymentConfirm');
const { appendHistory } = require('./bookingHistory');
const { isSlotPast } = require('../lib/jalaliTime');
const { isPhoneBlockedForPitch } = require('./ownerInsights');
const { invalidateInflightPrefix } = require('../lib/shortCache');

async function findOrCreateCustomerUser({ phone, name }) {
  let user = await User.findOne({ phone });
  if (user) return user;
  const safeName = String(name || 'مهمان').trim().slice(0, 80);
  const finalName = safeName.length >= 3 ? safeName : `مهمان ${phone.slice(-4)}`;
  const password = crypto.randomBytes(18).toString('base64url');
  user = await User.create({
    phone,
    name: finalName,
    password,
  });
  return user;
}

/**
 * رزرو تلفنی / حضوری — سانس فوراً تأیید می‌شود (owner_manual)
 */
async function createOwnerManualReservation(pitch, pitchId, body) {
  const { date, slotIndex, customerName, customerPhone, note, amountOverride } = body;
  const phone = String(customerPhone || '').trim();
  if (!/^09[0-9]{9}$/.test(phone)) {
    return { ok: false, status: 400, message: 'شماره موبایل مشتری معتبر نیست' };
  }
  if (await isPhoneBlockedForPitch(pitchId, phone)) {
    return { ok: false, status: 403, message: 'این مشتری برای مجموعه شما مسدود است' };
  }

  const slotIdx = parseInt(slotIndex, 10);
  if (Number.isNaN(slotIdx)) {
    return { ok: false, status: 400, message: 'سانس نامعتبر است' };
  }

  let daily = await ensureDaily(pitch, pitchId, date);
  await expireStaleForDaily(daily);
  daily = await DailyAvailability.findById(daily._id);

  const slot = daily.slots.find((s) => s.slotIndex === slotIdx);
  if (!slot) {
    return { ok: false, status: 404, message: 'سانس پیدا نشد' };
  }
  const norm = normalizeSlot(slot);
  if (isSlotPast(date, norm.time)) {
    return { ok: false, status: 400, message: 'این سانس گذشته است' };
  }
  if (norm.blocked) {
    return { ok: false, status: 400, message: 'سانس مسدود است' };
  }
  if (norm.taken || norm.slotStatus === SLOT_STATUS.BOOKED) {
    return { ok: false, status: 409, message: 'این سانس قبلاً رزرو شده است' };
  }

  const customer = await findOrCreateCustomerUser({
    phone,
    name: customerName,
  });

  const { basePrice, commission, totalAmount } = computeTotals(slot.price, pitch, 0);
  let amount = totalAmount;
  if (amountOverride != null && amountOverride !== '') {
    const n = parseInt(amountOverride, 10);
    if (Number.isFinite(n) && n >= 0) amount = n;
  }

  const ownerNote = safeOwnerNote(note);
  const fullNote = ownerNote
    ? `رزرو تلفنی/حضوری — ${ownerNote}`
    : 'رزرو تلفنی/حضوری';

  let reservation;
  try {
    reservation = await Reservation.create({
      user: customer._id,
      pitch: pitchId,
      slotIndex: slotIdx,
      slotTime: slot.time,
      date,
      playerCount: pitch.size || 10,
      note: fullNote,
      amount,
      basePrice,
      discountAmount: 0,
      commissionAtBooking: commission,
      status: 'pending',
      bookingStatus: BOOKING_STATUS.PENDING_PAYMENT,
      paymentStatus: PAYMENT_STATUS.PENDING,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return {
        ok: false,
        status: 409,
        message: 'این سانس همین الان رزرو شد',
      };
    }
    throw err;
  }

  await DailyAvailability.updateOne(
    {
      _id: daily._id,
      slots: {
        $elemMatch: {
          slotIndex: slotIdx,
          taken: { $ne: true },
        },
      },
    },
    { $set: { 'slots.$.reservationId': reservation._id } },
  );

  await appendHistory(reservation._id, 'owner_manual_created', fullNote);

  const ref = 'MANUAL-' + Date.now();
  const { reservation: confirmed } = await confirmReservationPayment(
    reservation,
    ref,
    'owner_manual',
  );

  invalidateInflightPrefix(`slots:${pitchId}:`);

  return {
    ok: true,
    reservation: confirmed,
    customer: { name: customer.name, phone: customer.phone },
  };
}

function safeOwnerNote(note) {
  return String(note || '').trim().slice(0, 400);
}

module.exports = { createOwnerManualReservation, findOrCreateCustomerUser };
