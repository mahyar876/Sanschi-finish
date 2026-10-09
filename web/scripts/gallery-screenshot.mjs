import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '..', 'public', 'dev', 'gallery-fixed.png');
const url = process.argv[2] || 'http://localhost:3001/gallery';

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForSelector('.venue-grid .venue-card', { timeout: 15000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log('Saved', out);
