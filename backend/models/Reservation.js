const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pitch: { type: mongoose.Schema.Types.ObjectId, ref: 'Pitch', required: true },
  slotIndex: { type: Number, required: true },
  slotTime: { type: String, required: true }, // "۱۸:۰۰–۱۹:۰۰"
  date: { type: String, required: true }, // "1403/03/24"
  playerCount: { type: Number, default: 5 },
  note: { type: String, default: '' },
  amount: { type: Number, required: true }, // تومان — مبلغ کامل که مشتری پرداخت می‌کند (بدون تغییر، برای فرانت)

  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending',
  },

  bookingStatus: {
    type: String,
    enum: [
      'pending_payment',
      'payment_failed',
      'confirmed',
      'cancelled_by_user',
      'cancelled_by_owner',
      'refund_pending',
      'refunded',
      'checked_in',
      'completed',
      'no_show',
      'expired',
    ],
    default: 'pending_payment',
  },
  paymentStatus: {
    type: String,
    enum: ['none', 'pending', 'successful', 'failed', 'unknown', 'refunded'],
    default: 'pending',
  },
  lockExpiresAt: { type: Date, default: null },
  basePrice: { type: Number, default: null },
  discountAmount: { type: Number, default: 0 },
  discountCode: { type: String, default: '' },
  commissionAtBooking: { type: Number, default: null },
  refundAmount: { type: Number, default: 0 },
  refundReason: { type: String, default: '' },
  refundCompletedAt: { type: Date, default: null },
  cancelledBy: {
    type: String,
    enum: ['user', 'owner', 'system', 'admin', null],
    default: null,
  },
  cancelReason: { type: String, default: '' },
  checkedInAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },

  // ── کمیسیون سانس‌چی (snapshot لحظه‌ی تأیید پرداخت) ──
  // این دو فیلد فقط وقتی status به paid تغییر می‌کند پر می‌شوند و با
  // commissionAmount فعلیِ زمین (در آن لحظه) محاسبه می‌شوند. تغییر بعدیِ
  // کمیسیون زمین، رزروهای قبلاً پرداخت‌شده را تغییر نمی‌دهد.
  // siteCommission = سهم ثابت سانس‌چی (تومان) — در صورت لغو هم باقی می‌ماند
  //   و غیرقابل‌برگشت است.
  // pitchAmount    = amount - siteCommission = سهم صاحب زمین، تنها مبلغی
  //   که در صورت لغو رزرو پرداخت‌شده باید به مشتری برگردانده شود.
  siteCommission: { type: Number, default: null },
  pitchAmount: { type: Number, default: null },

  // ── ردیابی تسویه ──
  settlementStatus: {
    type: String,
    enum: ['none', 'settled'],
    default: 'none',
  },
  settlement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Settlement',
    default: null,
  },
  settledAt: { type: Date, default: null },

  // ── لغو بعد از پرداخت ──
  voidedAt: { type: Date, default: null },
  voidReason: { type: String, default: '' },

  /** تقسیم سهم بین تیم — فقط هماهنگی؛ پرداخت سانس از پلتفرم */
  teamSplit: {
    players: { type: Number, default: null },
    checklist: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        settled: { type: Boolean, default: false },
      },
    ],
    pay: {
      cardNumber: { type: String, default: '' },
      sheba: { type: String, default: '' },
      accountName: { type: String, default: '' },
      note: { type: String, default: '' },
    },
  },

  // کد رزرو یکتا
  recurringGroupId: { type: String, default: null },
  code: {
    type: String,
    unique: true,
    default: () =>
      'SNS-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
  },

  // اطلاعات پرداخت (mock)
  payment: {
    transactionId: String,
    paidAt: Date,
    method: { type: String, default: 'card' },
    // ── زرین‌پال ──
    // authority: شناسه تراکنش زرین‌پال؛ هنگام ساخت درخواست ذخیره می‌شود
    //   تا callback (که JWT ندارد) بتواند رزرو را پیدا کند — جایگزین
    //   نگهداری در حافظه، مقاوم در برابر ری‌استارت سرور.
    // gatewayAmount: مبلغ دقیقی که به درگاه ارسال شد (برای verify لازم است).
    authority: { type: String, default: null, index: true },
    gatewayAmount: { type: Number, default: null },
    walletAmount: { type: Number, default: null },
    refundId: { type: String, default: null },
  },

  createdAt: { type: Date, default: Date.now },

  // آرشیو — رزرو از تاریخچه پنهان می‌شه ولی در درآمد حساب می‌شه
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
});

const ACTIVE_SLOT_BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'checked_in',
  'refund_pending',
];

reservationSchema.index(
  { pitch: 1, date: 1, slotIndex: 1 },
  {
    unique: true,
    partialFilterExpression: {
      bookingStatus: { $in: ACTIVE_SLOT_BOOKING_STATUSES },
    },
  },
);

module.exports = mongoose.model('Reservation', reservationSchema);
