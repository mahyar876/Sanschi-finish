/**
 * Smoke: register → reserve → mock pay
 * usage: node scripts/flow-smoke.js [baseUrl]
 */
const BASE = (process.argv[2] || 'http://localhost:5000').replace(/\/$/, '');

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const fails = [];
  const ok = (name, cond, detail) => {
    const pass = Boolean(cond);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
    if (!pass) fails.push(name);
  };

  console.log(`Flow smoke → ${BASE}\n`);

  const ts = Date.now();
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Flow Smoke',
      phone: `0912${String(ts).slice(-7)}`,
      email: `flow${ts}@test.local`,
      password: 'TestPass123!',
    },
  });
  ok('register', reg.status === 201 && reg.json?.token, `status=${reg.status}`);
  const token = reg.json?.token;
  if (!token) process.exit(1);

  const catalog = await api('/api/pitches');
  ok('catalog', catalog.json?.count > 0, `count=${catalog.json?.count}`);
  const pitchId = catalog.json?.pitches?.[0]?._id;
  if (!pitchId) process.exit(1);

  const date = tomorrowIso();
  const slots = await api(`/api/pitches/${pitchId}/slots?date=${date}`, { token });
  const candidates = (slots.json?.slots || []).filter(
    (s) => s.bookable === true && s.slotIndex != null,
  );
  ok('slots', slots.status === 200 && candidates.length > 0, `n=${candidates.length}`);

  let rid = null;
  let reserved = false;
  for (const slot of candidates) {
    const reserve = await api('/api/reservations', {
      method: 'POST',
      token,
      body: { pitchId, date, slotIndex: slot.slotIndex },
    });
    if (reserve.status === 201 && reserve.json?.reservation?.id) {
      rid = reserve.json.reservation.id;
      reserved = true;
      break;
    }
  }
  ok('create reservation', reserved && rid, reserved ? `id=${rid}` : 'no free slot');

  if (rid) {
    const pay = await api(`/api/reservations/${rid}/pay`, {
      method: 'POST',
      token,
      body: { paymentMethod: 'mock' },
    });
    ok('mock pay', pay.status === 200 && pay.json?.success !== false, pay.json?.message);
  }

  const topup = await api('/api/wallet/topup', {
    method: 'POST',
    token,
    body: { amount: 2_000_000 },
  });
  ok('wallet topup', topup.status === 200 && topup.json?.balance >= 2_000_000, `bal=${topup.json?.balance}`);

  let rid2 = null;
  for (const slot of candidates) {
    const reserve = await api('/api/reservations', {
      method: 'POST',
      token,
      body: { pitchId, date, slotIndex: slot.slotIndex },
    });
    if (reserve.status === 201 && reserve.json?.reservation?.id) {
      rid2 = reserve.json.reservation.id;
      break;
    }
  }
  if (rid2) {
    const wpay = await api(`/api/reservations/${rid2}/pay`, {
      method: 'POST',
      token,
      body: { paymentMethod: 'wallet' },
    });
    ok(
      'wallet pay',
      wpay.status === 200 && wpay.json?.success !== false,
      wpay.json?.message || `bal=${wpay.json?.walletBalance}`,
    );
  } else {
    ok('wallet pay', false, 'no second free slot');
  }

  console.log(fails.length ? `\n${fails.length} failed` : '\nAll flow steps passed');
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
