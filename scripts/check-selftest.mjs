// Checks what the real app did during a SETPLAN_SELFTEST_DIR run (CI): opened the drawing,
// autosaved a change to the file, exported PDF and PNG, no errors in the web view.
import fs from 'node:fs';
import path from 'node:path';
const [dir, logFile] = process.argv.slice(2);
const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
const fail = m => {
  console.error('SELFTEST FAILED: ' + m + '\n--- app log ---\n' + log);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Self-test (${process.platform})::${m}`);
  process.exit(1);
};
const st = path.join(dir, 'selftest.json');
if (!fs.existsSync(st)) fail('the in-app self-test did not run (no selftest.json)');
const r = JSON.parse(fs.readFileSync(st, 'utf8'));
if (!r.ok) fail('in-app self-test: ' + (r.error || 'not ok') + ' after ' + r.steps.join(', '));
const plan = JSON.parse(fs.readFileSync(path.join(dir, 'test.setplan'), 'utf8'));
if (plan.items.length !== 4) fail('expected 4 items in the saved file, found ' + plan.items.length);
const pdf = path.join(dir, 'testritning-hornet.pdf'), png = path.join(dir, 'testritning-hornet.png');
if (!fs.existsSync(pdf) || !fs.readFileSync(pdf).subarray(0, 5).toString().startsWith('%PDF')) fail('PDF was not written');
if (!fs.existsSync(png) || fs.statSync(png).size < 5000) fail('PNG was not written');
if (/\[web error\]/.test(log)) fail('errors in the web view');
const ok = `selftest ok: ${r.steps.join(' → ')}, PDF ${Math.round(fs.statSync(pdf).size / 1024)} kB`;
console.log(ok);
if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Self-test (${process.platform})::${ok}`);
