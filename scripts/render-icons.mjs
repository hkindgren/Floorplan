// Renders design/icon-*.svg to the PNGs the web app needs, and design/icon-1024.png
// for the Mac app (then: npx tauri icon design/icon-1024.png). Run: node scripts/render-icons.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const svg = f => fs.readFileSync(new URL('../design/' + f, import.meta.url), 'utf8');
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage();
async function png(file, size, out) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(file).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  fs.writeFileSync(new URL('../' + out, import.meta.url), await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }));
  console.log(out);
}
await png('icon-mac.svg', 1024, 'design/icon-1024.png');
await png('icon-full.svg', 180, 'web/icons/apple-touch-icon.png');
await png('icon-full.svg', 192, 'web/icons/icon-192.png');
await png('icon-full.svg', 512, 'web/icons/icon-512.png');
await png('icon-full.svg', 512, 'web/icons/icon-maskable-512.png');
fs.copyFileSync(new URL('../design/icon-mac.svg', import.meta.url), new URL('../web/icons/icon.svg', import.meta.url));
await browser.close();
