const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Pitch = require('../models/Pitch');
const DailyAvailability = require('../models/DailyAvailability');
const BookingHistory = require('../models/BookingHistory');
const { protect, adminOnly } = require('../middleware/authController');
const {
  computeTotals,
  tryAcquireLock,
  releaseSlotOnDaily,
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
const { describeCancelPolicy } = require('../services/cancelPolicy');
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
router.post('/', protect, async (req, res) => {
  try {
    const { pitchId, slotIndex, date, playerCount, note, discountCode } =
      req.body;

    if (!date) {
      return res
        .status(400)
        .json({ success: false, message: 'تاریخ الزامی است' });
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
        playerCount: playerCount || pitch.size,
        note: note || '',
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
        releaseSlotOnDaily(daily, slotIdx);
        await daily.save();
        return res.status(409).json({
          success: false,
          message:
            'این سانس همین الان توسط کاربر دیگری رزرو شد. لطفاً سانس دیگری انتخاب کنید.',
        });
      }
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
      releaseSlotOnDaily(daily, slotIdx);
      await daily.save();
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
router.post('/recurring', protect, async (req, res) => {
  try {
    const { pitchId, slotIndex, dates, playerCount, note } = req.body;
    if (!Array.isArray(dates) || !dates.length) {
      return res
        .status(400)
        .json({ success: false, message: 'تاریخ‌ها الزامی است' });
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
          playerCount: playerCount || pitch.size,
          note: note || '',
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
        if (createErr && createErr.code === 11000) {
          releaseSlotOnDaily(daily, slotIdx);
          await daily.save();
        }
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
        releaseSlotOnDaily(daily, slotIdx);
        await daily.save();
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
router.post('/recurring/:groupId/pay', protect, async (req, res) => {
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
        releaseSlotOnDaily(daily, r.slotIndex);
        await daily.save();
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
      if (daily) releaseSlotOnDaily(daily, r.slotIndex);
      r.bookingStatus = BOOKING_STATUS.EXPIRED;
      r.paymentStatus = PAYMENT_STATUS.FAILED;
      r.status = legacyStatusFromBooking(BOOKING_STATUS.EXPIRED);
      await r.save();
      await appendHistory(r._id, 'expired', 'قفل منقضی شد');
      if (daily) await daily.save();
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
router.post('/:id/pay', protect, loadOwnedReservation, async (req, res) => {
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
      return res
        .status(400)
        .json({ success: false, message: 'این رزرو قبلاً پرداخت شده' });
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

    if (useWallet) {
      confirmed.payment = confirmed.payment || {};
      confirmed.payment.walletAmount = payAmount;
      await confirmed.save();
    }

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
    res.status(400).json({ success: false, message: err.message || 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/reservations/:id/cancel  (لغو با قوانین بازپرداخت)
// ─────────────────────────────────────
router.post('/:id/cancel', protect, loadOwnedReservation, async (req, res) => {
  try {
    const result = await cancelReservationByUser(req.reservation);
    res.json({
      success: true,
      message:
        result.refundAmount > 0
          ? 'رزرو لغو شد. بازپرداخت در حال پیگیری است.'
          : 'رزرو لغو شد.',
      refundAmount: result.refundAmount,
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
