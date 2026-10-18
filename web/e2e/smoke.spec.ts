import { test, expect } from '@playwright/test';

test('صفحهٔ اصلی بارگذاری می‌شود', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.ok()).toBeTruthy();
  await expect(page.locator('body')).not.toBeEmpty();
});

test('گالری و رزرو بدون خطای ۵۰۰', async ({ page }) => {
  for (const path of ['/gallery', '/reserve', '/login']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBeLessThan(500);
  }
});
