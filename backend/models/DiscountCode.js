const mongoose = require('mongoose');

const discountCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  percent: { type: Number, required: true, min: 1, max: 100 },
  /** سقف مبلغ تخفیف به تومان (مثلاً جوایز پنالتی) */
  maxDiscountAmount: { type: Number, default: null },
  maxUses: { type: Number, default: 1000 },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  pitch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pitch',
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DiscountCode', discountCodeSchema);
