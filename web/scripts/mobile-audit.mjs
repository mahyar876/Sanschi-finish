import { chromium, devices } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.BASE_URL || 'http://localhost:3000';
const outDir = path.join(process.cwd(), 'scripts', 'mobile-audit-output');
const iPhone = devices['iPhone 13'];

const publicPaths = [
  '/',
  '/gallery',
  '/gallery/futsal-aria-tehran',
  '/reserve',
  '/reserve/confirm?pitchId=demo-1&pitchName=Test&slotIndex=0&slotTime=18&date=1403/01/01&name=Test&phone=09120000000&amount=520000',
  '/about',
  '/for-owners',
  '/terms',
  '/login',
  '/penalty',
  '/payment?reservationId=mock-1&amount=520000&pitchName=Test&date=2025-01-01&time=18:00&name=Test',
];

const authPaths = [
  '/profile',
  '/player',
  '/player/reservations',
  '/owner',
  '/finance',
  '/settlement',
  '/admin',
  '/admin/finance',
];

function overflowCheck(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [];
    doc.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.right > doc.clientWidth + 1) {
        const tag = el.tagName.toLowerCase();
        const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(/\s+/)[0]}` : '';
        offenders.push(`${tag}${cls} right=${Math.round(r.right)}`);
      }
    });
    return {
      scrollW: doc.scrollWidth,
      clientW: doc.clientWidth,
      offenders: [...new Set(offenders)].slice(0, 8),
    };
  });
}

async function auditPage(page, label, pathname) {
  const url = pathname.startsWith('http') ? pathname : `${base}${pathname}`;
  const consoleErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  page.on('console', onConsole);

  let status = 0;
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    status = res?.status() ?? 0;
    await page.waitForTimeout(800);
  } catch (e) {
    page.off('console', onConsole);
    return { label, pathname, ok: false, error: `navigation: ${e.message}` };
  }

  const overflow = await overflowCheck(page);
  const safeName = label.replace(/[^\w\u0600-\u06FF-]+/g, '_');
  await page.screenshot({ path: path.join(outDir, `${safeName}.png`), fullPage: true });

  page.off('console', onConsole);

  const issues = [];
  if (status >= 400) issues.push(`HTTP ${status}`);
  if (overflow.scrollW > overflow.clientW + 1) {
    issues.push(`overflow ${overflow.scrollW}px > ${overflow.clientW}px`);
    if (overflow.offenders.length) issues.push(`nodes: ${overflow.offenders.join(', ')}`);
  }
  const noisy = consoleErrors.filter(
    (e) => !/favicon\.ico|Failed to load resource.*404/i.test(e),
  );
  if (noisy.length) issues.push(`console: ${noisy.slice(0, 3).join(' | ')}`);

  return {
    label,
    pathname,
    ok: issues.length === 0,
    status,
    overflow,
    issues,
  };
}

async function demoLogin(page, role) {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByRole('button', { name: role === 'admin' ? 'ورود مدیر' : 'ورود بازیکن' }).click();
  await page.waitForURL(/\/(player|profile|admin|owner)/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    try {
      return await chromium.launch({ channel: 'msedge', headless: true });
    } catch {
      return await chromium.launch();
    }
  }
}

const browser = await launchBrowser();
await mkdir(outDir, { recursive: true });

const results = [];

const pubCtx = await browser.newContext({ ...iPhone });
const pubPage = await pubCtx.newPage();

for (const pathname of publicPaths) {
  const label = `public-${pathname.split('?')[0] || 'root'}`;
  results.push(await auditPage(pubPage, label, pathname));
}

await pubPage.getByRole('button', { name: /باز کردن منو|☰/ }).click();
await pubPage.waitForTimeout(300);
const menuOpen = await pubPage.locator('#mobile-nav.open').isVisible();
if (!menuOpen) {
  results.push({
    label: 'mobile-nav',
    pathname: '/',
    ok: false,
    issues: ['mobile menu did not open'],
  });
} else {
  results.push({ label: 'mobile-nav', pathname: '/', ok: true, issues: [] });
}

await pubCtx.close();

for (const role of ['user', 'admin']) {
  const ctx = await browser.newContext({ ...iPhone });
  const page = await ctx.newPage();
  await demoLogin(page, role);
  for (const pathname of authPaths) {
    if (role === 'user' && pathname.startsWith('/admin')) continue;
    const label = `${role}-${pathname.replace(/\//g, '_')}`;
    results.push(await auditPage(page, label, pathname));
  }
  await ctx.close();
}

const iPad = devices['iPad Mini'];
const tabCtx = await browser.newContext({ ...iPad });
const tabPage = await tabCtx.newPage();
for (const pathname of ['/', '/gallery', '/reserve', '/player']) {
  const label = `tablet-${pathname.replace(/\//g, '_') || 'root'}`;
  results.push(await auditPage(tabPage, label, pathname));
}
await tabCtx.close();

await browser.close();

const report = {
  device: 'iPhone 13 + iPad Mini',
  base,
  at: new Date().toISOString(),
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
  results,
};

await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

console.log(JSON.stringify({ passed: report.passed, failed: report.failed }, null, 2));
for (const r of results.filter((x) => !x.ok)) {
  console.error(`FAIL ${r.label} (${r.pathname}): ${(r.issues || [r.error]).join('; ')}`);
}

process.exit(report.failed > 0 ? 1 : 0);
