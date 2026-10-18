const express = require('express');
const router = express.Router();
const Pitch = require('../models/Pitch');
const DailyAvailability = require('../models/DailyAvailability');
const { protect, adminOnly, optionalAuth } = require('../middleware/authController');
const {
  expireStaleForDaily,
  normalizeSlot,
  tryAcquireLock,
  releaseSlotOnDaily,
  ensureDaily,
  SLOT_STATUS,
} = require('../services/slotService');
const { isSlotPast, todayJalaliApiDate } = require('../lib/jalaliTime');
const { applyLastMinuteToSlot } = require('../services/lastMinutePricing');
const {
  getOrLoad,
  invalidatePrefix: invalidateCatalogCache,
  dedupeInflight,
  invalidateInflightPrefix,
} = require('../lib/shortCache');
const { pickPitchFields } = require('../lib/pitchAdminFields');

const CATALOG_CACHE_MS = parseInt(process.env.CATALOG_CACHE_MS || '45000', 10) || 45000;
const FLASH_CACHE_MS = parseInt(process.env.FLASH_CACHE_MS || '45000', 10) || 45000;

function listImageForClient(image) {
  if (!image || typeof image !== 'string') return '';
  if (image.startsWith('data:')) return '';
  return image;
}

function bustPublicPitchCaches() {
  invalidateCatalogCache('pitches:');
  invalidateCatalogCache('flash:');
}

function buildCatalogPitchRow(p) {
  const pitchCommission = p.commissionAmount || 0;
  const slotPrices = (p.slots || []).map((s) => s.price);
  const minPrice = slotPrices.length ? Math.min(...slotPrices) : p.price;
  const avail = (p.slots || []).filter((s) => !s.taken).length;
  return {
    _id: p._id,
    name: p.name,
    type: p.type,
    size: p.size,
    price: minPrice,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    tags: p.tags || [],
    image: listImageForClient(p.image),
    isActive: p.isActive,
    commissionAmount: pitchCommission,
    avail,
    womenBookingAllowed: p.womenBookingAllowed ?? null,
    amenities: p.amenities || [],
    rulesText: p.rulesText || '',
    maxCapacity: p.maxCapacity ?? null,
    slotTimes: (p.slots || []).map((s) => s.time).filter(Boolean),
  };
}

function adminSecret(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  const incoming = req.headers['x-admin-secret'];
  if (secret && incoming && incoming === secret) return next();
  return protect(req, res, () => adminOnly(req, res, next));
}

function defaultListSort() {
  return { sortOrder: 1, createdAt: 1 };
}

async function reorderPitchDocument(pitchId, dir) {
  const step = dir === 1 ? 1 : -1;
  const all = await Pitch.find({}).sort(defaultListSort());
  const idx = all.findIndex((p) => p._id.toString() === pitchId);
  if (idx < 0) return { ok: false, status: 404, message: 'زمین پیدا نشد' };
  const j = idx + step;
  if (j < 0 || j >= all.length) return { ok: true };
  [all[idx], all[j]] = [all[j], all[idx]];
  await Promise.all(
    all.map((p, i) => {
      p.sortOrder = i;
      return p.save();
    }),
  );
  return { ok: true };
}

