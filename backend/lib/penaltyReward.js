const crypto = require('crypto');
const PenaltyGameSession = require('../models/PenaltyGameSession');

const PENALTY_MAX_GOALS = 5;
const PENALTY_SESSION_TTL_MS =
  parseInt(process.env.PENALTY_SESSION_TTL_MS || '', 10) || 20 * 60 * 1000;
const isProd = process.env.NODE_ENV === 'production';
const PENALTY_MIN_PLAY_MS = (() => {
  const fromEnv = parseInt(process.env.PENALTY_MIN_PLAY_MS || '', 10);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  return isProd ? 45 * 1000 : 0;
})();

const PENALTY_REWARDS = {
  easy: { percent: 5, maxDiscountAmount: 700_000, minGoals: 5 },
  medium: { percent: 5, maxDiscountAmount: 1_000_000, minGoals: 5 },
  hard: { percent: 5, maxDiscountAmount: 1_500_000, minGoals: 5 },
};

function newSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

async function createPenaltySession(difficulty, clientIp = '') {
  const diff = String(difficulty || 'easy').toLowerCase();
  if (!PENALTY_REWARDS[diff]) {
    return { ok: false, code: 400, message: 'سطح دشواری نامعتبر است' };
  }
  const sessionId = newSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PENALTY_SESSION_TTL_MS);
  await PenaltyGameSession.create({
    sessionId,
    difficulty: diff,
    createdAt: now,
    expiresAt,
    clientIp: clientIp.slice(0, 64),
  });
  return { ok: true, sessionId, expiresAt, maxGoals: PENALTY_MAX_GOALS };
}

/**
 * @returns {{ ok: true, rule: object } | { ok: false, code: number, message: string }}
 */
async function validatePenaltyClaim(sessionId, goalsScored) {
  const goals = parseInt(goalsScored, 10);
  if (!Number.isFinite(goals) || goals < 0 || goals > PENALTY_MAX_GOALS) {
    return { ok: false, code: 400, message: 'امتیاز بازی نامعتبر است' };
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return { ok: false, code: 400, message: 'نشست بازی نامعتبر است' };
  }

  const now = new Date();
  const session = await PenaltyGameSession.findOneAndUpdate(
    {
      sessionId: sessionId.trim(),
      usedAt: null,
      expiresAt: { $gt: now },
    },
    { $set: { usedAt: now } },
    { new: true },
  );

  if (!session) {
    return {
      ok: false,
      code: 400,
      message: 'نشست بازی منقضی یا قبلاً استفاده شده است',
    };
  }

  if (now.getTime() - session.createdAt.getTime() < PENALTY_MIN_PLAY_MS) {
    return {
      ok: false,
      code: 400,
      message: 'زمان بازی کافی نیست. دوباره بازی کنید.',
    };
  }

  const rule = PENALTY_REWARDS[session.difficulty] || PENALTY_REWARDS.easy;
  if (goals < rule.minGoals) {
    return {
      ok: false,
      code: 400,
      message: 'برای دریافت کد، حداقل گل لازم را نزده‌اید',
    };
  }

  return { ok: true, rule };
}

module.exports = {
  PENALTY_REWARDS,
  PENALTY_MAX_GOALS,
  createPenaltySession,
  validatePenaltyClaim,
};
