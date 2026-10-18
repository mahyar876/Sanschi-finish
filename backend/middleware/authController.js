const jwt = require('jsonwebtoken');
const User = require('../models/User');

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set (min 32 chars) in production');
    }
    return secret || 'dev-only-insecure-jwt-secret-change-me';
  }
  return secret;
}

// ── محافظت از route (لاگین لازم) ──
exports.protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'ابتدا وارد شوید' });
    }

    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret());

    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'کاربر پیدا نشد' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'توکن نامعتبر یا منقضی شده' });
  }
};

/** JWT اختیاری — برای دستیار و مسیرهای عمومی که با لاگین بهتر کار می‌کنند */
exports.optionalAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return next();
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret());
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch {
    /* توکن نامعتبر — مثل مهمان ادامه می‌دهیم */
  }
  next();
};

// ── فقط ادمین ──
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'دسترسی ندارید' });
  }
  next();
};

// ── ساخت JWT ──
exports.signToken = (id) => {
  return jwt.sign({ id }, jwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};
