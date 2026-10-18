import { test, expect } from '@playwright/test';

const API = (process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

async function apiOk(request: import('@playwright/test').APIRequestContext): Promise<boolean> {
  try {
    const res = await request.get(`${API}/api/health`);
    const json = await res.json();
    return res.ok() && json?.success === true && json?.db === true;
  } catch {
    return false;
  }
}

test.describe('فلو API (نیاز به بک‌اند لوکال)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiOk(request)), 'API در دسترس نیست — backend را روی 5000 بالا بیاورید');
  });

  test('ثبت‌نام → رزرو → mock pay', async ({ request }) => {
    const ts = Date.now();
    const reg = await request.post(`${API}/api/auth/register`, {
      data: {
        name: 'E2E Flow',
        phone: `0912${String(ts).slice(-7)}`,
        email: `e2e${ts}@test.local`,
        password: 'TestPass123!',
      },
    });
    expect(reg.status()).toBe(201);
    const { token } = await reg.json();
    expect(token).toBeTruthy();

    const catalog = await request.get(`${API}/api/pitches`);
    expect(catalog.ok()).toBeTruthy();
    const pitches = (await catalog.json()).pitches as { _id: string }[];
    expect(pitches.length).toBeGreaterThan(0);
    const pitchId = pitches[0]._id;

    const d = new Date();
    d.setDate(d.getDate() + 1);
    const date = d.toISOString().slice(0, 10);

    const slotsRes = await request.get(`${API}/api/pitches/${pitchId}/slots?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(slotsRes.ok()).toBeTruthy();
    const slots = ((await slotsRes.json()).slots || []) as { slotIndex: number; bookable?: boolean }[];
    const slot = slots.find((s) => s.bookable && s.slotIndex != null);
    test.skip(!slot, 'سانs آزاد برای فردا نیست');

    const reserve = await request.post(`${API}/api/reservations`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { pitchId, date, slotIndex: slot!.slotIndex },
    });
    expect(reserve.status()).toBe(201);
    const rid = (await reserve.json()).reservation?.id as string;
    expect(rid).toBeTruthy();

    const pay = await request.post(`${API}/api/reservations/${rid}/pay`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { paymentMethod: 'mock' },
    });
    expect(pay.ok()).toBeTruthy();
    const payJson = await pay.json();
    expect(payJson.success).toBeTruthy();
  });
});

test('مسیرهای عمومی بدون ۵۰۰', async ({ page }) => {
  for (const path of ['/login', '/reserve/share', '/verify/SNS-TEST']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBeLessThan(500);
  }
});
