/**
 * آزمون دود امنیتی — فقط روی محیط لوکال/ staging اجرا کنید.
 * usage: node scripts/security-smoke-test.js [baseUrl]
 */
const BASE = (process.argv[2] || process.env.BASE_URL || 'http://localhost:5000').replace(
  /\/$/,
  '',
);

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log(`Security smoke tests → ${BASE}\n`);

  const health = await req('/api/health/live');
  record('GET /api/health/live', health.status === 200 && health.body?.live === true);

  const adminRes = await req('/api/reservations', { method: 'GET' });
  record(
    'Admin list without token blocked',
    adminRes.status === 401,
    `status=${adminRes.status}`,
  );

  const pitchCreate = await req('/api/pitches', {
    method: 'POST',
    body: JSON.stringify({ name: 'hack-test' }),
  });
  record(
    'POST /api/pitches without auth blocked',
    pitchCreate.status === 401 || pitchCreate.status === 403,
    `status=${pitchCreate.status}`,
  );

  const reserveNoAuth = await req('/api/reservations', {
    method: 'POST',
    body: JSON.stringify({ pitchId: '507f1f77bcf86cd799439011', slotIndex: 0, date: '1404/01/01' }),
  });
  record(
    'POST /api/reservations without token blocked',
    reserveNoAuth.status === 401,
    `status=${reserveNoAuth.status}`,
  );

  const supportNoAuth = await req('/api/support/tickets', {
    method: 'POST',
    body: JSON.stringify({ subject: 'test', message: 'hello world test' }),
  });
  record(
    'POST /api/support/tickets without token blocked',
    supportNoAuth.status === 401,
    `status=${supportNoAuth.status}`,
  );

  const badOrigin = await fetch(`${BASE}/api/pitches`, {
    method: 'GET',
    headers: { Origin: 'https://evil.example' },
  });
  const corsHeader = badOrigin.headers.get('access-control-allow-origin');
  record(
    'CORS blocks unknown origin (no ACAO header)',
    !corsHeader || corsHeader !== 'https://evil.example',
    `acao=${corsHeader || 'none'}`,
  );

  const otpSend = await req('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: '09123456789' }),
  });
  record(
    'send-otp uniform response for unknown phone',
    otpSend.status === 200 && otpSend.body?.success === true,
    `status=${otpSend.status}`,
  );

  const invalidOtp = await req('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: '09123456789', otp: '000000' }),
  });
  record(
    'verify-otp rejects bad code',
    invalidOtp.status === 400 || invalidOtp.status === 429,
    `status=${invalidOtp.status}`,
  );

  const penaltyNoSession = await req('/api/discounts/penalty-reward', {
    method: 'POST',
    body: JSON.stringify({ goalsScored: 5 }),
  });
  record(
    'penalty-reward requires sessionId',
    penaltyNoSession.status === 400,
    `status=${penaltyNoSession.status}`,
  );

  const session = await req('/api/discounts/penalty-reward/session', {
    method: 'POST',
    body: JSON.stringify({ difficulty: 'easy' }),
  });
  record(
    'penalty session issues sessionId',
    session.status === 200 && session.body?.sessionId,
    `status=${session.status}`,
  );

  const penaltyFakeSession = await req('/api/discounts/penalty-reward', {
    method: 'POST',
    body: JSON.stringify({ sessionId: 'invalid-session-id', goalsScored: 5 }),
  });
  record(
    'penalty-reward rejects invalid session',
    penaltyFakeSession.status === 400,
    `status=${penaltyFakeSession.status}`,
  );

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('Smoke test error:', e.message);
  process.exit(1);
});
