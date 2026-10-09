const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authController');

router.get('/my', protect, async (req, res) => {
  try {
    const items = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, notifications: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.patch('/:id/read', protect, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true },
    );
    if (!n) {
      return res.status(404).json({ success: false, message: 'اعلان پیدا نشد' });
    }
    res.json({ success: true, notification: n });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

module.exports = router;
