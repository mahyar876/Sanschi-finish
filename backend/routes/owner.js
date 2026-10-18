const express = require('express');
const router = express.Router();
const Pitch = require('../models/Pitch');
const Reservation = require('../models/Reservation');
const DailyAvailability = require('../models/DailyAvailability');
const { protect } = require('../middleware/authController');
const { appendHistory } = require('../services/bookingHistory');
const {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  releaseSlotForReservation,
  releaseOwnedLock,
  legacyStatusFromBooking,
} = require('../services/slotService');
const { notifyCancelled } = require('../services/notify');

async function loadOwnedPitch(req, res, next) {
  try {
    const pitch = await Pitch.findById(req.params.id);
    if (!pitch) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }
    const isOwner =
      pitch.owner && pitch.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: 'این زمین به حساب شما متصل نیست' });
    }
    req.pitch = pitch;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

router.get('/pitches', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { owner: req.user._id };
    const pitches = await Pitch.find(filter).sort({ createdAt: -1 });

    const data = pitches.map((p) => ({
      ...p.toJSON(),
      avail: p.slots.filter((s) => !s.taken).length,
    }));

    res.json({ success: true, pitches: data });
  } catch (err) {
    console.error('GET /owner/pitches error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.patch('/pitches/:id', protect, loadOwnedPitch, async (req, res) => {
  try {
    const allowed = [
      'name',
      'type',
      'size',
      'price',
      'address',
      'desc',
      'rulesText',
      'amenities',
      'maxCapacity',
      'tags',
      'color1',
      'color2',
      'image',
      'isActive',
      'slots',
      'lat',
      'lng',
      'lastMinuteEnabled',
      'lastMinuteDiscount60',
      'lastMinuteDiscount30',
      'lastMinuteMaxPct',
      'womenBookingAllowed',
    ];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) req.pitch[key] = req.body[key];
    });

    await req.pitch.save();
    res.json({ success: true, pitch: req.pitch });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors)
        .map((e) => e.message)
        .join(' | ');
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get(
  '/pitches/:id/reservations',
  protect,
  loadOwnedPitch,
  async (req, res) => {
    try {
      const filter = { pitch: req.pitch._id };
      // پیش‌فرض: آرشیوشده‌ها نشون داده نمی‌شن مگه با ?showArchived=1
      if (req.query.showArchived !== '1') {
        filter.isArchived = { $ne: true };
      }
      const reservations = await Reservation.find(filter)
        .populate('user', 'name phone')
        .sort({ createdAt: -1 });
      res.json({ success: true, reservations });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطای سرور' });
    }
  },
);

