const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const Reservation = require('../models/Reservation');
const { protect, adminOnly } = require('../middleware/authController');
const rateLimit = require('express-rate-limit');

const ticketCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_SUPPORT_MAX || '10', 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'درخواست‌های زیاد؛ بعداً دوباره تلاش کنید' },
  keyGenerator(req) {
    return req.user?._id?.toString() || req.ip || 'unknown';
  },
});

const CATEGORIES = ['general', 'booking', 'payment', 'dispute'];

function isObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);
}

router.post('/tickets', protect, ticketCreateLimiter, async (req, res) => {
  try {
    const { subject, message, category, reservationId } = req.body || {};
    const sub = String(subject || '').trim();
    const body = String(message || '').trim();
    if (sub.length < 3) {
      return res.status(400).json({ success: false, message: 'موضوع کوتاه است' });
    }
    if (body.length < 10) {
      return res.status(400).json({ success: false, message: 'متن درخواست را کامل بنویسید' });
    }
    const cat = CATEGORIES.includes(category) ? category : 'general';
    let reservationRef = null;
    if (reservationId) {
      if (!isObjectId(reservationId)) {
        return res.status(400).json({ success: false, message: 'شناسه رزرو نامعتبر است' });
      }
      const owned = await Reservation.findOne({
        _id: reservationId,
        user: req.user._id,
      }).select('_id');
      if (!owned) {
        return res.status(403).json({ success: false, message: 'این رزرو متعلق به شما نیست' });
      }
      reservationRef = owned._id;
    }
    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject: sub.slice(0, 120),
      message: body.slice(0, 4000),
      category: cat,
      reservationId: reservationRef,
    });
    res.status(201).json({ success: true, ticket });
  } catch (err) {
    console.error('POST /support/tickets error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.get('/tickets/my', protect, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.get('/tickets', protect, adminOnly, async (req, res) => {
  try {
    const status = req.query.status;
    const filter = {};
    if (status && ['open', 'in_progress', 'closed'].includes(String(status))) {
      filter.status = status;
    }
    const tickets = await SupportTicket.find(filter)
      .populate('user', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.patch('/tickets/:id', protect, adminOnly, async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'تیکت پیدا نشد' });
    }
    const { status, adminReply } = req.body || {};
    const update = {};
    if (status && ['open', 'in_progress', 'closed'].includes(status)) {
      update.status = status;
    }
    if (adminReply !== undefined) {
      update.adminReply = String(adminReply).trim().slice(0, 4000);
      update.repliedAt = new Date();
      update.repliedBy = req.user._id;
      if (!update.status) update.status = 'in_progress';
    }
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { $set: update }, {
      new: true,
    });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'تیکت پیدا نشد' });
    }
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

module.exports = router;
