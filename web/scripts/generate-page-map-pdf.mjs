import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '../../docs');
const htmlPath = path.join(docsDir, 'sakhtar-safahat-sanschii.html');
const pdfPath = path.join(docsDir, 'sakhtar-safahat-sanschii.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '14mm', bottom: '14mm', left: '10mm', right: '10mm' },
});
await browser.close();
console.log('PDF written:', pdfPath);
