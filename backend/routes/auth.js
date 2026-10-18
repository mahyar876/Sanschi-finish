const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, signToken } = require('../middleware/authController');
const { issueOtp, verifyOtp, getFixedOtpCode } = require('../lib/otpStore');
const { sendSms } = require('../services/sms');
const { loginLimiter, registerLimiter } = require('../lib/rateLimits');

// ── پاسخ با توکن ──
function sendToken(res, user, statusCode = 200) {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    },
  });
}

const isProd = process.env.NODE_ENV === 'production';

function clientErrorMessage(err, fallback = 'خطای سرور') {
  if (isProd) return fallback;
  return err?.message || fallback;
}

// ─────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  if (!isProd) {
    console.log('📥 REGISTER STARTED');
  }

  try {
    const { name, phone, email, password } = req.body;

    const exists = await User.findOne({ phone });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: 'این شماره قبلاً ثبت شده' });
    }

    const emailValue =
      email && email.trim() !== '' ? email.trim().toLowerCase() : undefined;

    const user = await User.create({
      name: String(name || '').trim(),
      phone: String(phone || '').trim(),
      ...(emailValue ? { email: emailValue } : {}),
      ...(password ? { password } : {}),
    });

    const { linkApprovedApplicationsForPhone } = require('../services/ownerApplicationReview');
    await linkApprovedApplicationsForPhone(phone);
    const refreshed = await User.findById(user._id);

    console.log('✅ User created:', user._id);
    sendToken(res, refreshed || user, 201);
  } catch (err) {
    console.error('❌ REGISTER ERROR:', err.message);
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors)
        .map((e) => e.message)
        .join(' | ');
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(500).json({ success: false, message: clientErrorMessage(err) });
  }
});

// ─────────────────────────────────────
// POST /api/auth/login  (ایمیل + رمز)
// ─────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'ایمیل و رمز عبور الزامی است' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select(
      '+password',
    );

    if (!user || !user.password) {
      return res
        .status(401)
        .json({ success: false, message: 'اطلاعات اشتباه است' });
    }

    const ok = await user.comparePassword(password);

    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: 'اطلاعات اشتباه است' });
    }

    sendToken(res, user);
  } catch (err) {
    console.error('❌ LOGIN ERROR:', err.message);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/auth/send-otp
// OTP فقط تو console چاپ میشه — لوکال دستی وارد کن
// ─────────────────────────────────────
router.post('/send-otp', loginLimiter, async (req, res) => {
  const uniformOk = {
    success: true,
    message: 'در صورت ثبت بودن شماره، کد ارسال می‌شود',
  };
  try {
    const phone = String(req.body?.phone || '').trim();
    if (!/^09[0-9]{9}$/.test(phone)) {
      return res
        .status(400)
        .json({ success: false, message: 'شماره معتبر نیست' });
    }

    const userExists = await User.findOne({ phone }).select('_id');
    if (!userExists) {
      if (!isProd) {
        console.log(
          `[OTP dev] ${phone} در دیتابیس ثبت نیست — کد صادر نشد (پاسخ API مثل حالت موفق است).`,
        );
      }
      return res.json(uniformOk);
    }

    const issued = await issueOtp(phone);
    if (!issued.ok) {
      return res.status(issued.code).json({
        success: false,
        message: issued.message,
      });
    }

    const { otp } = issued;
    const smsText = `کد ورود سانس‌چی: ${otp}\nاین کد تا چند دقیقه معتبر است.`;

    if (process.env.SMS_ENABLED === 'true') {
      await sendSms(phone, smsText);
      if (!isProd) {
        console.log(`[OTP dev] SMS_ENABLED=true — code for ${phone}: ${otp}`);
      }
    } else if (!isProd) {
      console.log(`[OTP dev] phone=${phone} code issued (see server log policy)`);
      console.log(`[OTP dev] code for ${phone}: ${otp}`);
    } else {
      console.warn('SMS_ENABLED=false in production — OTP not delivered');
    }

    const fixed = getFixedOtpCode();
    const payload = { ...uniformOk };
    if (fixed) {
      payload.dev_otp = fixed;
      payload.message = `کد ورود (موقت): ${fixed}`;
    }
    res.json(payload);
  } catch (err) {
    console.error('send-otp error:', err.message);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// POST /api/auth/verify-otp
// ─────────────────────────────────────
router.post('/verify-otp', loginLimiter, async (req, res) => {
  try {
    const phone = String(req.body?.phone || '').trim();
    const otp = String(req.body?.otp || '').trim();
    if (!/^09[0-9]{9}$/.test(phone)) {
      return res
        .status(400)
        .json({ success: false, message: 'شماره معتبر نیست' });
    }
    if (!/^[0-9]{6}$/.test(otp)) {
      return res
        .status(400)
        .json({ success: false, message: 'کد نامعتبر است' });
    }

    const checked = await verifyOtp(phone, otp);
    if (!checked.ok) {
      return res.status(checked.code).json({
        success: false,
        message: checked.message,
      });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ابتدا ثبت‌نام کنید',
      });
    }

    const { linkApprovedApplicationsForPhone } = require('../services/ownerApplicationReview');
    await linkApprovedApplicationsForPhone(phone);
    user = (await User.findById(user._id)) || user;

    sendToken(res, user);
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ─────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      email: req.user.email,
      role: req.user.role,
      walletBalance: req.user.walletBalance || 0,
    },
  });
});

// ─────────────────────────────────────
// PATCH /api/auth/me
// ─────────────────────────────────────
router.patch('/me', protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (email !== undefined) patch.email = email;
    const user = await User.findByIdAndUpdate(req.user._id, patch, {
      new: true,
      runValidators: true,
    }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: clientErrorMessage(err, 'داده نامعتبر') });
  }
});

module.exports = router;
