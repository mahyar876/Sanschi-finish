const crypto = require('crypto');

const TTL_MS = parseInt(process.env.ASSISTANT_SESSION_TTL_MS || String(2 * 60 * 60 * 1000), 10);
const MAX_SESSIONS = parseInt(process.env.ASSISTANT_SESSION_MAX || '8000', 10);

/** @type {Map<string, { intent: object, updatedAt: number, userId?: string }>} */
const sessions = new Map();

function prune() {
  const now = Date.now();
  for (const [id, row] of sessions) {
    if (now - row.updatedAt > TTL_MS) sessions.delete(id);
  }
  if (sessions.size <= MAX_SESSIONS) return;
  const sorted = [...sessions.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  const drop = sorted.length - MAX_SESSIONS;
  for (let i = 0; i < drop; i++) sessions.delete(sorted[i][0]);
}

function newSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

function getSession(sessionId) {
  if (!sessionId) return null;
  prune();
  const row = sessions.get(sessionId);
  if (!row) return null;
  if (Date.now() - row.updatedAt > TTL_MS) {
    sessions.delete(sessionId);
    return null;
  }
  return row;
}

function saveSession(sessionId, data) {
  prune();
  const id = sessionId || newSessionId();
  sessions.set(id, { ...data, updatedAt: Date.now() });
  return id;
}

module.exports = { getSession, saveSession, newSessionId };
