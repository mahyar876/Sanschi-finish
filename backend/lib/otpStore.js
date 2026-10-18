const crypto = require('crypto');
const mongoose = require('mongoose');
const OtpChallenge = require('../models/OtpChallenge');

/** fallback in-process when DB unavailable (tests only) */
const memoryStore = new Map();

const OTP_TTL_MS = parseInt(process.env.OTP_TTL_MS || '', 10) || 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_VERIFY_ATTEMPTS || '', 10) || 5;
const OTP_SEND_COOLDOWN_MS =
  parseInt(process.env.OTP_SEND_COOLDOWN_MS || '', 10) || 60 * 1000;
const OTP_MAX_SENDS_PER_WINDOW =
  parseInt(process.env.OTP_MAX_SENDS_PER_WINDOW || '', 10) || 5;
const OTP_SEND_WINDOW_MS = 15 * 60 * 1000;

function dbReady() {
  return mongoose.connection.readyState === 1;
}

function hashOtp(phone, otp) {
  const pepper = process.env.OTP_PEPPER || process.env.JWT_SECRET || 'otp-dev-pepper';
  return crypto.createHmac('sha256', pepper).update(`${phone}:${otp}`).digest('hex');
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function pruneMemory() {
  const now = Date.now();
  for (const [phone, record] of memoryStore) {
    if (!record || record.expiry <= now) memoryStore.delete(phone);
  }
}

function checkSendLimits(prev, now) {
  if (prev && prev.lastSendAt && now - prev.lastSendAt < OTP_SEND_COOLDOWN_MS) {
    return {
      ok: false,
      code: 429,
      message: 'لطفاً یک دقیقه بعد دوباره درخواست کد دهید',
    };
  }

  let sendWindowStart = prev?.sendWindowStart || now;
  let sendCount = prev?.sendCount || 0;
  if (!prev?.sendWindowStart || now - prev.sendWindowStart >= OTP_SEND_WINDOW_MS) {
    sendWindowStart = now;
    sendCount = 0;
  }
  if (sendCount >= OTP_MAX_SENDS_PER_WINDOW) {
    return {
      ok: false,
      code: 429,
      message: 'تعداد درخواست کد بیش از حد مجاز است. بعداً تلاش کنید.',
    };
  }
  return { ok: true, sendWindowStart, sendCount: sendCount + 1 };
}

async function issueOtp(phone) {
  const now = Date.now();
  const otp = generateOtp();
  const expiryDate = new Date(now + OTP_TTL_MS);
  const hash = hashOtp(phone, otp);

  if (dbReady()) {
    const prev = await OtpChallenge.findOne({ phone }).lean();
    const limits = checkSendLimits(
      prev
        ? {
            lastSendAt: prev.lastSendAt?.getTime(),
            sendWindowStart: prev.sendWindowStart?.getTime(),
            sendCount: prev.sendCount,
          }
        : null,
      now,
    );
    if (!limits.ok) return limits;

    await OtpChallenge.findOneAndUpdate(
      { phone },
      {
        hash,
        expiry: expiryDate,
        attempts: 0,
        sendCount: limits.sendCount,
        sendWindowStart: new Date(limits.sendWindowStart),
        lastSendAt: new Date(now),
      },
      { upsert: true, new: true },
    );
    return { ok: true, otp };
  }

  if (memoryStore.size > 2000) pruneMemory();
  const prevMem = memoryStore.get(phone);
  const limits = checkSendLimits(prevMem, now);
  if (!limits.ok) return limits;

  memoryStore.set(phone, {
    hash,
    expiry: now + OTP_TTL_MS,
    attempts: 0,
    sendCount: limits.sendCount,
    lastSendAt: now,
    sendWindowStart: limits.sendWindowStart,
  });
  return { ok: true, otp };
}

async function verifyOtp(phone, otp) {
  const now = Date.now();

  if (dbReady()) {
    const doc = await OtpChallenge.findOne({ phone });
    if (!doc) {
      return { ok: false, code: 400, message: 'کد نامعتبر یا منقضی شده است' };
    }
    if (doc.expiry.getTime() <= now) {
      await OtpChallenge.deleteOne({ phone });
      return { ok: false, code: 400, message: 'کد منقضی شده است' };
    }
    if (doc.attempts >= OTP_MAX_ATTEMPTS) {
      await OtpChallenge.deleteOne({ phone });
      return {
        ok: false,
        code: 429,
        message: 'تلاش‌های زیاد. دوباره درخواست کد دهید.',
      };
    }

    const expected = Buffer.from(doc.hash, 'hex');
    const actual = Buffer.from(hashOtp(phone, String(otp || '')), 'hex');
    const match =
      expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    if (!match) {
      doc.attempts += 1;
      await doc.save();
      return { ok: false, code: 400, message: 'کد اشتباه است' };
    }
    await OtpChallenge.deleteOne({ phone });
    return { ok: true };
  }

  const record = memoryStore.get(phone);
  if (!record) {
    return { ok: false, code: 400, message: 'کد نامعتبر یا منقضی شده است' };
  }
  if (now > record.expiry) {
    memoryStore.delete(phone);
    return { ok: false, code: 400, message: 'کد منقضی شده است' };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    memoryStore.delete(phone);
    return {
      ok: false,
      code: 429,
      message: 'تلاش‌های زیاد. دوباره درخواست کد دهید.',
    };
  }

  const expected = Buffer.from(record.hash, 'hex');
  const actual = Buffer.from(hashOtp(phone, String(otp || '')), 'hex');
  const match =
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!match) {
    record.attempts += 1;
    return { ok: false, code: 400, message: 'کد اشتباه است' };
  }
  memoryStore.delete(phone);
  return { ok: true };
}

module.exports = {
  issueOtp,
  verifyOtp,
  OTP_TTL_MS,
};
