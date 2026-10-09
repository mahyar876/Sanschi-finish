const DiscountCode = require('../models/DiscountCode');

async function validateDiscountCode(code, pitchId, basePrice) {
  if (!code || !String(code).trim()) {
    return { ok: false, message: 'کد تخفیف را وارد کنید' };
  }
  const normalized = String(code).trim().toUpperCase();
  const doc = await DiscountCode.findOne({ code: normalized });
  if (!doc || !doc.active) {
    return { ok: false, message: 'کد تخفیف معتبر نیست' };
  }
  if (doc.expiresAt && doc.expiresAt < new Date()) {
    return { ok: false, message: 'این کد تخفیف منقضی شده است' };
  }
  if (doc.usedCount >= doc.maxUses) {
    return { ok: false, message: 'ظرفیت استفاده از این کد تمام شده است' };
  }
  if (doc.pitch && pitchId && doc.pitch.toString() !== pitchId.toString()) {
    return { ok: false, message: 'این کد برای این مجموعه معتبر نیست' };
  }
  let discountAmount = Math.round((basePrice * doc.percent) / 100);
  if (doc.maxDiscountAmount != null && doc.maxDiscountAmount > 0) {
    discountAmount = Math.min(discountAmount, doc.maxDiscountAmount);
  }
  return {
    ok: true,
    code: doc.code,
    percent: doc.percent,
    discountAmount,
    discountId: doc._id,
  };
}

async function consumeDiscountCode(discountId) {
  await DiscountCode.updateOne({ _id: discountId }, { $inc: { usedCount: 1 } });
}

function randomPenaltyCodeSuffix(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rnd = '';
  for (let i = 0; i < len; i++) {
    rnd += chars[Math.floor(Math.random() * chars.length)];
  }
  return rnd;
}

async function createPenaltyDiscountCode({ percent, maxDiscountAmount, expiresAt }) {
  const pct = Math.min(100, Math.max(1, parseInt(percent, 10) || 5));
  let code;
  for (let attempt = 0; attempt < 8; attempt++) {
    code = `SNS${pct}-${randomPenaltyCodeSuffix()}`.toUpperCase();
    const exists = await DiscountCode.findOne({ code }).lean();
    if (!exists) break;
    code = null;
  }
  if (!code) {
    throw new Error('ساخت کد تخفیف ممکن نشد');
  }
  const doc = await DiscountCode.create({
    code,
    percent: pct,
    maxUses: 1,
    maxDiscountAmount: maxDiscountAmount || null,
    expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    active: true,
  });
  return doc;
}

module.exports = {
  validateDiscountCode,
  consumeDiscountCode,
  createPenaltyDiscountCode,
};
