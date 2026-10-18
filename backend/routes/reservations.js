const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Pitch = require('../models/Pitch');
const DailyAvailability = require('../models/DailyAvailability');
const BookingHistory = require('../models/BookingHistory');
const { protect, adminOnly } = require('../middleware/authController');
const { reservationLimiter, paymentLimiter } = require('../lib/rateLimits');
const {
  computeTotals,
  tryAcquireLock,
  releaseOwnedLock,
  releaseSlotForReservation,
  expireStaleForDaily,
  parseSlotIndex,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  legacyStatusFromBooking,
} = require('../services/slotService');
const { appendHistory } = require('../services/bookingHistory');
const { confirmReservationPayment } = require('../services/paymentConfirm');
const {
  validateDiscountCode,
  consumeDiscountCode,
} = require('../services/discountService');
const {
  describeCancelPolicy,
  computeRefundForReservation,
} = require('../services/cancelPolicy');
const { applyLastMinuteToSlot } = require('../services/lastMinutePricing');
const {
  cancelReservationByUser,
  completeRefund,
} = require('../services/cancelReservation');
const { executeRefundForReservation } = require('../services/refundService');
const { invalidateInflightPrefix } = require('../lib/shortCache');
const Review = require('../models/Review');
const { isSlotPast } = require('../lib/jalaliTime');

function getPitchCommission(pitch) {
  return (pitch && pitch.commissionAmount) || 0;
}

function isObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);
}

function safeNote(note) {
  return String(note || '').trim().slice(0, 500);
}

function safePlayerCount(raw, fallback) {
  const base = Number.isFinite(Number(fallback)) ? Number(fallback) : 10;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return Math.min(Math.max(base, 1), 30);
  return Math.min(n, 30);
}

function normalizeCardDigits(raw) {
  return String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 16);
}

function normalizeSheba(raw) {
  const up = String(raw || '')
    .toUpperCase()
    .replace(/\s/g, '');
  if (!up) return '';
  if (up.startsWith('IR')) return up.slice(0, 26);
  const digits = up.replace(/\D/g, '').slice(0, 24);
  return digits ? `IR${digits}` : '';
}

function normalizeTeamChecklist(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 30)
    .map((item, i) => {
      const name = String(item?.name || '').trim().slice(0, 80);
      if (!name) return null;
      return {
        id: String(item?.id || `p-${i}-${Date.now()}`).slice(0, 64),
        name,
        settled: !!item?.settled,
      };
    })
    .filter(Boolean);
}

function normalizeTeamPay(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      cardNumber: '',
      sheba: '',
      accountName: '',
      note: '',
    };
  }
  return {
    cardNumber: normalizeCardDigits(raw.cardNumber),
    sheba: normalizeSheba(raw.sheba),
    accountName: String(raw.accountName || '').trim().slice(0, 120),
    note: String(raw.note || '').trim().slice(0, 200),
  };
}

function maskPhoneForPublic(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}

function reservationIsActiveForVerify(r) {
  if (!r) return false;
  if (r.status === 'cancelled') return false;
  const bs = String(r.bookingStatus || '');
  if (bs === BOOKING_STATUS.EXPIRED || bs.startsWith('cancelled')) return false;
  return (
    r.paymentStatus === PAYMENT_STATUS.SUCCESSFUL ||
    r.status === 'paid' ||
    r.bookingStatus === BOOKING_STATUS.CONFIRMED ||
    r.bookingStatus === BOOKING_STATUS.CHECKED_IN ||
    r.bookingStatus === BOOKING_STATUS.COMPLETED
  );
}

function teamSplitForClient(r, bookerName) {
  const ts = r.teamSplit || {};
  const pay = normalizeTeamPay(ts.pay);
  const hasPay =
    pay.cardNumber || pay.sheba || pay.accountName || pay.note;
  return {
    players: ts.players != null ? safePlayerCount(ts.players, 10) : 10,
    checklist: Array.isArray(ts.checklist) ? ts.checklist : [],
    pay: hasPay ? pay : undefined,
    bookerName: bookerName || undefined,
  };
}

async function loadOwnedReservation(req, res, next) {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'رزرو پیدا نشد' });
    }
    if (reservation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'دسترسی ندارید' });
    }
    req.reservation = reservation;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// ─────────────────────────────────────
