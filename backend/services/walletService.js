const mongoose = require('mongoose');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const WalletTransaction = require('../models/WalletTransaction');

async function getWalletBalance(userId) {
  const user = await User.findById(userId).select('walletBalance');
  if (!user) throw new Error('کاربر پیدا نشد');
  return user.walletBalance || 0;
}

/**
 * @param {import('mongoose').ClientSession} [session]
 */
async function creditWallet(userId, amount, type, meta = {}, session) {
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt < 1) {
    throw new Error('مبلغ نامعتبر است');
  }

  const user = await User.findById(userId).session(session || null);
  if (!user) throw new Error('کاربر پیدا نشد');

  user.walletBalance = (user.walletBalance || 0) + amt;
  await user.save({ session: session || undefined });

  await WalletTransaction.create(
    [
      {
        user: userId,
        type,
        amount: amt,
        balanceAfter: user.walletBalance,
        reservation: meta.reservationId || null,
        note: meta.note || '',
      },
    ],
    { session: session || undefined },
  );

  return user.walletBalance;
}

function walletTxnUnsupportedError(err) {
  const msg = String(err?.message || '');
  return msg.includes('replica set') || msg.includes('Transaction numbers');
}

function allowWalletSequentialFallback(err) {
  if (process.env.WALLET_FORCE_TRANSACTIONS === 'true') return false;
  if (process.env.NODE_ENV === 'production') return false;
  return walletTxnUnsupportedError(err);
}

async function debitWalletCore(userId, reservationId, amt, note, session) {
  const opts = session ? { new: true, session } : { new: true };
  const claimed = await Reservation.findOneAndUpdate(
    {
      _id: reservationId,
      user: userId,
      paymentStatus: { $ne: 'successful' },
      $or: [
        { 'payment.walletAmount': null },
        { 'payment.walletAmount': { $exists: false } },
      ],
    },
    { $set: { 'payment.walletAmount': amt } },
    opts,
  );

  if (!claimed) {
    const again = session
      ? await Reservation.findById(reservationId).session(session)
      : await Reservation.findById(reservationId);
    const sameUser = again && again.user.toString() === userId.toString();
    if (sameUser && again.payment && again.payment.walletAmount) {
      const user = session
        ? await User.findById(userId).session(session)
        : await User.findById(userId);
      return { user, idempotent: true };
    }
    throw new Error('این رزرو قابل پرداخت با کیف پول نیست');
  }

  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: amt } },
    { $inc: { walletBalance: -amt } },
    opts,
  );
  if (!user) {
    await Reservation.updateOne(
      { _id: reservationId, 'payment.walletAmount': amt },
      { $set: { 'payment.walletAmount': null } },
    );
    throw new Error('موجودی کیف پول کافی نیست');
  }

  const txPayload = {
    user: userId,
    type: 'payment',
    amount: amt,
    balanceAfter: user.walletBalance,
    reservation: reservationId,
    note: note || 'پرداخت رزرو',
  };
  if (session) {
    await WalletTransaction.create([txPayload], { session });
  } else {
    await WalletTransaction.create(txPayload);
  }

  return { user, idempotent: false };
}

async function debitWalletForPaymentWithSession(userId, reservationId, amount, note) {
  const amt = Math.round(Number(amount));
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { user, idempotent } = await debitWalletCore(
      userId,
      reservationId,
      amt,
      note,
      session,
    );
    await session.commitTransaction();
    return user?.walletBalance || 0;
  } catch (e) {
    await session.abortTransaction().catch(() => {});
    throw e;
  } finally {
    session.endSession();
  }
}

async function debitWalletForPayment(userId, reservationId, amount, note) {
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt < 1) {
    throw new Error('مبلغ نامعتبر است');
  }
  if (!reservationId) throw new Error('رزرو نامعتبر است');

  try {
    return await debitWalletForPaymentWithSession(userId, reservationId, amount, note);
  } catch (e) {
    if (!allowWalletSequentialFallback(e)) throw e;
    const { user } = await debitWalletCore(userId, reservationId, amt, note, null);
    return user?.walletBalance || 0;
  }
}

async function listTransactions(userId, limit = 40) {
  return WalletTransaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('reservation', 'code date slotTime amount');
}

/** بازگشت وجه به کیف پول — فقط یک‌بار برای هر رزرو */
async function creditWalletRefundOnce(userId, reservationId, amount, note) {
  const exists = await WalletTransaction.findOne({
    user: userId,
    reservation: reservationId,
    type: 'refund',
  }).select('_id');
  if (exists) {
    return getWalletBalance(userId);
  }
  return creditWallet(userId, amount, 'refund', {
    reservationId,
    note: note || 'بازگشت وجه',
  });
}

function reservationPaidViaWallet(reservation) {
  if (!reservation?.payment) return false;
  if (reservation.payment.method === 'wallet') return true;
  const w = reservation.payment.walletAmount;
  return w != null && Number(w) > 0;
}

/** برگشت مبلغ کیف پول ثبت‌شده روی رزرو وقتی پرداخت کامل نشد */
async function rollbackWalletPayment(userId, reservationId) {
  const r = await Reservation.findById(reservationId).select('payment user');
  if (!r || r.user.toString() !== userId.toString()) return getWalletBalance(userId);
  const amt = r.payment?.walletAmount;
  if (!amt || Number(amt) < 1) return getWalletBalance(userId);

  await Reservation.updateOne(
    { _id: reservationId, 'payment.walletAmount': amt },
    { $set: { 'payment.walletAmount': null } },
  );
  return creditWallet(userId, amt, 'refund', {
    reservationId,
    note: 'برگشت وجه؛ پرداخت کامل نشد',
  });
}

module.exports = {
  getWalletBalance,
  creditWallet,
  debitWalletForPayment,
  listTransactions,
  creditWalletRefundOnce,
  reservationPaidViaWallet,
  rollbackWalletPayment,
};
