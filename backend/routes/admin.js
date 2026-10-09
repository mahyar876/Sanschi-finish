const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authController');
const { BOOKING_STATUS } = require('../lib/bookingConstants');

router.get('/reports/owner-cancellations', protect, adminOnly, async (req, res) => {
  try {
    const days = parseInt(req.query.days || '90', 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await Reservation.find({
      bookingStatus: BOOKING_STATUS.CANCELLED_BY_OWNER,
      voidedAt: { $gte: since },
    })
      .populate('pitch', 'name owner')
      .sort({ voidedAt: -1 })
      .limit(200);

    const counts = {};
    for (const r of rows) {
      const oid = r.pitch?.owner?.toString() || 'none';
      counts[oid] = (counts[oid] || 0) + 1;
    }

    const summary = [];
    for (const [ownerId, count] of Object.entries(counts)) {
      let label = 'بدون مالک';
      if (ownerId !== 'none') {
        const u = await User.findById(ownerId).select('name phone');
        label = u ? `${u.name} (${u.phone})` : ownerId;
      }
      summary.push({ ownerId, label, count });
    }
    summary.sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      since,
      total: rows.length,
      summary,
      recent: rows.slice(0, 30).map((r) => ({
        code: r.code,
        date: r.date,
        slotTime: r.slotTime,
        pitchName: r.pitch?.name,
        reason: r.cancelReason,
        voidedAt: r.voidedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

module.exports = router;
