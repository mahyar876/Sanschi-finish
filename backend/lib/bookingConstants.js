/** مدت قفل موقت سانس (میلی‌ثانیه) — ۱۰ دقیقه */
const LOCK_DURATION_MS = 10 * 60 * 1000;

/** پس از شروع سانس؛ بعد از این مدت دیگر قابل رزرو نیست */
const SLOT_START_GRACE_MS = 10 * 60 * 1000;

/** تخفیف لحظه‌آخر — پیش‌فرض پلتفرم (مالک می‌تواند روی هر زمین override کند) */
const LAST_MINUTE_DEFAULTS = {
  discountPercent60Min: 15,
  discountPercent30Min: 25,
  maxDiscountPercent: 40,
};

const BOOKING_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_FAILED: 'payment_failed',
  CONFIRMED: 'confirmed',
  CANCELLED_BY_USER: 'cancelled_by_user',
  CANCELLED_BY_OWNER: 'cancelled_by_owner',
  REFUND_PENDING: 'refund_pending',
  REFUNDED: 'refunded',
  CHECKED_IN: 'checked_in',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
  EXPIRED: 'expired',
};

const PAYMENT_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
  REFUNDED: 'refunded',
};

const SLOT_STATUS = {
  FREE: 'free',
  LOCKED: 'locked',
  BOOKED: 'booked',
  BLOCKED: 'blocked',
  PAST: 'past',
};

/** رزروهایی که سانس را «اشغال» می‌کنند — برای جلوگیری از رزرو همزمان */
const ACTIVE_SLOT_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING_PAYMENT,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.REFUND_PENDING,
];

/** نگاشت bookingStatus → فیلد legacy `status` برای سازگاری */
function legacyStatusFromBooking(bookingStatus) {
  switch (bookingStatus) {
    case BOOKING_STATUS.CONFIRMED:
    case BOOKING_STATUS.CHECKED_IN:
    case BOOKING_STATUS.COMPLETED:
    case BOOKING_STATUS.NO_SHOW:
      return 'paid';
    case BOOKING_STATUS.CANCELLED_BY_USER:
    case BOOKING_STATUS.CANCELLED_BY_OWNER:
    case BOOKING_STATUS.EXPIRED:
    case BOOKING_STATUS.REFUNDED:
    case BOOKING_STATUS.REFUND_PENDING:
      return 'cancelled';
    case BOOKING_STATUS.PAYMENT_FAILED:
    case BOOKING_STATUS.PENDING_PAYMENT:
    default:
      return 'pending';
  }
}

module.exports = {
  LOCK_DURATION_MS,
  SLOT_START_GRACE_MS,
  LAST_MINUTE_DEFAULTS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  SLOT_STATUS,
  ACTIVE_SLOT_BOOKING_STATUSES,
  legacyStatusFromBooking,
};
