const mongoose = require('mongoose');

const ownerApplicationSchema = new mongoose.Schema({
  contactName: { type: String, required: true, trim: true },
  firstName: { type: String, trim: true, default: '' },
  lastName: { type: String, trim: true, default: '' },
  sheba: { type: String, trim: true, uppercase: true, default: '' },
  phone: {
    type: String,
    required: true,
    match: [/^09[0-9]{9}$/, 'شماره موبایل معتبر نیست'],
  },
  email: { type: String, trim: true, lowercase: true },
  venueName: { type: String, required: true, trim: true },
  venueType: { type: String, enum: ['futsal', 'grass'], required: true },
  size: { type: Number, enum: [5, 7, 11], required: true },
  address: { type: String, required: true, trim: true },
  tehranZone: {
    type: String,
    enum: ['east', 'west', 'north', 'south', 'center', ''],
    default: '',
  },
  basePrice: { type: Number, required: true, min: 0 },
  /** true = رزرو بانوان مجاز؛ false = فقط آقایان */
  womenBookingAllowed: { type: Boolean, default: null },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'approved_awaiting_signup', 'rejected', 'needs_revision'],
    default: 'pending',
  },
  adminNote: { type: String, default: '' },
  rejectReason: { type: String, default: '' },
  /** توضیح مدیر: چه چیزهایی باید اصلاح شود */
  revisionNote: { type: String, default: '' },
  pitch: { type: mongoose.Schema.Types.ObjectId, ref: 'Pitch', default: null },
  applicantUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

ownerApplicationSchema.index({ phone: 1, status: 1 });
ownerApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('OwnerApplication', ownerApplicationSchema);
