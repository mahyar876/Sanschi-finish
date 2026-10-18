const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['topup', 'payment', 'refund', 'admin_credit', 'admin_debit'],
    required: true,
  },
  amount: { type: Number, required: true, min: 1 },
  balanceAfter: { type: Number, required: true, min: 0 },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null,
  },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
