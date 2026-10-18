const Reservation = require('../models/Reservation');
const Pitch = require('../models/Pitch');
const PitchCustomerTag = require('../models/PitchCustomerTag');
const DailyAvailability = require('../models/DailyAvailability');
const {
  ensureDaily,
  normalizeSlot,
  expireStaleForDaily,
} = require('./slotService');
const { BOOKING_STATUS, PAYMENT_STATUS, SLOT_STATUS } = require('../lib/bookingConstants');
const {
  todayJalaliApiDate,
  isSlotPast,
  hoursUntilSlotStart,
  toAsciiDigits,
} = require('../lib/jalaliTime');

function jalaliMonthKey(dateStr) {
  const ascii = toAsciiDigits(String(dateStr || ''));
  const parts = ascii.split('/');
  if (parts.length < 2) return '';
  return `${parts[0]}/${parts[1]}`;
}

const PAID_BOOKING = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.REFUND_PENDING,
];

function ownerShare(r) {
  if (r.pitchAmount != null) return r.pitchAmount;
  const comm = r.siteCommission || 0;
  return Math.max(0, (r.amount || 0) - comm);
}

function compareJalaliDates(a, b) {
  const norm = (s) =>
    toAsciiDigits(String(s || ''))
      .split('/')
      .map((x) => parseInt(x, 10));
  const [ay, am, ad] = norm(a);
  const [by, bm, bd] = norm(b);
  if (ay !== by) return ay - by;
  if (am !== bm) return am - bm;
  return ad - bd;
}

async function getDashboardStats(pitchId) {
  const today = todayJalaliApiDate();
  const pitch = await Pitch.findById(pitchId).select('name slots lastMinuteEnabled');
  if (!pitch) return null;

  const reservations = await Reservation.find({
    pitch: pitchId,
    isArchived: { $ne: true },
    bookingStatus: { $nin: [BOOKING_STATUS.EXPIRED, BOOKING_STATUS.CANCELLED_BY_USER, BOOKING_STATUS.CANCELLED_BY_OWNER, BOOKING_STATUS.REFUNDED] },
  }).select('date status bookingStatus paymentStatus amount pitchAmount siteCommission slotTime');

  let todayCount = 0;
  let futureCount = 0;
  let revenueToday = 0;
  let revenueMonth = 0;
  let pending = 0;
  const monthKey = jalaliMonthKey(today);

  for (const r of reservations) {
    const paid =
      r.paymentStatus === PAYMENT_STATUS.SUCCESSFUL ||
      PAID_BOOKING.includes(r.bookingStatus) ||
      r.status === 'paid';
    if (r.bookingStatus === BOOKING_STATUS.PENDING_PAYMENT || r.status === 'pending') {
      pending += 1;
    }
    const cmpToday = compareJalaliDates(r.date, today);
    if (cmpToday === 0) todayCount += 1;
    if (cmpToday >= 0 && r.status !== 'cancelled') futureCount += 1;
    if (paid) {
      const share = ownerShare(r);
      if (jalaliMonthKey(r.date) === monthKey) revenueMonth += share;
      if (cmpToday === 0) revenueToday += share;
    }
  }

  let emptySlots = 0;
  let emptySoon = 0;
  const daily = await ensureDaily(pitch, pitchId, today);
  await expireStaleForDaily(daily);
  const fresh = await DailyAvailability.findById(daily._id);
  const now = new Date();
  for (const s of fresh.slots) {
    const norm = normalizeSlot(s, now);
    if (isSlotPast(today, norm.time, now)) continue;
    const bookable =
      !norm.blocked && !norm.taken && norm.slotStatus !== SLOT_STATUS.BOOKED;
    if (bookable) {
      emptySlots += 1;
      const h = hoursUntilSlotStart(today, norm.time, now);
      if (h > 0 && h <= 24) emptySoon += 1;
    }
  }

  return {
    pitchName: pitch.name,
    today,
    todayCount,
    futureCount,
    revenueToday,
    revenueMonth,
    emptySlots,
    emptySoon,
    pending,
    lastMinuteEnabled: pitch.lastMinuteEnabled !== false,
  };
}

