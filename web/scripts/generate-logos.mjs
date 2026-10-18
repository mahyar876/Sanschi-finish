/**
 * Builds logo SVGs with embedded Vazirmatn so Persian renders without system fonts.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/assets/logo');
const FONT_SRC = path.join(
  __dirname,
  '../node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-800-normal.woff2'
);
const WORD = 'سانس\u200cچی';

function svgWithEmbeddedFont({ viewBox, textX, textY, fontSize, fontB64 }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${WORD}">
  <defs>
    <style type="text/css"><![CDATA[
      @font-face {
        font-family: 'VazirmatnLogo';
        font-style: normal;
        font-weight: 800;
        src: url('data:font/woff2;base64,${fontB64}') format('woff2');
      }
    ]]></style>
  </defs>
  <text
    x="${textX}"
    y="${textY}"
    text-anchor="middle"
    direction="rtl"
    unicode-bidi="embed"
    font-family="VazirmatnLogo, sans-serif"
    font-size="${fontSize}"
    font-weight="800"
    fill="#26b36a"
  >${WORD}</text>
</svg>
`;
}

function main() {
  if (!fs.existsSync(FONT_SRC)) {
    console.error('Missing font. Run: npm install @fontsource/vazirmatn --save-dev');
    process.exit(1);
  }

  const fontB64 = fs.readFileSync(FONT_SRC).toString('base64');
  const fontsDir = path.join(OUT_DIR, 'fonts');
  fs.mkdirSync(fontsDir, { recursive: true });
  fs.copyFileSync(FONT_SRC, path.join(fontsDir, 'vazirmatn-arabic-800.woff2'));

  fs.writeFileSync(
    path.join(OUT_DIR, 'sanschii-wordmark-simple.svg'),
    svgWithEmbeddedFont({
      viewBox: '0 0 1200 320',
      textX: 600,
      textY: 210,
      fontSize: 170,
      fontB64,
    }),
    'utf8'
  );

  fs.writeFileSync(
    path.join(OUT_DIR, 'sanschii-insta-word-simple.svg'),
    svgWithEmbeddedFont({
      viewBox: '0 0 512 512',
      textX: 256,
      textY: 290,
      fontSize: 150,
      fontB64,
    }),
    'utf8'
  );

  console.log('OK: logos with embedded Vazirmatn →', OUT_DIR);
}

main();
