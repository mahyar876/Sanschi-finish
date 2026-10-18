const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    time: { type: String, required: true }, // مثلاً "۱۸:۰۰–۱۹:۰۰"
    price: { type: Number, required: true, default: 550000 }, // قیمت اختصاصی این سانس
    taken: { type: Boolean, default: false },
    takenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: false },
);

const pitchSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['futsal', 'grass'], required: true },
  size: { type: Number, enum: [5, 7, 11], required: true },
  price: { type: Number, required: true }, // قیمت پایه (نمایشی روی کارت)
  address: { type: String, required: true },
  lat: { type: Number },
  lng: { type: Number },
  desc: { type: String },
  /** قوانین مجموعه — متن آزاد (هر خط یک بند) */
  rulesText: { type: String, default: '' },
  /** شناسه امکانات — هم‌خوان با web/src/lib/pitch-amenities.ts */
  amenities: { type: [String], default: [] },
  /** حداکثر نفرات مجاز در سانس (اختیاری) */
  maxCapacity: { type: Number, min: 1, max: 99, default: null },
  tags: [String],
  color1: { type: String, default: '#0d3320' },
  color2: { type: String, default: '#051a0e' },
  image: { type: String, default: '' }, // عکس زمین (base64 data-url)
  isActive: { type: Boolean, default: true },
  /** ترتیب نمایش در گالری و پنل ادمین (کمتر = بالاتر) */
  sortOrder: { type: Number, default: 0 },

  /** null = هنوز مشخص نشده؛ true = رزرو برای بانوان مجاز؛ false = فقط آقایان */
  womenBookingAllowed: { type: Boolean, default: null },

  // ── کمیسیون سانس‌چی ──
  // مبلغ ثابت (تومان) که سانس‌چی به ازای هر رزروی که از این زمین پرداخت
  // می‌شه برمی‌داره. فقط ادمین این رو تنظیم می‌کنه؛ صاحب زمین فقط می‌بینه.
  // این مبلغ هیچ‌وقت روی صفحات مشتری (reserve/payment) نمایش داده نمی‌شه؛
  // مشتری همیشه همون قیمت کامل سانس رو پرداخت می‌کنه.
  commissionAmount: { type: Number, default: 0, min: 0 },

  /** تخفیف لحظه‌آخر برای پر شدن سانس‌های خالی (override اختیاری؛ null = پیش‌فرض پلتفرم) */
  lastMinuteEnabled: { type: Boolean, default: true },
  lastMinuteDiscount60: { type: Number, min: 0, max: 100, default: null },
  lastMinuteDiscount30: { type: Number, min: 0, max: 100, default: null },
  lastMinuteMaxPct: { type: Number, min: 0, max: 100, default: null },

  // ── صاحب زمین ──
  // اگه null باشه یعنی این زمین به هیچ حسابی متصل نیست (فقط ادمین مدیریتش می‌کنه)
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // سانس‌های روزانه — هر سانس قیمت اختصاصی خودش رو دارد
  slots: {
    type: [slotSchema],
    default: () => [
      { time: '۰۶:۰۰–۰۷:۳۰', price: 550000, taken: false },
      { time: '۰۷:۳۰–۰۹:۰۰', price: 550000, taken: false },
      { time: '۰۹:۰۰–۱۰:۳۰', price: 550000, taken: false },
      { time: '۱۰:۳۰–۱۲:۰۰', price: 550000, taken: false },
      { time: '۱۲:۰۰–۱۳:۳۰', price: 550000, taken: false },
      { time: '۱۳:۳۰–۱۵:۰۰', price: 550000, taken: false },
      { time: '۱۵:۰۰–۱۶:۳۰', price: 550000, taken: false },
      { time: '۱۶:۳۰–۱۸:۰۰', price: 700000, taken: false },
      { time: '۱۸:۰۰–۱۹:۳۰', price: 700000, taken: false },
      { time: '۱۹:۳۰–۲۱:۰۰', price: 700000, taken: false },
      { time: '۲۱:۰۰–۲۲:۳۰', price: 700000, taken: false },
    ],
  },

  createdAt: { type: Date, default: Date.now },
});

// تعداد سانس‌های خالی (virtual)
pitchSchema.virtual('availCount').get(function () {
  return (this.slots || []).filter((s) => !s.taken).length;
});

pitchSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Pitch', pitchSchema);
