const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authController');
const User = require('../models/User');
const {
  creditWallet,
  getWalletBalance,
  listTransactions,
} = require('../services/walletService');

router.get('/me', protect, async (req, res) => {
  try {
    const balance = await getWalletBalance(req.user._id);
    res.json({ success: true, balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'خطای سرور' });
  }
});

router.get('/transactions', protect, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '40', 10), 100);
    const transactions = await listTransactions(req.user._id, limit);
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'خطای سرور' });
  }
});

/** شارژ آزمایشی — فقط development (یا ALLOW_MOCK_PAY) */
router.post('/topup', protect, async (req, res) => {
  try {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_MOCK_PAY !== 'true'
    ) {
      return res.status(403).json({
        success: false,
        message: 'شارژ مستقیم در محیط واقعی غیرفعال است',
      });
    }
    const amount = Math.round(Number(req.body?.amount));
    if (!Number.isFinite(amount) || amount < 10_000) {
      return res.status(400).json({
        success: false,
        message: 'حداقل شارژ ۱۰٬۰۰۰ تومان',
      });
    }
    if (amount > 50_000_000) {
      return res.status(400).json({
        success: false,
        message: 'سقف شارژ آزمایشی ۵۰٬۰۰۰٬۰۰۰ تومان',
      });
    }

    const balance = await creditWallet(req.user._id, amount, 'topup', {
      note: 'شارژ آزمایشی لوکال',
    });
    res.json({ success: true, balance, message: 'کیف پول شارژ شد' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'خطا' });
  }
});

router.post('/admin/credit', protect, adminOnly, async (req, res) => {
  try {
    const { userId, phone, amount, note } = req.body || {};
    const amt = Math.round(Number(amount));
    if (!Number.isFinite(amt) || amt < 1) {
      return res.status(400).json({ success: false, message: 'مبلغ نامعتبر' });
    }
    let targetId = userId;
    if (!targetId && phone) {
      const u = await User.findOne({ phone: String(phone).trim() });
      if (!u) {
        return res.status(404).json({ success: false, message: 'کاربر پیدا نشد' });
      }
      targetId = u._id;
    }
    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: 'userId یا phone الزامی است',
      });
    }

    const balance = await creditWallet(targetId, amt, 'admin_credit', {
      note: note || `اعتبار توسط ${req.user.name}`,
    });
    res.json({ success: true, balance, userId: targetId });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'خطا' });
  }
});

module.exports = router;
