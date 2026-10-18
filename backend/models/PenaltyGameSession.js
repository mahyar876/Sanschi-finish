const mongoose = require('mongoose');

const penaltyGameSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  clientIp: { type: String, default: '' },
});

penaltyGameSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PenaltyGameSession', penaltyGameSessionSchema);
