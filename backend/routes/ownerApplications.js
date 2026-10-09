const express = require('express');
const rateLimit = require('express-rate-limit');
const OwnerApplication = require('../models/OwnerApplication');
const { protect, adminOnly } = require('../middleware/authController');
const {
  approveOwnerApplication,
  rejectOwnerApplication,
  requestOwnerApplicationRevision,
} = require('../services/ownerApplicationReview');

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'تعداد درخواست زیاد است — یک ساعت دیگر تلاش کنید' },
});

// POST /api/owner-applications — ثبت درخواست همکاری (عمومی)
router.post('/', submitLimiter, async (req, res) => {
  try {
    const {
      contactName,
      phone,
      email,
      venueName,
      venueType,
      size,
      address,
      tehranZone,
      basePrice,
      description,
    } = req.body;

    if (!contactName?.trim() || !venueName?.trim() || !address?.trim()) {
      return res.status(400).json({ success: false, message: 'فیلدهای الزامی را پر کنید' });
    }
    if (!/^09[0-9]{9}$/.test(String(phone || ''))) {
      return res.status(400).json({ success: false, message: 'شماره موبایل معتبر نیست' });
    }

    const pending = await OwnerApplication.findOne({ phone, status: 'pending' });
    if (pending) {
      return res.status(400).json({
        success: false,
        message: 'یک درخواست در انتظار بررسی برای این شماره دارید',
      });
    }

    const payload = {
      contactName: contactName.trim(),
      phone,
      email: email?.trim() || undefined,
      venueName: venueName.trim(),
      venueType: venueType === 'grass' ? 'grass' : 'futsal',
      size: [5, 7, 11].includes(Number(size)) ? Number(size) : 5,
      address: address.trim(),
      tehranZone: tehranZone || '',
      basePrice: Math.max(0, Number(basePrice) || 0),
      description: description?.trim() || '',
    };

    const needsFix = await OwnerApplication.findOne({ phone, status: 'needs_revision' }).sort({
      createdAt: -1,
    });

    if (needsFix) {
      Object.assign(needsFix, payload, {
        status: 'pending',
        revisionNote: '',
        rejectReason: '',
        reviewedAt: null,
      });
      await needsFix.save();
      return res.status(200).json({
        success: true,
        message: 'درخواست اصلاح‌شده ثبت شد و دوباره در صف بررسی است.',
        applicationId: needsFix._id,
      });
    }

    const app = await OwnerApplication.create(payload);

    res.status(201).json({
      success: true,
      message: 'درخواست شما ثبت شد. پس از بررسی، با شما تماس می‌گیریم.',
      applicationId: app._id,
    });
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

// GET /api/owner-applications/mine — آخرین درخواست همکاری کاربر لاگین‌شده
router.get('/mine', protect, async (req, res) => {
  try {
    const application = await OwnerApplication.findOne({ phone: req.user.phone })
      .sort({ createdAt: -1 })
      .populate('pitch', 'name isActive')
      .lean();
    res.json({ success: true, application: application || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// GET /api/owner-applications — لیست برای ادمین
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const filter = status === 'all' ? {} : { status };
    const rows = await OwnerApplication.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('pitch', 'name isActive')
      .lean();
    res.json({ success: true, applications: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.patch('/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const result = await approveOwnerApplication(req.params.id, {
      adminNote: req.body.adminNote || '',
    });
    res.json({ success: true, message: result.message, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'خطای سرور',
    });
  }
});

router.patch('/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const app = await rejectOwnerApplication(req.params.id, {
      rejectReason: req.body.rejectReason || '',
    });
    res.json({ success: true, message: 'درخواست رد شد', application: app });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'خطای سرور',
    });
  }
});

router.patch('/:id/revision', protect, adminOnly, async (req, res) => {
  try {
    const app = await requestOwnerApplicationRevision(req.params.id, {
      revisionNote: req.body.revisionNote || '',
    });
    res.json({
      success: true,
      message: 'درخواست به‌روزرسانی شد — متقاضی باید اطلاعات را اصلاح و دوباره ارسال کند.',
      application: app,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'خطای سرور',
    });
  }
});

module.exports = router;
