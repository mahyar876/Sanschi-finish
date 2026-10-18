const mongoose = require('mongoose');

const otpChallengeSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  hash: { type: String, required: true },
  expiry: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  sendCount: { type: Number, default: 0 },
  sendWindowStart: { type: Date, default: null },
  lastSendAt: { type: Date, default: null },
});

otpChallengeSchema.index({ expiry: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpChallenge', otpChallengeSchema);
