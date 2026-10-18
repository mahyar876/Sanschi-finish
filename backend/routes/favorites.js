const express = require('express');
const mongoose = require('mongoose');
const Pitch = require('../models/Pitch');
const User = require('../models/User');
const { protect } = require('../middleware/authController');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favoritePitches').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'کاربر پیدا نشد' });
    }
    const pitchIds = (user.favoritePitches || []).map((id) => String(id));
    res.json({ success: true, pitchIds });
  } catch (err) {
    console.error('GET /favorites error:', err);
    res.status(500).json({ success: false, message: 'خطا در دریافت علاقه‌مندی‌ها' });
  }
});

router.post('/:pitchId/toggle', protect, async (req, res) => {
  try {
    const { pitchId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(pitchId)) {
      return res.status(400).json({ success: false, message: 'شناسه زمین نامعتبر است' });
    }
    const pitch = await Pitch.findById(pitchId).select('_id');
    if (!pitch) {
      return res.status(404).json({ success: false, message: 'زمین پیدا نشد' });
    }

    const user = await User.findById(req.user._id).select('favoritePitches');
    if (!user) {
      return res.status(404).json({ success: false, message: 'کاربر پیدا نشد' });
    }

    const list = user.favoritePitches || [];
    const idx = list.findIndex((id) => id.toString() === pitchId);
    let favorited;
    if (idx >= 0) {
      list.splice(idx, 1);
      favorited = false;
    } else {
      list.push(pitch._id);
      favorited = true;
    }
    user.favoritePitches = list;
    await user.save();

    res.json({
      success: true,
      favorited,
      pitchIds: list.map((id) => String(id)),
    });
  } catch (err) {
    console.error('POST /favorites toggle error:', err);
    res.status(500).json({ success: false, message: 'خطا در به‌روزرسانی علاقه‌مندی' });
  }
});

module.exports = router;
