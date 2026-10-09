const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authController');
const DiscountCode = require('../models/DiscountCode');
const {
  validateDiscountCode,
  createPenaltyDiscountCode,
} = require('../services/discountService');

const PENALTY_REWARDS = {
  easy: { percent: 5, maxDiscountAmount: 700_000, minGoals: 5 },
  medium: { percent: 5, maxDiscountAmount: 1_000_000, minGoals: 5 },
  hard: { percent: 5, maxDiscountAmount: 1_500_000, minGoals: 5 },
};

/** جایزه بازی پنالتی — بدون ورود؛ کد یک‌بارمصرف در دیتابیس */
router.post('/penalty-reward', async (req, res) => {
  try {
    const difficulty = String(req.body.difficulty || 'easy').toLowerCase();
    const goalsScored = parseInt(req.body.goalsScored, 10);
    const rule = PENALTY_REWARDS[difficulty] || PENALTY_REWARDS.easy;
    if (!Number.isFinite(goalsScored) || goalsScored < rule.minGoals) {
      return res.status(400).json({
        success: false,
        message: 'برای دریافت کد، حداقل گل لازم را نزده‌اید',
      });
    }
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const doc = await createPenaltyDiscountCode({
      percent: rule.percent,
      maxDiscountAmount: rule.maxDiscountAmount,
      expiresAt,
    });
    res.status(201).json({
      success: true,
      code: doc.code,
      percent: doc.percent,
      maxDiscountAmount: doc.maxDiscountAmount,
      expiresAt: doc.expiresAt,
    });
  } catch (err) {
    console.error('penalty-reward error:', err);
    res.status(500).json({ success: false, message: 'خطا در صدور کد تخفیف' });
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const discounts = await DiscountCode.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, discounts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { active, maxUses, expiresAt } = req.body;
    const patch = {};
    if (typeof active === 'boolean') patch.active = active;
    if (maxUses != null) patch.maxUses = parseInt(maxUses, 10);
    if (expiresAt !== undefined) {
      patch.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    const doc = await DiscountCode.findByIdAndUpdate(req.params.id, patch, {
      new: true,
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'کد پیدا نشد' });
    }
    res.json({ success: true, discount: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/validate', protect, async (req, res) => {
  try {
    const { code, pitchId, basePrice } = req.body;
    const base = parseInt(basePrice, 10);
    if (!base) {
      return res.status(400).json({ success: false, message: 'قیمت پایه نامعتبر است' });
    }
    const v = await validateDiscountCode(code, pitchId, base);
    if (!v.ok) {
      return res.status(400).json({ success: false, message: v.message });
    }
    res.json({
      success: true,
      code: v.code,
      percent: v.percent,
      discountAmount: v.discountAmount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      code,
      percent,
      maxUses,
      maxDiscountAmount,
      expiresAt,
      active,
      pitch,
    } = req.body;
    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, message: 'کد الزامی است' });
    }
    const pct = parseInt(percent, 10);
    if (!pct || pct < 1 || pct > 100) {
      return res
        .status(400)
        .json({ success: false, message: 'درصد تخفیف باید بین ۱ تا ۱۰۰ باشد' });
    }
    const doc = await DiscountCode.create({
      code: String(code).trim().toUpperCase(),
      percent: pct,
      maxUses: maxUses != null ? parseInt(maxUses, 10) : 1000,
      maxDiscountAmount:
        maxDiscountAmount != null ? parseInt(maxDiscountAmount, 10) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      active: active !== false,
      pitch: pitch || null,
    });
    res.status(201).json({ success: true, discount: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