async function getCustomerList(pitchId) {
  const reservations = await Reservation.find({
    pitch: pitchId,
    paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
  })
    .populate('user', 'name phone')
    .sort({ createdAt: -1 })
    .limit(500);

  const tags = await PitchCustomerTag.find({ pitch: pitchId });
  const tagByPhone = new Map(tags.map((t) => [t.phone, t]));

  const map = new Map();
  for (const r of reservations) {
    const phone = r.user?.phone;
    if (!phone) continue;
    const key = phone;
    const cur = map.get(key) || {
      userId: r.user._id?.toString(),
      name: r.user.name || '—',
      phone,
      count: 0,
      total: 0,
      lastDate: r.date,
      tag: 'none',
      note: '',
    };
    cur.count += 1;
    cur.total += ownerShare(r);
    if (compareJalaliDates(r.date, cur.lastDate) > 0) cur.lastDate = r.date;
    map.set(key, cur);
  }

  for (const [phone, t] of tagByPhone) {
    const cur = map.get(phone);
    if (cur) {
      cur.tag = t.tag;
      cur.note = t.note || '';
    } else if (t.tag !== 'none') {
      map.set(phone, {
        userId: null,
        name: '—',
        phone,
        count: 0,
        total: 0,
        lastDate: '—',
        tag: t.tag,
        note: t.note || '',
      });
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count);
}

async function setCustomerTag(pitchId, phone, { tag, note }) {
  const normalized = String(phone || '').trim();
  if (!/^09[0-9]{9}$/.test(normalized)) {
    return { ok: false, message: 'شماره موبایل معتبر نیست' };
  }
  const allowed = ['vip', 'blocked', 'none'];
  const t = allowed.includes(tag) ? tag : 'none';
  if (t === 'none') {
    await PitchCustomerTag.deleteOne({ pitch: pitchId, phone: normalized });
    return { ok: true, tag: 'none', note: '' };
  }
  const doc = await PitchCustomerTag.findOneAndUpdate(
    { pitch: pitchId, phone: normalized },
    { tag: t, note: String(note || '').trim().slice(0, 300), updatedAt: new Date() },
    { upsert: true, new: true },
  );
  return { ok: true, tag: doc.tag, note: doc.note };
}

async function isPhoneBlockedForPitch(pitchId, phone) {
  if (!phone) return false;
  const row = await PitchCustomerTag.findOne({
    pitch: pitchId,
    phone: String(phone).trim(),
    tag: 'blocked',
  }).select('_id');
  return !!row;
}

async function getReportsSummary(pitchId) {
  const reservations = await Reservation.find({
    pitch: pitchId,
    paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
  }).select('date slotTime amount pitchAmount siteCommission');

  const bySlot = new Map();
  const byWeekday = new Map();
  const weekdayFa = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

  for (const r of reservations) {
    const slotKey = r.slotTime || '—';
    const slotCur = bySlot.get(slotKey) || { slotTime: slotKey, count: 0, revenue: 0 };
    slotCur.count += 1;
    slotCur.revenue += ownerShare(r);
    bySlot.set(slotKey, slotCur);

    try {
      const { dayStartFromJalali } = require('../lib/jalaliTime');
      const d = dayStartFromJalali(r.date);
      const wd = weekdayFa[d.getDay()];
      const wCur = byWeekday.get(wd) || { weekday: wd, count: 0, revenue: 0 };
      wCur.count += 1;
      wCur.revenue += ownerShare(r);
      byWeekday.set(wd, wCur);
    } catch {
      /* ignore bad dates */
    }
  }

  const topSlots = [...bySlot.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  const byWeekdayList = [...byWeekday.values()].sort((a, b) => b.count - a.count);

  return {
    paidCount: reservations.length,
    totalRevenue: reservations.reduce((s, r) => s + ownerShare(r), 0),
    topSlots,
    byWeekday: byWeekdayList,
  };
}

async function getOwnerDailySlots(pitch, pitchId, dateStr) {
  let daily = await ensureDaily(pitch, pitchId, dateStr);
  await expireStaleForDaily(daily);
  daily = await DailyAvailability.findById(daily._id);

  const reservationIds = daily.slots
    .map((s) => s.reservationId)
    .filter(Boolean);
  const reservations = await Reservation.find({ _id: { $in: reservationIds } })
    .populate('user', 'name phone')
    .select('code bookingStatus status user slotIndex');
  const resById = new Map(reservations.map((r) => [r._id.toString(), r]));

  const now = new Date();
  const slots = daily.slots.map((s) => {
    const norm = normalizeSlot(s, now);
    let state = 'free';
    if (norm.blocked) state = 'blocked';
    else if (norm.taken || norm.slotStatus === SLOT_STATUS.BOOKED) state = 'reserved';
    else if (norm.slotStatus === SLOT_STATUS.LOCKED) state = 'pending';
    else if (isSlotPast(dateStr, norm.time, now)) state = 'past';

    let reservation = null;
    if (norm.reservationId) {
      reservation = resById.get(norm.reservationId.toString()) || null;
    }
    if (reservation?.bookingStatus === BOOKING_STATUS.PENDING_PAYMENT) state = 'pending';

    const hoursUntil =
      state === 'free' ? hoursUntilSlotStart(dateStr, norm.time, now) : null;
    const flashEligible =
      state === 'free' && hoursUntil != null && hoursUntil > 0 && hoursUntil <= 1;

    return {
      slotIndex: norm.slotIndex,
      time: norm.time,
      price: norm.price,
      state,
      blocked: !!norm.blocked,
      reservationCode: reservation?.code || null,
      customerName: reservation?.user?.name || null,
      customerPhone: reservation?.user?.phone || null,
      flashEligible,
      hoursUntil,
    };
  });

  return { date: dateStr, slots };
}

module.exports = {
  getDashboardStats,
  getCustomerList,
  setCustomerTag,
  isPhoneBlockedForPitch,
  getReportsSummary,
  getOwnerDailySlots,
  ownerShare,
};
