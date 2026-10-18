const rateLimit = require('express-rate-limit');

const limitMessage = {
  success: false,
  message: 'درخواست‌های زیاد؛ لطفاً چند دقیقه بعد دوباره تلاش کنید',
};

function parseMax(envKey, fallback) {
  const n = parseInt(process.env[envKey] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const isProd = process.env.NODE_ENV === 'production';

/** ورود / OTP — سخت‌گیر */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseMax('RATE_LIMIT_AUTH_MAX', 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage,
});

/** ثبت‌نام — در dev سقف بالاتر برای تست رقابت همزمان؛ prod محدودتر */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseMax('RATE_LIMIT_REGISTER_MAX', isProd ? 20 : 200),
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage,
});

/** @deprecated use loginLimiter / registerLimiter on routes */
const authLimiter = loginLimiter;

/** API عمومی — هر IP؛ ۱۰۰ کاربر پشت IPهای مختلف مشکلی ندارند */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseMax('RATE_LIMIT_API_MAX', 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage,
  skip: (req) => {
    const url = req.originalUrl?.split('?')[0] || req.path || '';
    return (
      url.startsWith('/api/health') ||
      url.startsWith('/api/auth')
    );
  },
});

/** ایجاد رزرو — محدودیت per-user برای جلوگیری از spam و race abuse */
const reservationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseMax('RATE_LIMIT_RESERVATION_MAX', 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage,
  keyGenerator(req) {
    const uid = req.user?._id?.toString();
    if (uid) return `res:${uid}`;
    return req.ip || 'unknown';
  },
});

/** پرداخت — جلوگیری از کلیک تکراری و debit موازی */
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseMax('RATE_LIMIT_PAY_MAX', 15),
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage,
  keyGenerator(req) {
    const uid = req.user?._id?.toString();
    if (uid) return `pay:${uid}`;
    return req.ip || 'unknown';
  },
});

module.exports = {
  authLimiter,
  loginLimiter,
  registerLimiter,
  apiLimiter,
  reservationLimiter,
  paymentLimiter,
};
