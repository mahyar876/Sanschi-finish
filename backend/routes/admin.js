const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Pitch = require('../models/Pitch');
const Settlement = require('../Settlement');
const { protect, adminOnly } = require('../middleware/authController');
const { BOOKING_STATUS } = require('../lib/bookingConstants');
const {
  getSiteSettings,
  updateSiteSettings,
  MIN_HOME_VENUE_PREVIEW,
  MAX_HOME_VENUE_PREVIEW,
} = require('../services/siteSettings');

router.get('/site-settings', protect, adminOnly, async (req, res) => {
  try {
    const settings = await getSiteSettings();
    res.json({
      success: true,
      ...settings,
      limits: {
        homeVenuePreviewCount: {
          min: MIN_HOME_VENUE_PREVIEW,
          max: MAX_HOME_VENUE_PREVIEW,
        },
      },
    });
  } catch (err) {
    console.error('GET /admin/site-settings error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.patch('/site-settings', protect, adminOnly, async (req, res) => {
  try {
    const { homeVenuePreviewCount, homeFeaturedPlacements } = req.body || {};
    const settings = await updateSiteSettings({
      homeVenuePreviewCount,
      homeFeaturedPlacements,
    });
    res.json({ success: true, ...settings });
  } catch (err) {
    console.error('PATCH /admin/site-settings error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

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

router.get('/finance/overview', protect, adminOnly, async (req, res) => {
  try {
    const paid = await Reservation.find({ status: 'paid' }).select(
      'amount siteCommission pitchAmount settlementStatus',
    );
    const grossPaid = paid.reduce((s, r) => s + (r.amount || 0), 0);
    const commissionAccrued = paid.reduce(
      (s, r) => s + (r.siteCommission != null ? r.siteCommission : 0),
      0,
    );
    const ownerShareAccrued = paid.reduce(
      (s, r) =>
        s +
        (r.pitchAmount != null
          ? r.pitchAmount
          : Math.max(0, (r.amount || 0) - (r.siteCommission || 0))),
      0,
    );
    const unsettledPaid = paid.filter((r) => r.settlementStatus !== 'settled').length;

    const settlementPending = await Settlement.countDocuments({ status: 'pending' });
    const settlementApproved = await Settlement.countDocuments({ status: 'approved' });
    const ownersWithPitch = await Pitch.distinct('owner', {
      owner: { $ne: null },
    });

    res.json({
      success: true,
      reservations: {
        paidCount: paid.length,
        grossPaid,
        commissionAccrued,
        ownerShareAccrued,
        unsettledPaidCount: unsettledPaid,
      },
      settlements: {
        pending: settlementPending,
        approved: settlementApproved,
      },
      owners: { withPitches: ownersWithPitch.length },
    });
  } catch (err) {
    console.error('GET /admin/finance/overview error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

const { normalizeSheba, isValidSheba } = require('../lib/sheba');

router.get('/owners', protect, adminOnly, async (req, res) => {
  try {
    const pitches = await Pitch.find()
      .select('name isActive owner')
      .populate('owner', 'name firstName lastName phone email sheba role createdAt');
    const ownerMap = new Map();

    for (const p of pitches) {
      if (!p.owner) continue;
      const id = p.owner._id.toString();
      if (!ownerMap.has(id)) {
        ownerMap.set(id, {
          _id: id,
          name: p.owner.name,
          firstName: p.owner.firstName || '',
          lastName: p.owner.lastName || '',
          phone: p.owner.phone,
          email: p.owner.email || '',
          sheba: p.owner.sheba || '',
          role: p.owner.role,
          createdAt: p.owner.createdAt,
          pitches: [],
        });
      }
      ownerMap.get(id).pitches.push({
        _id: p._id.toString(),
        name: p.name,
        isActive: p.isActive,
      });
    }

    const owners = [...ownerMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'fa'),
    );

    const unassigned = pitches
      .filter((p) => !p.owner)
      .map((p) => ({ _id: p._id.toString(), name: p.name, isActive: p.isActive }));

    res.json({ success: true, owners, unassignedPitches: unassigned });
  } catch (err) {
    console.error('GET /admin/owners error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.patch('/owners/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { firstName, lastName, phone, email, sheba } = req.body || {};
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'مالک پیدا نشد' });
    }
    if (phone && phone !== user.phone) {
      if (!/^09[0-9]{9}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'موبایل معتبر نیست' });
      }
      const taken = await User.findOne({ phone });
      if (taken && taken._id.toString() !== user._id.toString()) {
        return res.status(400).json({ success: false, message: 'این موبایل قبلاً ثبت شده' });
      }
      user.phone = phone;
    }
    if (firstName !== undefined) user.firstName = String(firstName).trim();
    if (lastName !== undefined) user.lastName = String(lastName).trim();
    if (firstName !== undefined || lastName !== undefined) {
      const n = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (n.length >= 3) user.name = n;
    }
    if (email !== undefined) user.email = email?.trim() || undefined;
    if (sheba !== undefined) {
      if (sheba && !isValidSheba(sheba)) {
        return res.status(400).json({ success: false, message: 'شماره شبا معتبر نیست' });
      }
      user.sheba = sheba ? normalizeSheba(sheba) : '';
    }
    if (user.role !== 'admin') user.role = 'owner';
    await user.save();
    res.json({
      success: true,
      owner: {
        _id: user._id.toString(),
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email || '',
        sheba: user.sheba || '',
        role: user.role,
      },
    });
  } catch (err) {
    console.error('PATCH /admin/owners error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

module.exports = router;
