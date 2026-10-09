import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.BASE_URL || 'http://localhost:3000';
const outDir = path.join(process.cwd(), 'public', 'dev', 'responsive-showcase');

const viewports = [
  { id: 'iphone-se', label: 'iPhone SE', width: 375, height: 667 },
  { id: 'iphone-13', label: 'iPhone 13', width: 390, height: 844 },
  { id: 'iphone-landscape', label: 'iPhone landscape', width: 844, height: 390 },
  { id: 'ipad-mini', label: 'iPad Mini', width: 768, height: 1024 },
  { id: 'ipad-air', label: 'iPad Air', width: 820, height: 1180 },
  { id: 'desktop', label: 'Desktop', width: 1280, height: 800 },
];

const pages = [
  { path: '/', title: 'خانه' },
  { path: '/gallery', title: 'گالری' },
  { path: '/reserve?pitchId=demo-1', title: 'رزرو' },
  { path: '/gallery/futsal-aria-tehran', title: 'جزئیات زمین' },
  { path: '/login', title: 'ورود' },
];

function overflowCheck(page) {
  return page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    offenders: (() => {
      const doc = document.documentElement;
      const list = [];
      doc.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (r.right > doc.clientWidth + 1) {
          const tag = el.tagName.toLowerCase();
          const c =
            el.className && typeof el.className === 'string'
              ? `.${el.className.split(/\s+/)[0]}`
              : '';
          list.push(`${tag}${c}`);
        }
      });
      return [...new Set(list)].slice(0, 5);
    })(),
  }));
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

await mkdir(outDir, { recursive: true });

const browser = await launchBrowser();
const results = [];

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.width < 500 ? 2 : 1,
  });
  const page = await ctx.newPage();

  for (const p of pages) {
    const url = `${base}${p.path}`;
    const file = `${vp.id}--${p.path.replace(/[^\w]+/g, '_') || 'home'}.png`;
    let ok = true;
    let issues = [];
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
      if ((res?.status() ?? 0) >= 400) {
        ok = false;
        issues.push(`HTTP ${res?.status()}`);
      }
      await page.waitForTimeout(400);
      const ov = await overflowCheck(page);
      if (ov.scrollW > ov.clientW + 1) {
        ok = false;
        issues.push(`overflow ${ov.scrollW}>${ov.clientW}`);
        if (ov.offenders.length) issues.push(ov.offenders.join(', '));
      }
      await page.screenshot({
        path: path.join(outDir, file),
        fullPage: true,
      });
    } catch (e) {
      ok = false;
      issues.push(String(e.message || e));
    }
    results.push({
      viewport: vp.label,
      page: p.title,
      path: p.path,
      ok,
      issues,
      shot: `/dev/responsive-showcase/${file}`,
    });
  }
  await ctx.close();
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;

const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>رسپانسیو — سانس‌چی</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #07100d; color: #f0faf4; margin: 0; padding: 1rem; }
    h1 { font-size: 1.35rem; }
    .meta { color: #7fa98c; margin-bottom: 1.5rem; }
    .pass { color: #2ec476; font-weight: 700; }
    .fail { color: #e57373; font-weight: 700; }
    section { margin-bottom: 2rem; border: 1px solid rgba(38,179,106,.2); border-radius: 12px; padding: 1rem; }
    section h2 { margin: 0 0 1rem; font-size: 1.1rem; }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    figure { margin: 0; background: #0d1a14; border-radius: 8px; overflow: hidden; }
    figcaption { padding: 0.5rem 0.75rem; font-size: 0.85rem; display: flex; justify-content: space-between; gap: 0.5rem; }
    img { width: 100%; height: auto; display: block; border-bottom: 1px solid rgba(255,255,255,.06); }
    .badge-ok { color: #2ec476; }
    .badge-bad { color: #e57373; font-size: 0.75rem; }
  </style>
</head>
<body>
  <h1>گزارش رسپانسیو</h1>
  <p class="meta">${base} · ${new Date().toLocaleString('fa-IR')} · <span class="${failed ? 'fail' : 'pass'}">${passed}/${results.length} OK</span></p>
  ${viewports
    .map(
      (vp) => `<section>
    <h2>${vp.label} (${vp.width}×${vp.height})</h2>
    <div class="grid">
      ${results
        .filter((r) => r.viewport === vp.label)
        .map(
          (r) => `<figure>
        <img src="${r.shot}" alt="${r.page}" loading="lazy" />
        <figcaption>
          <span>${r.page}</span>
          <span class="${r.ok ? 'badge-ok' : 'badge-bad'}">${r.ok ? '✓' : r.issues.join(' · ')}</span>
        </figcaption>
      </figure>`,
        )
        .join('')}
    </div>
  </section>`,
    )
    .join('')}
</body>
</html>`;

await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
await writeFile(
  path.join(outDir, 'report.json'),
  JSON.stringify({ base, passed, failed, results }, null, 2),
  'utf8',
);

console.log(JSON.stringify({ passed, failed, report: '/dev/responsive-showcase/index.html' }));
process.exit(failed > 0 ? 1 : 0);
