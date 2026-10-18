const mongoose = require('mongoose');

/** برچسب مالک برای مشتری (VIP / مسدود) — به ازای هر زمین */
const pitchCustomerTagSchema = new mongoose.Schema({
  pitch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pitch',
    required: true,
    index: true,
  },
  phone: {
    type: String,
    required: true,
    match: [/^09[0-9]{9}$/, 'شماره موبایل معتبر نیست'],
  },
  tag: {
    type: String,
    enum: ['vip', 'blocked', 'none'],
    default: 'none',
  },
  note: { type: String, default: '', maxlength: 300 },
  updatedAt: { type: Date, default: Date.now },
});

pitchCustomerTagSchema.index({ pitch: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('PitchCustomerTag', pitchCustomerTagSchema);
