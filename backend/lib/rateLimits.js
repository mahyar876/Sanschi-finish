const rateLimit = require('express-rate-limit');

const limitMessage = {
  success: false,
  message: 'درخواست‌های زیاد؛ لطفاً چند دقیقه بعد دوباره تلاش کنید',
};

function parseMax(envKey, fallback) {
  const n = parseInt(process.env[envKey] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** ورود / OTP — سخت‌گیر */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseMax('RATE_LIMIT_AUTH_MAX', 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage,
});

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

module.exports = { authLimiter, apiLimiter };