// POST /api/reservations  (ثبت رزرو)
// ─────────────────────────────────────
router.post('/', protect, reservationLimiter, async (req, res) => {
  try {
    const { pitchId, slotIndex, date, playerCount, note, discountCode } =
      req.body;

    if (!date || typeof date !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'تاریخ الزامی است' });
    }

    if (!isObjectId(pitchId)) {
      return res.status(400).json({ success: false, message: 'زمین نامعتبر است' });
    }

    const slotIdx = parseSlotIndex(slotIndex);
    if (slotIdx == null) {
      return res
        .status(400)
        .json({ success: false, message: 'سانس نامعتبر است' });
    }

    const pitch = await Pitch.findById(pitchId);
    if (!pitch || !pitch.isActive) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }

    const { isPhoneBlockedForPitch } = require('../services/ownerInsights');
    if (await isPhoneBlockedForPitch(pitchId, req.user.phone)) {
      return res.status(403).json({
        success: false,
        message: 'امکان رزرو این مجموعه برای حساب شما وجود ندارد. با مجموعه تماس بگیرید.',
      });
    }

    const lockResult = await tryAcquireLock({
      pitch,
      pitchId,
      date,
      slotIndex: slotIdx,
      userId: req.user._id,
    });
    if (!lockResult.ok) {
      return res.status(lockResult.code).json({
        success: false,
        message: lockResult.message,
      });
    }

    const { slot, lockUntil, daily } = lockResult;
    let discount = 0;
    let appliedCode = '';
    let discountId = null;
    if (discountCode) {
      const v = await validateDiscountCode(discountCode, pitchId, slot.price);
      if (!v.ok) {
        await releaseOwnedLock(daily._id, slotIdx, req.user._id);
        return res.status(400).json({ success: false, message: v.message });
      }
      discount = v.discountAmount;
      appliedCode = v.code;
      discountId = v.discountId;
    }
    const { basePrice, commission, totalAmount } = computeTotals(
      slot.price,
      pitch,
      discount,
    );

    let reservation;
    try {
      reservation = await Reservation.create({
        user: req.user._id,
        pitch: pitchId,
        slotIndex: slotIdx,
        slotTime: slot.time,
        date,
        playerCount: safePlayerCount(playerCount, pitch.size),
        note: safeNote(note),
        amount: totalAmount,
        basePrice,
        discountAmount: discount,
        discountCode: appliedCode,
        commissionAtBooking: commission,
        status: 'pending',
        bookingStatus: BOOKING_STATUS.PENDING_PAYMENT,
        paymentStatus: PAYMENT_STATUS.PENDING,
        lockExpiresAt: lockUntil,
      });
    } catch (createErr) {
      if (createErr && createErr.code === 11000) {
        await releaseOwnedLock(daily._id, slotIdx, req.user._id);
        return res.status(409).json({
          success: false,
          message:
            'این سانس همین الان توسط کاربر دیگری رزرو شد. لطفاً سانس دیگری انتخاب کنید.',
        });
      }
      await releaseOwnedLock(daily._id, slotIdx, req.user._id);
      throw createErr;
    }

    const linked = await DailyAvailability.updateOne(
      {
        _id: daily._id,
        slots: {
          $elemMatch: {
            slotIndex: slotIdx,
            lockedBy: req.user._id,
            taken: false,
          },
        },
      },
      {
        $set: {
          'slots.$.reservationId': reservation._id,
        },
      },
    );

    if (!linked.modifiedCount) {
      await Reservation.findByIdAndDelete(reservation._id);
      await releaseOwnedLock(daily._id, slotIdx, req.user._id);
      return res.status(409).json({
        success: false,
        message:
          'این سانس دیگر در دسترس نیست. لطفاً سانس دیگری انتخاب کنید.',
      });
    }

    if (discountId) await consumeDiscountCode(discountId);

    await appendHistory(reservation._id, 'created', 'رزرو و قفل موقت سانس');
    await appendHistory(reservation._id, 'lock', 'قفل ۱۰ دقیقه‌ای فعال شد', {
      lockUntil,
    });

    invalidateInflightPrefix(`slots:${pitchId}:`);

    res.status(201).json({
      success: true,
      message: 'رزرو ثبت شد. تا ۱۰ دقیقه پرداخت را تکمیل کنید.',
      reservation: {
        id: reservation._id,
        code: reservation.code,
        pitch: pitch.name,
        address: pitch.address,
        slotTime: slot.time,
        date,
        basePrice,
        discountAmount: discount,
        commissionAmount: commission,
        amount: totalAmount,
        status: 'pending',
        bookingStatus: reservation.bookingStatus,
        paymentStatus: reservation.paymentStatus,
        lockExpiresAt: lockUntil,
      },
    });
  } catch (err) {
    console.error('POST /reservations error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/reservations/:id/discount  (اعمال کد قبل از پرداخت)
// ─────────────────────────────────────
router.post('/:id/discount', protect, loadOwnedReservation, async (req, res) => {
  try {
    const reservation = req.reservation;
    const { code } = req.body;

    if (reservation.paymentStatus === PAYMENT_STATUS.SUCCESSFUL) {
      return res
        .status(400)
        .json({ success: false, message: 'این رزرو قبلاً پرداخت شده است' });
    }
    if (reservation.bookingStatus !== BOOKING_STATUS.PENDING_PAYMENT) {
      return res.status(400).json({
        success: false,
        message: 'در این مرحله امکان اعمال کد تخفیف نیست',
      });
    }
    if (reservation.discountCode) {
      return res.status(400).json({
        success: false,
        message: 'کد تخفیف قبلاً روی این رزرو اعمال شده است',
      });
    }

    const pitch = await Pitch.findById(reservation.pitch);
    if (!pitch) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }

    const basePrice = reservation.basePrice;
    if (!basePrice) {
      return res.status(400).json({
        success: false,
        message: 'قیمت پایه رزرو نامعتبر است',
      });
    }

    const v = await validateDiscountCode(code, reservation.pitch, basePrice);
    if (!v.ok) {
      return res.status(400).json({ success: false, message: v.message });
    }

    const { discount, commission, totalAmount } = computeTotals(
      basePrice,
      pitch,
      v.discountAmount,
    );

    reservation.discountAmount = discount;
    reservation.discountCode = v.code;
    reservation.amount = totalAmount;
    reservation.commissionAtBooking = commission;
    await reservation.save();
    await consumeDiscountCode(v.discountId);
    await appendHistory(reservation._id, 'discount_applied', 'کد تخفیف اعمال شد', {
      code: v.code,
      discountAmount: discount,
    });

    res.json({
      success: true,
      code: v.code,
      percent: v.percent,
      discountAmount: discount,
      amount: totalAmount,
    });
  } catch (err) {
    console.error('POST /reservations/:id/discount error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/reservations/recurring
// ─────────────────────────────────────
router.post('/recurring', protect, reservationLimiter, async (req, res) => {
  try {
    const { pitchId, slotIndex, dates, playerCount, note } = req.body;
    if (!Array.isArray(dates) || !dates.length) {
      return res
        .status(400)
        .json({ success: false, message: 'تاریخ‌ها الزامی است' });
    }
    if (dates.length > 12) {
      return res
        .status(400)
        .json({ success: false, message: 'حداکثر ۱۲ تاریخ در هر درخواست' });
    }
    if (!isObjectId(pitchId)) {
      return res.status(400).json({ success: false, message: 'زمین نامعتبر است' });
    }
    const slotIdx = parseSlotIndex(slotIndex);
    if (slotIdx == null) {
      return res
        .status(400)
        .json({ success: false, message: 'سانس نامعتبر است' });
    }
    const pitch = await Pitch.findById(pitchId);
    if (!pitch || !pitch.isActive) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }
    const groupId =
      'RG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const created = [];
    const skipped = [];
    for (const date of dates) {
      if (isSlotPast(date, pitch.slots[slotIdx]?.time || '', new Date())) {
        skipped.push(date);
        continue;
      }
      const lockResult = await tryAcquireLock({
        pitch,
        pitchId,
        date,
        slotIndex: slotIdx,
        userId: req.user._id,
      });
      if (!lockResult.ok) {
        skipped.push(date);
        continue;
      }
      const { slot, lockUntil, daily } = lockResult;
      const commission = pitch.commissionAmount || 0;
      const sitePrice = slot.price + commission;
      const { sitePrice: totalAmount } = applyLastMinuteToSlot(
        sitePrice,
        date,
        slot.time,
        pitch,
        new Date(),
      );
      const basePrice = slot.price;
      let reservation;
      try {
        reservation = await Reservation.create({
          user: req.user._id,
          pitch: pitchId,
          slotIndex: slotIdx,
          slotTime: slot.time,
          date,
          playerCount: safePlayerCount(playerCount, pitch.size),
          note: safeNote(note),
          amount: totalAmount,
          basePrice,
          commissionAtBooking: commission,
          status: 'pending',
          bookingStatus: BOOKING_STATUS.PENDING_PAYMENT,
          paymentStatus: PAYMENT_STATUS.PENDING,
          lockExpiresAt: lockUntil,
          recurringGroupId: groupId,
        });
      } catch (createErr) {
        await releaseOwnedLock(daily._id, slotIdx, req.user._id);
        skipped.push(date);
        continue;
      }
      const linked = await DailyAvailability.updateOne(
        {
          _id: daily._id,
          slots: {
            $elemMatch: {
              slotIndex: slotIdx,
              lockedBy: req.user._id,
              taken: false,
            },
          },
        },
        { $set: { 'slots.$.reservationId': reservation._id } },
      );
      if (!linked.modifiedCount) {
        await Reservation.findByIdAndDelete(reservation._id);
        await releaseOwnedLock(daily._id, slotIdx, req.user._id);
        skipped.push(date);
        continue;
      }
      await appendHistory(reservation._id, 'created', 'رزرو تکراری — قفل موقت');
      created.push({
        id: reservation._id,
        date,
        time: slot.time,
        amount: totalAmount,
      });
    }
    if (!created.length) {
      return res.status(400).json({
        success: false,
        message: 'همه سانس‌های انتخابی قبلاً رزرو شدن',
      });
    }
    res.status(201).json({
      success: true,
      groupId,
      created,
      skipped,
      totalAmount: created.reduce((sum, r) => sum + r.amount, 0),
    });
  } catch (err) {
    console.error('POST /reservations/recurring error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/reservations/recurring/:groupId/pay
// تأیید پرداخت گروهی — کمیسیون هر رزرو با commissionAmount فعلیِ زمین snapshot می‌شه
// ─────────────────────────────────────
router.post('/recurring/:groupId/pay', protect, paymentLimiter, async (req, res) => {
  try {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_MOCK_PAY !== 'true'
    ) {
      return res.status(403).json({
        success: false,
        message: 'برای گروه از درگاه زرین‌پال با recurringGroupId استفاده کنید',
      });
    }
    const list = await Reservation.find({
      recurringGroupId: req.params.groupId,
      user: req.user._id,
    });
    if (!list.length)
      return res.status(404).json({ success: false, message: 'رزرو پیدا نشد' });

    const ref = String(Date.now());
    for (const r of list) {
      if (r.paymentStatus !== PAYMENT_STATUS.SUCCESSFUL) {
        await confirmReservationPayment(r, ref, 'mock');
      }
    }
    res.json({
      success: true,
      message: 'پرداخت تأیید شد 🎉',
      count: list.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// DELETE /api/reservations/recurring/:groupId
// لغو گروهی توسط خود مشتری — فقط رزروهای هنوز پرداخت‌نشده لغو می‌شن
// (پرداخت‌شده‌ها از همین مسیر دست نمی‌خورن، باید owner/admin لغوشون کنه)
// ─────────────────────────────────────
router.delete('/recurring/:groupId', protect, async (req, res) => {
  try {
    const list = await Reservation.find({
      recurringGroupId: req.params.groupId,
      user: req.user._id,
      status: { $ne: 'paid' },
    });
    for (const r of list) {
      const daily = await DailyAvailability.findOne({
        pitch: r.pitch,
        date: r.date,
      });
      if (daily) {
        await releaseSlotForReservation(daily._id, r.slotIndex, r._id);
        await releaseOwnedLock(daily._id, r.slotIndex, req.user._id);
      }
      r.status = 'cancelled';
      r.bookingStatus = BOOKING_STATUS.CANCELLED_BY_USER;
      r.paymentStatus = PAYMENT_STATUS.FAILED;
      await r.save();
    }
    res.json({ success: true, cancelled: list.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/reservations/my  (رزروهای خودم)
// ─────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user._id })
      .populate('pitch', 'name type size address')
      .sort({ createdAt: -1 });

    res.json({ success: true, reservations });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/reservations/cancel-policy
// ─────────────────────────────────────
router.get('/cancel-policy', async (req, res) => {
  res.json({ success: true, lines: describeCancelPolicy() });
});

// ─────────────────────────────────────
// GET /api/reservations/verify/:code  (QR — تأیید سانس در زمین، بدون لاگین)
// ─────────────────────────────────────
router.get('/verify/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '')
      .trim()
      .toUpperCase();
    if (!code || code.length < 4) {
      return res.status(400).json({ success: false, message: 'کد نامعتبر' });
    }
    const r = await Reservation.findOne({ code })
      .populate('pitch', 'name address type size')
      .populate('user', 'name phone');
    if (!r) {
      return res.status(404).json({ success: false, message: 'رزرو پیدا نشد' });
    }
    const bookerName = r.user?.name ? String(r.user.name).trim() : '';
    const bookerPhone = r.user?.phone ? String(r.user.phone) : '';
    res.json({
      success: true,
      verify: {
        code: r.code,
        pitchName: r.pitch?.name || 'مجموعه',
        pitchAddress: r.pitch?.address || '',
        pitchType: r.pitch?.type || '',
        date: r.date,
        slotTime: r.slotTime,
        amount: r.amount,
        bookerName: bookerName || undefined,
        bookerPhoneMasked: maskPhoneForPublic(bookerPhone) || undefined,
        status: r.status,
        bookingStatus: r.bookingStatus,
        paymentStatus: r.paymentStatus,
        valid: reservationIsActiveForVerify(r),
        checkedIn: r.bookingStatus === BOOKING_STATUS.CHECKED_IN,
      },
    });
  } catch (err) {
    console.error('GET /verify/:code error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/reservations/share/:code  (صفحهٔ اشتراک تیم — بدون لاگین)
// ─────────────────────────────────────
router.get('/share/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '')
      .trim()
      .toUpperCase();
    if (!code || code.length < 4) {
      return res.status(400).json({ success: false, message: 'کد نامعتبر' });
    }
    const r = await Reservation.findOne({ code })
      .populate('pitch', 'name')
      .populate('user', 'name');
    if (!r) {
      return res.status(404).json({ success: false, message: 'رزرو پیدا نشد' });
    }
    if (
      r.bookingStatus === BOOKING_STATUS.EXPIRED ||
      r.status === 'cancelled' ||
      String(r.bookingStatus || '').startsWith('cancelled')
    ) {
      return res.status(410).json({ success: false, message: 'این رزرو دیگر فعال نیست' });
    }
    const bookerName = r.user?.name ? String(r.user.name) : undefined;
    res.json({
      success: true,
      share: {
        pitchName: r.pitch?.name || 'مجموعه',
        date: r.date,
        time: r.slotTime,
        amount: r.amount,
        reservationCode: r.code,
        bookerName,
        ...teamSplitForClient(r, bookerName),
      },
    });
  } catch (err) {
    console.error('GET /share/:code error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// PATCH /api/reservations/:id/team-split
// ─────────────────────────────────────
router.patch('/:id/team-split', protect, loadOwnedReservation, async (req, res) => {
  try {
    const r = req.reservation;
    const { players, checklist, pay } = req.body || {};
    const nextChecklist = normalizeTeamChecklist(checklist);
    const nextPay = normalizeTeamPay(pay);
    const nextPlayers = safePlayerCount(
      players,
      r.teamSplit?.players || r.playerCount || 10,
    );
    r.teamSplit = {
      players: nextPlayers,
      checklist: nextChecklist,
      pay: nextPay,
    };
    if (nextPlayers > 0) r.playerCount = nextPlayers;
    await r.save();
    const bookerName = req.user?.name ? String(req.user.name) : undefined;
    res.json({
      success: true,
      teamSplit: teamSplitForClient(r, bookerName),
    });
  } catch (err) {
    console.error('PATCH team-split error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/reservations/:id  (جزئیات رزرو خودم)
// ─────────────────────────────────────
router.get('/:id', protect, loadOwnedReservation, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id).populate(
      'pitch',
      'name type size address desc',
    );
    res.json({ success: true, reservation: r });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/reservations/:id/history
// ─────────────────────────────────────
router.get('/:id/history', protect, loadOwnedReservation, async (req, res) => {
  try {
    const items = await BookingHistory.find({ reservation: req.params.id }).sort({
      at: 1,
    });
    res.json({ success: true, history: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/reservations/:id/revalidate  (قبل از پرداخت)
// ─────────────────────────────────────
router.post('/:id/revalidate', protect, loadOwnedReservation, async (req, res) => {
  try {
    let r = req.reservation;
    const daily = await DailyAvailability.findOne({
      pitch: r.pitch,
      date: r.date,
    });
    if (daily) await expireStaleForDaily(daily);
    r = await Reservation.findById(r._id);

    if (r.bookingStatus === BOOKING_STATUS.EXPIRED) {
      return res.status(410).json({
        success: false,
        message:
          'زمان پرداخت شما به پایان رسیده و سانس دوباره آزاد شده است. لطفاً سانس جدید انتخاب کنید.',
      });
    }
    if (r.paymentStatus === PAYMENT_STATUS.SUCCESSFUL) {
      return res.status(400).json({
        success: false,
        message: 'این رزرو قبلاً پرداخت شده است',
      });
    }
    if (
      r.lockExpiresAt &&
      new Date(r.lockExpiresAt) <= new Date() &&
      r.bookingStatus === BOOKING_STATUS.PENDING_PAYMENT
    ) {
      if (daily) {
        await releaseSlotForReservation(daily._id, r.slotIndex, r._id);
        await releaseOwnedLock(daily._id, r.slotIndex, r.user);
      }
      r.bookingStatus = BOOKING_STATUS.EXPIRED;
      r.paymentStatus = PAYMENT_STATUS.FAILED;
      r.status = legacyStatusFromBooking(BOOKING_STATUS.EXPIRED);
      await r.save();
      await appendHistory(r._id, 'expired', 'قفل منقضی شد');
      return res.status(410).json({
        success: false,
        message:
          'زمان پرداخت شما به پایان رسیده و سانس دوباره آزاد شده است.',
      });
    }

    res.json({
      success: true,
      reservation: {
        id: r._id,
        amount: r.amount,
        lockExpiresAt: r.lockExpiresAt,
        bookingStatus: r.bookingStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/reservations/:id/pay  (mock — فقط توسعه)
// ─────────────────────────────────────
router.post('/:id/pay', protect, paymentLimiter, loadOwnedReservation, async (req, res) => {
  try {
    const paymentMethod = req.body?.paymentMethod || 'mock';
    const useWallet = paymentMethod === 'wallet';

    if (
      !useWallet &&
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_MOCK_PAY !== 'true'
    ) {
      return res.status(403).json({
        success: false,
        message: 'پرداخت آزمایشی در محیط واقعی غیرفعال است. از درگاه یا کیف پول استفاده کنید.',
      });
    }

    const reservation = req.reservation;
    if (reservation.paymentStatus === PAYMENT_STATUS.SUCCESSFUL) {
      return res.json({
        success: true,
        alreadyPaid: true,
        message: 'این رزرو قبلاً پرداخت شده است',
        code: reservation.code,
      });
    }

    const daily = await DailyAvailability.findOne({
      pitch: reservation.pitch,
      date: reservation.date,
    });
    if (daily) await expireStaleForDaily(daily);
    const fresh = await Reservation.findById(reservation._id);
    if (fresh.bookingStatus === BOOKING_STATUS.EXPIRED) {
      return res.status(410).json({
        success: false,
        message: 'زمان پرداخت به پایان رسیده است.',
      });
    }

    const payAmount = fresh.amount;
    if (useWallet) {
      const { debitWalletForPayment } = require('../services/walletService');
      await debitWalletForPayment(
        req.user._id,
        fresh._id,
        payAmount,
        `رزرو ${fresh.code || fresh._id}`,
      );
    }

    const { reservation: confirmed } = await confirmReservationPayment(
      fresh,
      String(Date.now()),
      useWallet ? 'wallet' : 'mock',
    );

    res.json({
      success: true,
      message: useWallet ? 'پرداخت با کیف پول انجام شد 🎉' : 'پرداخت تأیید شد 🎉',
      code: confirmed.code,
      transactionId: confirmed.payment.transactionId,
      walletBalance: useWallet
        ? await require('../services/walletService').getWalletBalance(req.user._id)
        : undefined,
    });
  } catch (err) {
    if (req.body?.paymentMethod === 'wallet') {
      try {
        const current = await Reservation.findById(req.reservation._id).select(
          'paymentStatus amount payment',
        );
        if (current && current.paymentStatus !== PAYMENT_STATUS.SUCCESSFUL && current.payment?.walletAmount) {
          await Reservation.updateOne(
            { _id: current._id },
            { $set: { 'payment.walletAmount': null } },
          );
          const { creditWallet } = require('../services/walletService');
          const refundAmt = current.payment.walletAmount || current.amount;
          await creditWallet(req.user._id, refundAmt, 'refund', {
            reservationId: current._id,
            note: 'برگشت وجه؛ تأیید سانس انجام نشد',
          });
        }
      } catch (refundErr) {
        console.error('wallet refund after failed pay:', refundErr.message);
      }
    }
    const status = err.statusCode === 409 || err.statusCode === 410 ? err.statusCode : 400;
    res.status(status).json({ success: false, message: err.message || 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/reservations/:id/cancel-preview
// ─────────────────────────────────────
router.get('/:id/cancel-preview', protect, loadOwnedReservation, async (req, res) => {
  try {
    const { reservationPaidViaWallet } = require('../services/walletService');
    const preview = computeRefundForReservation(req.reservation);
    const paidViaWallet = reservationPaidViaWallet(req.reservation);
    res.json({
      success: true,
      ...preview,
      policyLines: describeCancelPolicy(),
      refundToWallet: paidViaWallet && preview.refundAmount > 0,
      refundViaGateway:
        preview.refundAmount > 0 &&
        req.reservation.paymentStatus === PAYMENT_STATUS.SUCCESSFUL &&
        !paidViaWallet,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'خطا' });
  }
});

// POST /api/reservations/:id/cancel  (لغو با قوانین بازپرداخت)
// ─────────────────────────────────────
router.post('/:id/cancel', protect, loadOwnedReservation, async (req, res) => {
  try {
    const result = await cancelReservationByUser(req.reservation);
    let walletBalance;
    if (result.refundedToWallet) {
      walletBalance = await require('../services/walletService').getWalletBalance(
        req.user._id,
      );
    }
    res.json({
      success: true,
      message: result.refundedToWallet
        ? 'رزرو لغو شد و مبلغ به کیف پول شما برگشت.'
        : result.refundAmount > 0
          ? 'رزرو لغو شد. بازپرداخت در حال پیگیری است.'
          : 'رزرو لغو شد.',
      refundAmount: result.refundAmount,
      refundedToWallet: Boolean(result.refundedToWallet),
      walletBalance,
      reservation: result.reservation,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'خطا' });
  }
});

// ─────────────────────────────────────
// POST /api/reservations/:id/review
// ─────────────────────────────────────
router.post('/:id/review', protect, loadOwnedReservation, async (req, res) => {
  try {
    const { rating, text } = req.body;
    const r = req.reservation;
    if (r.bookingStatus !== BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'فقط پس از اتمام سانس می‌توانید نظر ثبت کنید',
      });
    }
    const rate = parseInt(rating, 10);
    if (!rate || rate < 1 || rate > 5) {
      return res.status(400).json({ success: false, message: 'امتیاز ۱ تا ۵ است' });
    }
    const exists = await Review.findOne({ reservation: r._id });
    if (exists) {
      return res.status(400).json({ success: false, message: 'قبلاً نظر ثبت شده' });
    }
    const review = await Review.create({
      reservation: r._id,
      user: r.user,
      pitch: r.pitch,
      rating: rate,
      text: text || '',
    });
    await appendHistory(r._id, 'review', 'نظر مشتری ثبت شد');
    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/reservations/:id/refund/complete  (ادمین)
// ─────────────────────────────────────
router.post(
  '/:id/refund/complete',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'رزرو پیدا نشد' });
      }
      const updated = await executeRefundForReservation(reservation);
      res.json({ success: true, reservation: updated });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },
);

// ─────────────────────────────────────
// DELETE /api/reservations/:id  (لغو — همان POST /cancel)
// ─────────────────────────────────────
router.delete('/:id', protect, loadOwnedReservation, async (req, res) => {
  try {
    const result = await cancelReservationByUser(req.reservation);
    res.json({
      success: true,
      message: 'رزرو لغو شد',
      refundAmount: result.refundAmount,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'خطا' });
  }
});

// ─────────────────────────────────────
// GET /api/reservations  (ادمین — همه رزروها)
// query: ?showArchived=1 برای نمایش آرشیو هم
// ─────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.showArchived !== '1') {
      filter.isArchived = { $ne: true };
    }

    const reservations = await Reservation.find(filter)
      .populate('user', 'name phone')
      .populate('pitch', 'name type')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reservations.length, reservations });
  } catch (err) {
    console.error('GET /api/reservations error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

module.exports = router;
