import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://localhost:3000';
const url = `${base}/penalty-frame.html`;

const devices = [
  { name: 'iPhone 13', width: 390, height: 844 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone landscape', width: 844, height: 390 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Air', width: 820, height: 1180 },
  { name: 'iPad Pro 11', width: 834, height: 1194 },
  { name: 'Desktop narrow', width: 1024, height: 768 },
];

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return await chromium.launch();
  }
}

const browser = await launchBrowser();
const fails = [];

for (const d of devices) {
  const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    sh: document.documentElement.scrollHeight,
    ch: document.documentElement.clientHeight,
  }));
  if (m.sw > m.cw + 1) {
    fails.push(`${d.name}: horizontal ${m.sw}>${m.cw}`);
  }
  const diffVisible = await page.locator('.diff-screen').isVisible();
  if (!diffVisible) fails.push(`${d.name}: diff screen not visible`);
  await ctx.close();
}

await browser.close();
if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
console.log('OK penalty responsive:', devices.map((d) => d.name).join(', '));
