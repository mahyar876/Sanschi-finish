const mongoose = require('mongoose');
const User = require('../models/User');
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

async function debitWalletForPayment(userId, reservationId, amount, note) {
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt < 1) {
    throw new Error('مبلغ نامعتبر است');
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('کاربر پیدا نشد');
    const balance = user.walletBalance || 0;
    if (balance < amt) {
      throw new Error('موجودی کیف پول کافی نیست');
    }

    user.walletBalance = balance - amt;
    await user.save({ session });

    await WalletTransaction.create(
      [
        {
          user: userId,
          type: 'payment',
          amount: amt,
          balanceAfter: user.walletBalance,
          reservation: reservationId,
          note: note || 'پرداخت رزرو',
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return user.walletBalance;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

async function listTransactions(userId, limit = 40) {
  return WalletTransaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('reservation', 'code date slotTime amount');
}

module.exports = {
  getWalletBalance,
  creditWallet,
  debitWalletForPayment,
  listTransactions,
};
