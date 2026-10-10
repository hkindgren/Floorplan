// End-to-end tests of the web app (the same code the Mac app runs), in Chromium and – in CI –
// also WebKit, the Safari engine used on iPhone and iPad. BROWSER=webkit selects WebKit.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as pw from 'playwright-core';
import { start } from './server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const engine = process.env.BROWSER === 'webkit' ? pw.webkit : pw.chromium;
let srv, dist, browser, base, distBase;

before(async () => {
  execFileSync('node', ['scripts/build-web.mjs', 'tests/_dist'], { cwd: ROOT });
  srv = await start(path.join(ROOT, 'web'));
  dist = await start(path.join(ROOT, 'tests/_dist'));
  base = `http://127.0.0.1:${srv.address().port}/`;
  distBase = `http://127.0.0.1:${dist.address().port}/`;
  browser = await engine.launch(process.env.CHROME_PATH && engine === pw.chromium ? { executablePath: process.env.CHROME_PATH } : {});
});
after(async () => { await browser?.close(); srv?.close(); dist?.close(); });

async function open(opts = {}, url = base) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForSelector('#cv [data-id]');
  return { ctx, page, errors };
}
const items = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(document.querySelectorAll('#cv [data-id]').length)))));
const readDownload = async d => fs.readFileSync(await d.path());

test('starts with the example drawing and no errors', async () => {
  const { ctx, page, errors } = await open();
  assert.equal(await items(page), 11);
  assert.equal(await page.isVisible('#banner'), true);
  assert.equal(await page.evaluate(() => document.fonts.check('500 13px "IBM Plex Sans"')), true, 'bundled font');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('new drawing, add items, survives a reload', async () => {
  const { ctx, page, errors } = await open();
  await page.click('#newB');
  await page.fill('#nTitle', 'Studio Hörnet');
  await page.fill('#nW', '7,5');
  await page.fill('#nD', '5');
  await page.click('#nRect');
  assert.equal(await items(page), 0);
  await page.click('.tile[data-type="cam"]');
  await page.click('.tile[data-type="softbox"]');
  assert.equal(await items(page), 2);
  assert.match(await page.textContent('#pane'), /Ljus/);
  await page.reload();
  await page.waitForSelector('#cv [data-id]');
  assert.equal(await items(page), 2);
  assert.equal(await page.inputValue('#titleIn'), 'Studio Hörnet');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('save and open a project file, export PDF and PNG (computer browser: downloads)', async () => {
  const { ctx, page, errors } = await open();
  await page.fill('#titleIn', 'Porträtt');
  await page.press('#titleIn', 'Tab');
  let [dl] = await Promise.all([page.waitForEvent('download'), page.click('#saveB')]);
  assert.equal(dl.suggestedFilename(), 'portratt.floorplan');
  const saved = JSON.parse(await readDownload(dl));
  assert.equal(saved.app, 'floorplan');
  assert.equal(saved.items.length, 11);

  // open it again in a fresh drawing
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'floorplan-')), 'portratt.floorplan');
  saved.meta.title = 'Från fil';
  saved.items.pop();
  fs.writeFileSync(tmp, JSON.stringify(saved));
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#openB')]);
  await chooser.setFiles(tmp);
  await page.waitForFunction(() => document.querySelector('#titleIn').value === 'Från fil');
  assert.equal(await items(page), 10);
  assert.equal(await page.isVisible('#banner'), false, 'opened file is no longer the example');

  [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#pdfB')]);
  assert.equal(dl.suggestedFilename(), 'fran-fil.pdf');
  const pdf = await readDownload(dl);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 20000, 'PDF has the drawing');

  await page.click('[data-tab="proj"]');
  [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('[data-act="png"]')]);
  assert.equal(dl.suggestedFilename(), 'fran-fil.png');
  assert.ok((await readDownload(dl)).length > 5000);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Cmd/Ctrl+S saves and Cmd/Ctrl+O opens', async () => {
  const { ctx, page } = await open();
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press(mod + '+s')]);
  assert.match(dl.suggestedFilename(), /\.floorplan$/);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press(mod + '+o')]);
  assert.ok(chooser);
  await ctx.close();
});

// iPhone: touch, share sheet instead of downloads, long press for the menu.
const SHARE_STUB = () => {
  window.__shared = [];
  navigator.canShare = d => !!(d && d.files && d.files.length);
  navigator.share = async d => { window.__shared.push(...d.files.map(f => ({ name: f.name, size: f.size, type: f.type }))); };
};
const IPHONE = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };

test('iPhone: tap to add, share sheet for project and PDF, layout fits', async () => {
  const ctx = await browser.newContext({ ...IPHONE });
  await ctx.addInitScript(SHARE_STUB);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.waitForSelector('#cv [data-id]');
  const n = await items(page);
  await page.tap('.tile[data-type="bdish"]');
  assert.equal(await items(page), n + 1);
  // nothing wider than the screen
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scrolling');
  for (const id of ['#openB', '#saveB', '#pdfB']) {
    const b = await page.locator(id).boundingBox();
    assert.ok(b && b.x >= 0 && b.x + b.width <= 393 && b.height >= 38, id + ' is on screen and big enough to tap: ' + JSON.stringify(b));
  }
  assert.equal(await page.isVisible('#zoomIn'), false, 'pinch instead of zoom buttons');
  await page.tap('#saveB');
  await page.waitForFunction(() => window.__shared.length === 1);
  await page.tap('#pdfB');
  await page.waitForFunction(() => window.__shared.length === 2, null, { timeout: 30000 });
  const shared = await page.evaluate(() => window.__shared);
  assert.match(shared[0].name, /\.floorplan$/);
  assert.equal(shared[1].name.endsWith('.pdf'), true);
  assert.ok(shared[1].size > 20000);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('iPhone: long press on an item opens the menu instead of moving it', async () => {
  const ctx = await browser.newContext({ ...IPHONE });
  const page = await ctx.newPage();
  await page.goto(base);
  await page.waitForSelector('#cv [data-id]');
  const it = await page.evaluate(() => {
    const g = [...document.querySelectorAll('#cv [data-id]')].find(e => e.getBoundingClientRect().width > 20);
    const r = g.getBoundingClientRect();
    return { id: g.dataset.id, x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.evaluate(({ id, x, y }) => {
    const g = document.querySelector(`#cv [data-id="${id}"] .hit`) || document.querySelector(`#cv [data-id="${id}"]`);
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0 }));
  }, it);
  await page.waitForTimeout(800);
  assert.equal(await page.isVisible('.ctx'), true, 'menu after long press');
  await page.evaluate(() => document.getElementById('cv').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch' })));
  await page.tap('.ctx [data-c="dup"]');
  assert.equal(await items(page), 12, 'duplicated from the menu');
  await ctx.close();
});

test('installable web app: manifest, icons, works offline after the first visit', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(distBase + '?sw');
  await page.waitForSelector('#cv [data-id]');
  const man = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  assert.equal(man.display, 'standalone');
  for (const ic of [...man.icons.map(i => i.src), 'icons/apple-touch-icon.png']) {
    const ok = await page.evaluate(async u => (await fetch(u)).ok, ic);
    assert.ok(ok, ic);
  }
  if (engine === pw.chromium) {   // service worker offline check (WebKit's headless build has no SW offline mode)
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20000 })
      .catch(async () => { await page.reload(); await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 }); });
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('#cv [data-id]');
    assert.equal(await page.evaluate(() => typeof window.jspdf), 'object', 'PDF module available offline');
    await ctx.setOffline(false);
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});
