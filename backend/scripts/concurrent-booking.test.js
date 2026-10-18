/**
 * تست رزرو همزمان — فقط با API + MongoDB لوکال
 * usage: node scripts/concurrent-booking.test.js [baseUrl] [parallel=25]
 */
const BASE = (process.argv[2] || 'http://localhost:5000').replace(/\/$/, '');
const PARALLEL = Math.min(parseInt(process.argv[3] || '25', 10) || 25, 40);

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function registerUser(i) {
  const ts = Date.now() + i;
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: {
      name: `Race ${i}`,
      phone: `0913${String(ts).slice(-7)}`,
      email: `race${ts}${i}@test.local`,
      password: 'TestPass123!',
    },
  });
  return reg;
}

async function main() {
  console.log(`Concurrent booking test → ${BASE} (${PARALLEL} workers)\n`);

  const health = await api('/api/health');
  if (health.status !== 200 || !health.json?.db) {
    console.error('FAIL: API/DB not ready — start backend + MongoDB');
    process.exit(1);
  }

  const catalog = await api('/api/pitches');
  const pitchId = catalog.json?.pitches?.[0]?._id;
  if (!pitchId) {
    console.error('FAIL: no pitches — run npm run seed');
    process.exit(1);
  }

  const date = tomorrowIso();
  const slots = await api(`/api/pitches/${pitchId}/slots?date=${date}`);
  const slot = (slots.json?.slots || []).find((s) => s.bookable === true && s.slotIndex != null);
  if (!slot) {
    console.error('FAIL: no free slot for tomorrow');
    process.exit(1);
  }

  const users = await Promise.all(
    Array.from({ length: PARALLEL }, (_, i) => registerUser(i)),
  );
  const tokens = users.filter((u) => u.status === 201 && u.json?.token).map((u) => u.json.token);
  if (tokens.length < 2) {
    const sample = users.find((u) => u.status !== 201);
    console.error(
      'FAIL: could not register test users',
      sample ? `(e.g. status=${sample.status} ${sample.json?.message || ''})` : '',
    );
    console.error('Hint: if rate-limited, restart API or set RATE_LIMIT_REGISTER_MAX in dev.');
    process.exit(1);
  }

  const results = await Promise.all(
    tokens.map((token) =>
      api('/api/reservations', {
        method: 'POST',
        token,
        body: { pitchId, date, slotIndex: slot.slotIndex },
      }),
    ),
  );

  const created = results.filter((r) => r.status === 201 && r.json?.success);
  const conflicts = results.filter((r) => r.status === 409);
  const other = results.filter((r) => r.status !== 201 && r.status !== 409);

  console.log(`201 created: ${created.length}`);
  console.log(`409 conflict: ${conflicts.length}`);
  console.log(`other: ${other.length}`);

  const pass = created.length === 1 && conflicts.length === tokens.length - 1 && other.length === 0;
  console.log(pass ? '\nPASS: exactly one reservation won the race' : '\nFAIL: unexpected race outcome');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