// ─────────────────────────────────────
// PATCH /api/owner/reservations/:id/status
// تایید پرداخت یا لغو یک رزرو — فقط اگه زمینش مال خودش باشه
// لغو → آزاد کردن سانس واقعی همون تاریخ (DailyAvailability)
// ─────────────────────────────────────
router.patch('/reservations/:id/status', protect, async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['paid', 'cancelled'].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: 'وضعیت نامعتبر است' });
    }
    if (status === 'cancelled' && !(reason && String(reason).trim())) {
      return res.status(400).json({
        success: false,
        message: 'لغو رزرو قطعی نیاز به ثبت دلیل دارد',
      });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'رزرو پیدا نشد' });
    }

    const pitch = await Pitch.findById(reservation.pitch);
    if (!pitch) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }

    const isOwner =
      pitch.owner && pitch.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: 'این رزرو به زمین شما تعلق ندارد' });
    }

    if (
      status === 'paid' &&
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_OWNER_MANUAL_PAY !== 'true'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'تأیید دستی پرداخت توسط مالک در محیط واقعی غیرفعال است. از درگاه یا پنل پشتیبانی استفاده کنید.',
      });
    }

    if (status === 'cancelled') {
      if (reservation.status === 'cancelled') {
        return res
          .status(400)
          .json({ success: false, message: 'این رزرو قبلاً لغو شده' });
      }
      // آزاد کردن سانس واقعی همون تاریخ خاص — نه فقط الگوی زمین
      const daily = await DailyAvailability.findOne({
        pitch: pitch._id,
        date: reservation.date,
      });
      if (daily) {
        await releaseSlotForReservation(daily._id, reservation.slotIndex, reservation._id);
        await releaseOwnedLock(daily._id, reservation.slotIndex, reservation.user);
      }
      if (reservation.paymentStatus === PAYMENT_STATUS.SUCCESSFUL) {
        reservation.refundAmount =
          reservation.pitchAmount != null
            ? reservation.pitchAmount
            : Math.max(0, reservation.amount - (reservation.siteCommission || 0));
      } else {
        reservation.refundAmount = 0;
      }
      reservation.bookingStatus =
        reservation.refundAmount > 0
          ? BOOKING_STATUS.REFUND_PENDING
          : BOOKING_STATUS.CANCELLED_BY_OWNER;
      reservation.status = legacyStatusFromBooking(reservation.bookingStatus);
      reservation.cancelledBy = 'owner';
      reservation.cancelReason = String(reason).trim();
      reservation.voidReason = reservation.cancelReason;
      reservation.voidedAt = new Date();
      await appendHistory(
        reservation._id,
        'cancelled_by_owner',
        reservation.cancelReason,
      );
      await notifyCancelled(reservation, 'owner');
    } else if (status === 'paid') {
      const { confirmReservationPayment } = require('../services/paymentConfirm');
      const ref = 'OWNER-' + Date.now();
      const { reservation: confirmed } = await confirmReservationPayment(
        reservation,
        ref,
        'owner_manual',
      );
      return res.json({ success: true, reservation: confirmed });
    }

    await reservation.save();
    if (
      status === 'cancelled' &&
      reservation.refundAmount > 0 &&
      reservation.bookingStatus === BOOKING_STATUS.REFUND_PENDING
    ) {
      const {
        tryAutoRefund,
        executeRefundForReservation,
      } = require('../services/refundService');
      const { reservationPaidViaWallet } = require('../services/walletService');
      const fresh = await Reservation.findById(reservation._id);
      if (fresh && reservationPaidViaWallet(fresh)) {
        const updated = await executeRefundForReservation(fresh);
        return res.json({ success: true, reservation: updated, refundedToWallet: true });
      }
      setImmediate(() => tryAutoRefund(reservation._id));
    }
    res.json({ success: true, reservation });
  } catch (err) {
    console.error('PATCH /owner/reservations/:id/status error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// DELETE /api/owner/reservations/group/:groupId
// لغو گروهی رزروهای تکراری — owner یا admin می‌تونن
// ─────────────────────────────────────
router.delete('/reservations/group/:groupId', protect, async (req, res) => {
  try {
    const list = await Reservation.find({
      recurringGroupId: req.params.groupId,
      status: { $ne: 'cancelled' },
    });

    if (!list.length) {
      return res
        .status(404)
        .json({ success: false, message: 'رزروی پیدا نشد' });
    }

    // چک مالکیت — همه رزروها باید به زمین این owner تعلق داشته باشن
    const pitch = await Pitch.findById(list[0].pitch);
    if (!pitch) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }
    const isOwner =
      pitch.owner && pitch.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'دسترسی ندارید' });
    }

    let cancelled = 0;
    for (const r of list) {
      // آزاد کردن سانس در DailyAvailability
      const daily = await DailyAvailability.findOne({
        pitch: r.pitch,
        date: r.date,
      });
      if (daily) {
        await releaseSlotForReservation(daily._id, r.slotIndex, r._id);
      }
      r.status = 'cancelled';
      await r.save();
      cancelled++;
    }

    res.json({ success: true, cancelled });
  } catch (err) {
    console.error('DELETE /owner/reservations/group error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// DELETE /api/owner/reservations/:id
// لغو یک رزرو منفرد توسط owner
// ─────────────────────────────────────
router.delete('/reservations/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'رزرو پیدا نشد' });
    }
    if (reservation.status === 'cancelled') {
      return res
        .status(400)
        .json({ success: false, message: 'این رزرو قبلاً لغو شده' });
    }

    const pitch = await Pitch.findById(reservation.pitch);
    if (!pitch) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }
    const isOwner =
      pitch.owner && pitch.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'دسترسی ندارید' });
    }

    // آزاد کردن سانس
    const daily = await DailyAvailability.findOne({
      pitch: pitch._id,
      date: reservation.date,
    });
    if (daily) {
      await releaseSlotForReservation(daily._id, reservation.slotIndex, reservation._id);
    }

    reservation.status = 'cancelled';
    await reservation.save();
    res.json({ success: true, reservation });
  } catch (err) {
    console.error('DELETE /owner/reservations/:id error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// PATCH /api/owner/reservations/:id/archive
// آرشیو یک رزرو — از تاریخچه پنهان می‌شه، درآمد باقیه
// ─────────────────────────────────────
router.patch('/reservations/:id/archive', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'رزرو پیدا نشد' });
    }

    const pitch = await Pitch.findById(reservation.pitch);
    if (!pitch) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }

    const isOwner =
      pitch.owner && pitch.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'دسترسی ندارید' });
    }

    reservation.isArchived = !reservation.isArchived;
    reservation.archivedAt = reservation.isArchived ? new Date() : null;
    await reservation.save();

    res.json({
      success: true,
      archived: reservation.isArchived,
      reservation,
    });
  } catch (err) {
    console.error('PATCH /owner/reservations/:id/archive error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// PATCH /api/owner/reservations/bulk-archive
// آرشیو دسته‌جمعی — آرشیو همه رزروهای فیلترشده
// body: { pitchId?, status?, olderThanDays? }
// ─────────────────────────────────────
router.patch('/reservations/bulk-archive', protect, async (req, res) => {
  try {
    const { pitchId, status, olderThanDays } = req.body;

    // ساخت فیلتر
    const filter = { isArchived: false };

    if (pitchId) {
      // بررسی مالکیت
      const pitch = await Pitch.findById(pitchId);
      if (!pitch) {
        return res
          .status(404)
          .json({ success: false, message: 'زمین پیدا نشد' });
      }
      const isOwner =
        pitch.owner && pitch.owner.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res
          .status(403)
          .json({ success: false, message: 'دسترسی ندارید' });
      }
      filter.pitch = pitchId;
    } else if (req.user.role !== 'admin') {
      // اگه pitchId ندادن، فقط ادمین می‌تونه bulk کنه
      return res.status(403).json({ success: false, message: 'دسترسی ندارید' });
    }

    if (status) filter.status = status;
    if (olderThanDays) {
      filter.createdAt = {
        $lt: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000),
      };
    }

    const result = await Reservation.updateMany(filter, {
      $set: { isArchived: true, archivedAt: new Date() },
    });

    res.json({ success: true, archived: result.modifiedCount });
  } catch (err) {
    console.error('PATCH /owner/reservations/bulk-archive error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// PATCH /api/owner/pitches/:id/slots/block
// body: { date, slotIndex, blocked: true|false }
// ─────────────────────────────────────
router.patch('/pitches/:id/slots/block', protect, loadOwnedPitch, async (req, res) => {
  try {
    const { date, slotIndex, blocked } = req.body;
    if (!date || slotIndex === undefined) {
      return res.status(400).json({ success: false, message: 'تاریخ و سانس الزامی است' });
    }
    let daily = await DailyAvailability.findOne({
      pitch: req.pitch._id,
      date,
    });
    if (!daily) {
      const slots = req.pitch.slots.map((s, i) => ({
        slotIndex: i,
        time: s.time,
        price: s.price,
        taken: false,
        slotStatus: 'free',
        blocked: false,
      }));
      daily = await DailyAvailability.create({
        pitch: req.pitch._id,
        date,
        slots,
      });
    }
    const slot = daily.slots.find((s) => s.slotIndex === parseInt(slotIndex, 10));
    if (!slot) {
      return res.status(404).json({ success: false, message: 'سانس پیدا نشد' });
    }
    const blockResult = await DailyAvailability.updateOne(
      {
        _id: daily._id,
        slots: {
          $elemMatch: {
            slotIndex: parseInt(slotIndex, 10),
            taken: { $ne: true },
            $or: [{ reservationId: null }, { reservationId: { $exists: false } }],
          },
        },
      },
      {
        $set: {
          'slots.$.blocked': !!blocked,
          'slots.$.slotStatus': blocked ? 'blocked' : 'free',
        },
      },
    );
    if (!blockResult.modifiedCount) {
      return res.status(400).json({
        success: false,
        message: 'سانس رزرو شده را نمی‌توان مسدود کرد؛ ابتدا رزرو را لغو کنید',
      });
    }
    res.json({
      success: true,
      message: blocked ? 'سانس غیرفعال شد' : 'سانس فعال شد',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/owner/reservations/by-code/:code
// ─────────────────────────────────────
router.get('/reservations/by-code/:code', protect, async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    const reservation = await Reservation.findOne({ code }).populate(
      'pitch',
      'name owner address',
    );
    if (!reservation || !reservation.pitch) {
      return res.status(404).json({ success: false, message: 'رزرو پیدا نشد' });
    }
    const pitch = reservation.pitch;
    const isOwner =
      pitch.owner && pitch.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'دسترسی ندارید' });
    }
    res.json({ success: true, reservation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// PATCH /api/owner/reservations/:id/check-in
// ─────────────────────────────────────
router.patch('/reservations/:id/check-in', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'رزرو پیدا نشد' });
    }
    const pitch = await Pitch.findById(reservation.pitch);
    if (!pitch) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }
    const isOwner =
      pitch.owner && pitch.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'دسترسی ندارید' });
    }
    if (reservation.bookingStatus !== BOOKING_STATUS.CONFIRMED) {
      return res.status(400).json({
        success: false,
        message: 'فقط رزروهای تأیید‌شده قابل ثبت ورود هستند',
      });
    }
    reservation.bookingStatus = BOOKING_STATUS.CHECKED_IN;
    reservation.checkedInAt = new Date();
    await reservation.save();
    await appendHistory(reservation._id, 'checked_in', 'ورود به مجموعه ثبت شد');
    res.json({ success: true, reservation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

const {
  getDashboardStats,
  getCustomerList,
  setCustomerTag,
  getReportsSummary,
  getOwnerDailySlots,
} = require('../services/ownerInsights');
const { createOwnerManualReservation } = require('../services/ownerManualBooking');
const { invalidateInflightPrefix } = require('../lib/shortCache');

router.get('/pitches/:id/dashboard', protect, loadOwnedPitch, async (req, res) => {
  try {
    const stats = await getDashboardStats(req.pitch._id);
    if (!stats) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }
    res.json({ success: true, stats });
  } catch (err) {
    console.error('GET /owner/pitches/:id/dashboard error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.get('/pitches/:id/daily', protect, loadOwnedPitch, async (req, res) => {
  try {
    const date = String(req.query.date || '').trim();
    if (!date) {
      return res.status(400).json({ success: false, message: 'تاریخ الزامی است' });
    }
    const payload = await getOwnerDailySlots(req.pitch, req.pitch._id, date);
    res.json({ success: true, ...payload });
  } catch (err) {
    console.error('GET /owner/pitches/:id/daily error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.get('/pitches/:id/customers', protect, loadOwnedPitch, async (req, res) => {
  try {
    const customers = await getCustomerList(req.pitch._id);
    res.json({ success: true, customers });
  } catch (err) {
    console.error('GET /owner/pitches/:id/customers error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.patch(
  '/pitches/:id/customers/:phone/tag',
  protect,
  loadOwnedPitch,
  async (req, res) => {
    try {
      const result = await setCustomerTag(req.pitch._id, req.params.phone, req.body);
      if (!result.ok) {
        return res.status(400).json({ success: false, message: result.message });
      }
      res.json({ success: true, tag: result.tag, note: result.note });
    } catch (err) {
      console.error('PATCH customer tag error:', err);
      res.status(500).json({ success: false, message: 'خطای سرور' });
    }
  },
);

router.get('/pitches/:id/reports', protect, loadOwnedPitch, async (req, res) => {
  try {
    const summary = await getReportsSummary(req.pitch._id);
    res.json({ success: true, summary });
  } catch (err) {
    console.error('GET /owner/pitches/:id/reports error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.post(
  '/pitches/:id/reservations/manual',
  protect,
  loadOwnedPitch,
  async (req, res) => {
    try {
      const result = await createOwnerManualReservation(
        req.pitch,
        req.pitch._id,
        req.body,
      );
      if (!result.ok) {
        return res
          .status(result.status || 400)
          .json({ success: false, message: result.message });
      }
      res.status(201).json({
        success: true,
        message: 'رزرو تلفنی ثبت و سانس رزرو شد',
        reservation: result.reservation,
        customer: result.customer,
      });
    } catch (err) {
      console.error('POST manual reservation error:', err);
      res.status(500).json({ success: false, message: err.message || 'خطای سرور' });
    }
  },
);

router.patch(
  '/pitches/:id/last-minute',
  protect,
  loadOwnedPitch,
  async (req, res) => {
    try {
      if (req.body.enabled !== undefined) {
        req.pitch.lastMinuteEnabled = !!req.body.enabled;
      }
      await req.pitch.save();
      invalidateInflightPrefix(`slots:${req.pitch._id}:`);
      res.json({
        success: true,
        lastMinuteEnabled: req.pitch.lastMinuteEnabled !== false,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطای سرور' });
    }
  },
);

module.exports = router;