// ─────────────────────────────────────
// GET /api/pitches
// ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, size, sort, all, catalog } = req.query;
    const catalogMode = catalog === '1' || catalog === 'true';
    const filter = {};
    if (!all) filter.isActive = true;
    if (type) filter.type = type;
    if (size) filter.size = parseInt(size);

    const cacheKey = catalogMode
      ? `pitches:catalog:${JSON.stringify({ type, size, sort, all: !!all })}`
      : null;

    if (cacheKey) {
      const cached = await getOrLoad(cacheKey, CATALOG_CACHE_MS, async () => {
        let query = Pitch.find(filter).select(
          'name type size price address lat lng tags image isActive commissionAmount slots womenBookingAllowed amenities rulesText maxCapacity desc',
        );
        if (sort === 'price') query = query.sort({ price: 1 });
        else if (sort === 'price-desc') query = query.sort({ price: -1 });
        else query = query.sort(defaultListSort());
        const pitches = await query.lean();
        let data = pitches.map((p) => buildCatalogPitchRow(p));
        if (sort === 'avail') data.sort((a, b) => b.avail - a.avail);
        return { count: data.length, pitches: data };
      });
      return res.json({ success: true, ...cached });
    }

    let query = Pitch.find(filter);
    if (sort === 'price') query = query.sort({ price: 1 });
    else if (sort === 'price-desc') query = query.sort({ price: -1 });
    else query = query.sort(defaultListSort());

    const pitches = await query;

    const data = pitches.map((p) => {
      const pObj = p.toJSON();

      // کمیسیون این زمین از Pitch.commissionAmount
      const pitchCommission = p.commissionAmount || 0;

      // هر سانس → sitePrice = price + pitchCommission
      const slotsWithSitePrice = (p.slots || []).map((s) => {
        const sObj = s.toObject ? s.toObject() : { ...s };
        const sitePrice = s.price + pitchCommission;
        return { ...sObj, commission: pitchCommission, sitePrice };
      });

      // کمترین قیمت پایه (بدون کمیسیون) برای نمایش روی کارت
      const slotPrices = (p.slots || []).map((s) => s.price);
      const minPrice = slotPrices.length ? Math.min(...slotPrices) : p.price;

      return {
        ...pObj,
        slots: slotsWithSitePrice,
        price: minPrice, // قیمت پایه واقعی زمین
        commissionAmount: pitchCommission, // کمیسیون سانس‌چی
        avail: p.slots.filter((s) => !s.taken).length,
      };
    });

    if (sort === 'avail') data.sort((a, b) => b.avail - a.avail);

    res.json({ success: true, count: data.length, pitches: data });
  } catch (err) {
    console.error('GET /pitches error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/pitches/flash-deals — سانس‌های امروز با تخفیف لحظه‌آخر
// ─────────────────────────────────────
router.get('/flash-deals', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 24);
    const date = req.query.date || todayJalaliApiDate();
    const cacheKey = `flash:${date}:${limit}`;

    const payload = await getOrLoad(cacheKey, FLASH_CACHE_MS, async () => {
      const now = new Date();
      const pitches = await Pitch.find({ isActive: true })
        .select('name commissionAmount slots lastMinuteEnabled lastMinuteDiscount60 lastMinuteDiscount30 lastMinuteMaxPct')
        .lean();
      const pitchIds = pitches.map((p) => p._id);
      const dailies = await DailyAvailability.find({
        pitch: { $in: pitchIds },
        date,
      });
      const dailyByPitch = new Map(dailies.map((d) => [d.pitch.toString(), d]));

      const deals = [];

      for (const pitch of pitches) {
        const pitchComm = pitch.commissionAmount || 0;
        let daily = dailyByPitch.get(pitch._id.toString());
        if (!daily) {
          daily = {
            slots: pitch.slots.map((s, i) => ({
              slotIndex: i,
              time: s.time,
              price: s.price,
              taken: false,
              blocked: false,
              slotStatus: SLOT_STATUS.FREE,
            })),
          };
        } else {
          await expireStaleForDaily(daily);
          daily = await DailyAvailability.findById(daily._id).lean();
        }

        for (const s of daily.slots) {
          const sObj = normalizeSlot(s, now);
          if (sObj.taken || sObj.blocked || sObj.slotStatus === SLOT_STATUS.BOOKED) continue;
          if (isSlotPast(date, sObj.time, now)) continue;

          const baseSite = s.price + pitchComm;
          const lm = applyLastMinuteToSlot(baseSite, date, sObj.time, pitch, now);
          if (!lm.flashDeal) continue;

          deals.push({
            pitchId: pitch._id.toString(),
            pitchName: pitch.name,
            date,
            slotIndex: sObj.slotIndex,
            time: sObj.time,
            sitePrice: lm.sitePrice,
            originalSitePrice: lm.originalSitePrice,
            discountPercent: lm.discountPercent,
            urgency: lm.urgency,
            minutesUntil: lm.minutesUntil ?? lm.hoursUntil,
          });
        }
      }

      deals.sort(
        (a, b) => (a.minutesUntil ?? 99999) - (b.minutesUntil ?? 99999),
      );

      return { date, deals: deals.slice(0, limit) };
    });

    res.json({ success: true, ...payload });
  } catch (err) {
    console.error('GET /flash-deals error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/pitches/:id/reviews
// ─────────────────────────────────────
router.get('/:id/reviews', async (req, res) => {
  try {
    const Review = require('../models/Review');
    const reviews = await Review.find({ pitch: req.params.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('user', 'name firstName lastName')
      .select('rating text categoryRatings ownerReply createdAt user')
      .lean();
    const mapped = reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      text: r.text,
      categoryRatings: r.categoryRatings || null,
      ownerReply: r.ownerReply?.text
        ? { text: r.ownerReply.text, createdAt: r.ownerReply.createdAt }
        : null,
      createdAt: r.createdAt,
      authorName:
        r.user?.name ||
        [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') ||
        'بازیکن',
    }));
    res.json({ success: true, reviews: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/pitches/:id
// ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const pitch = await Pitch.findById(req.params.id);
    if (!pitch)
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });

    const pObj = pitch.toJSON();
    const pitchCommission = pitch.commissionAmount || 0;
    const slotsWithSitePrice = (pitch.slots || []).map((s) => {
      const sObj = s.toObject ? s.toObject() : { ...s };
      return {
        ...sObj,
        commission: pitchCommission,
        sitePrice: s.price + pitchCommission,
      };
    });

    res.json({
      success: true,
      pitch: {
        ...pObj,
        slots: slotsWithSitePrice,
        commissionAmount: pitchCommission,
        avail: pitch.slots.filter((s) => !s.taken).length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/pitches/:id/slots/hold  (قفل موقت — در حال رزرو)
// ─────────────────────────────────────
router.post('/:id/slots/hold', protect, async (req, res) => {
  try {
    const { date, slotIndex } = req.body;
    if (!date || slotIndex == null) {
      return res
        .status(400)
        .json({ success: false, message: 'تاریخ و سانس الزامی است' });
    }
    const pitch = await Pitch.findById(req.params.id);
    if (!pitch || !pitch.isActive) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }
    const lockResult = await tryAcquireLock({
      pitch,
      pitchId: req.params.id,
      date,
      slotIndex: parseInt(slotIndex, 10),
      userId: req.user._id,
    });
    if (!lockResult.ok) {
      return res.status(lockResult.code).json({
        success: false,
        message: lockResult.message,
      });
    }
    invalidateInflightPrefix(`slots:${req.params.id}:`);
    bustPublicPitchCaches();
    res.json({
      success: true,
      lockUntil: lockResult.lockUntil,
      message: 'سانس تا ۱۰ دقیقه برای شما نگه داشته شد',
    });
  } catch (err) {
    console.error('POST /slots/hold error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/pitches/:id/slots/release
// ─────────────────────────────────────
router.post('/:id/slots/release', protect, async (req, res) => {
  try {
    const { date, slotIndex } = req.body;
    if (!date || slotIndex == null) {
      return res
        .status(400)
        .json({ success: false, message: 'تاریخ و سانس الزامی است' });
    }
    let daily = await DailyAvailability.findOne({
      pitch: req.params.id,
      date,
    });
    if (!daily) {
      return res.json({ success: true });
    }
    await expireStaleForDaily(daily);
    daily = await DailyAvailability.findById(daily._id);
    const idx = parseInt(slotIndex, 10);
    const slot = daily.slots.find((s) => s.slotIndex === idx);
    if (!slot) {
      return res.json({ success: true });
    }
    const norm = normalizeSlot(slot);
    if (
      norm.lockedBy &&
      norm.lockedBy.toString() === req.user._id.toString() &&
      !norm.taken &&
      !slot.reservationId
    ) {
      releaseSlotOnDaily(daily, idx);
      await daily.save();
      invalidateInflightPrefix(`slots:${req.params.id}:`);
      bustPublicPitchCaches();
    }
    res.json({ success: true });
  } catch (err) {
    console.error('POST /slots/release error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/pitches/:id/slots?date=1403/03/24
// ─────────────────────────────────────
router.get('/:id/slots', optionalAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const pitch = await Pitch.findById(req.params.id).select(
      'slots name commissionAmount lastMinuteEnabled lastMinuteDiscount60 lastMinuteDiscount30 lastMinuteMaxPct',
    );
    if (!pitch)
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });

    const { date } = req.query;

    // بدون تاریخ → template زمین
    if (!date) {
      const pitchComm = pitch.commissionAmount || 0;
      const slots = pitch.slots.map((s) => {
        const sObj = s.toObject ? s.toObject() : { ...s };
        return {
          ...sObj,
          commission: pitchComm,
          sitePrice: s.price + pitchComm,
        };
      });
      return res.json({ success: true, slots });
    }

    const dateStr = String(date);
    const payload = await dedupeInflight(`slots:${req.params.id}:${dateStr}`, async () => {
      const pitchComm = pitch.commissionAmount || 0;
      let daily = await ensureDaily(pitch, req.params.id, dateStr);

      await expireStaleForDaily(daily);
      daily = await DailyAvailability.findById(daily._id);

      const now = new Date();
      const slots = daily.slots.map((s) => {
        const sObj = normalizeSlot(s, now);
        let displayStatus = sObj.blocked
          ? SLOT_STATUS.BLOCKED
          : sObj.slotStatus || (sObj.taken ? SLOT_STATUS.BOOKED : SLOT_STATUS.FREE);
        if (isSlotPast(dateStr, sObj.time, now)) {
          displayStatus = SLOT_STATUS.PAST;
        }
        const bookable =
          displayStatus === SLOT_STATUS.FREE && !sObj.taken && !sObj.blocked;
        let sitePrice = s.price + pitchComm;
        let originalSitePrice;
        let discountPercent = 0;
        let flashDeal = false;
        let urgency;
        const canPrice = bookable || displayStatus === SLOT_STATUS.LOCKED;
        if (canPrice) {
          const lm = applyLastMinuteToSlot(sitePrice, dateStr, sObj.time, pitch, now);
          sitePrice = lm.sitePrice;
          originalSitePrice = lm.originalSitePrice;
          discountPercent = lm.discountPercent || 0;
          flashDeal = lm.flashDeal || false;
          urgency = lm.urgency;
        }
        const heldByMe =
          !!req.user &&
          displayStatus === SLOT_STATUS.LOCKED &&
          sObj.lockedBy &&
          sObj.lockedBy.toString() === req.user._id.toString();
        return {
          commission: pitchComm,
          sitePrice,
          originalSitePrice,
          discountPercent,
          flashDeal,
          urgency,
          displayStatus,
          bookable,
          heldByMe,
          lockUntil: sObj.lockUntil || null,
          slotIndex: sObj.slotIndex,
          time: sObj.time,
          price: sObj.price,
          taken: sObj.taken,
        };
      });

      return { success: true, slots };
    });

    res.json(payload);
  } catch (err) {
    console.error('GET /slots error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/pitches  (ادمین)
// ─────────────────────────────────────
router.post('/', adminSecret, async (req, res) => {
  try {
    const fields = pickPitchFields(req.body);
    if (fields.sortOrder === undefined) {
      fields.sortOrder = await Pitch.countDocuments();
    }
    const pitch = await Pitch.create(fields);
    bustPublicPitchCaches();
    res.status(201).json({ success: true, pitch });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors)
        .map((e) => e.message)
        .join(' | ');
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// PATCH /api/pitches/:id/reorder  (ادمین) — بدنه: { dir: -1 | 1 }
// ─────────────────────────────────────
router.patch('/:id/reorder', adminSecret, async (req, res) => {
  try {
    const dir = parseInt(req.body?.dir, 10) === 1 ? 1 : -1;
    const result = await reorderPitchDocument(req.params.id, dir);
    if (!result.ok) {
      return res
        .status(result.status || 400)
        .json({ success: false, message: result.message || 'خطا' });
    }
    bustPublicPitchCaches();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────
// PATCH /api/pitches/:id  (ادمین)
// ─────────────────────────────────────
router.patch('/:id', adminSecret, async (req, res) => {
  try {
    const pitch = await Pitch.findByIdAndUpdate(
      req.params.id,
      pickPitchFields(req.body),
      {
      new: true,
      runValidators: true,
      },
    );
    if (!pitch)
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    bustPublicPitchCaches();
    res.json({ success: true, pitch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────
// DELETE /api/pitches/:id  (ادمین)
// ─────────────────────────────────────
router.delete('/:id', adminSecret, async (req, res) => {
  try {
    await Pitch.findByIdAndUpdate(req.params.id, { isActive: false });
    bustPublicPitchCaches();
    res.json({ success: true, message: 'زمین غیرفعال شد' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});


// ─────────────────────────────────────
// PATCH /api/pitches/:id/assign-owner  (ادمین)
// اتصال یک زمین به یک کاربر (با شماره موبایل)
// بدنه: { phone: "09121234567" }
// ─────────────────────────────────────
router.patch('/:id/assign-owner', protect, adminOnly, async (req, res) => {
  try {
    const { phone, firstName, lastName, sheba, email, createIfMissing } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'شماره موبایل الزامی است' });
    }

    const User = require('../models/User');
    const { normalizeSheba, isValidSheba } = require('../lib/sheba');
    let user = await User.findOne({ phone });
    if (!user && createIfMissing) {
      const fn = String(firstName || '').trim();
      const ln = String(lastName || '').trim();
      if (fn.length < 2 || ln.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'برای ساخت حساب، نام و نام خانوادگی الزامی است',
        });
      }
      if (!isValidSheba(sheba)) {
        return res.status(400).json({
          success: false,
          message: 'شماره شبا معتبر نیست',
        });
      }
      user = await User.create({
        phone,
        name: `${fn} ${ln}`,
        firstName: fn,
        lastName: ln,
        sheba: normalizeSheba(sheba),
        email: email?.trim() || undefined,
        role: 'owner',
      });
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربری با این شماره پیدا نشد. «ساخت حساب مالک» را فعال کنید یا از ثبت‌نام استفاده کنید.',
      });
    }

    if (user.role !== 'admin') user.role = 'owner';
    if (firstName?.trim()) user.firstName = firstName.trim();
    if (lastName?.trim()) user.lastName = lastName.trim();
    if (firstName?.trim() || lastName?.trim()) {
      user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name;
    }
    if (sheba && isValidSheba(sheba)) user.sheba = normalizeSheba(sheba);
    if (email?.trim() && !user.email) user.email = email.trim();
    await user.save();

    const pitch = await Pitch.findByIdAndUpdate(
      req.params.id,
      { owner: user._id },
      { new: true }
    ).populate('owner', 'name firstName lastName phone email sheba');

    if (!pitch) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }

    res.json({
      success: true,
      message: `زمین "${pitch.name}" به ${user.name} (${user.phone}) متصل شد`,
      pitch,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور: ' + err.message });
  }
});

// ─────────────────────────────────────
// DELETE /api/pitches/:id/remove-owner  (ادمین)
// حذف مالک از یک زمین
// ─────────────────────────────────────
router.delete('/:id/remove-owner', protect, adminOnly, async (req, res) => {
  try {
    const pitch = await Pitch.findByIdAndUpdate(
      req.params.id,
      { owner: null },
      { new: true }
    );

    if (!pitch) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }

    res.json({
      success: true,
      message: `مالک از زمین "${pitch.name}" حذف شد`,
      pitch,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور: ' + err.message });
  }
});

module.exports = router;
