// Builds dist/ for hosting the web app (GitHub Pages): copies web/, and writes the offline
// file list and a content hash into sw.js so every deploy updates installed apps.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'web'), out = path.join(root, process.argv[2] || 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true });
const files = [];
(function walk(d) {
  for (const n of fs.readdirSync(d).sort()) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) walk(p); else files.push(path.relative(out, p).split(path.sep).join('/'));
  }
})(out);
const list = files.filter(f => f !== 'sw.js');
const hash = crypto.createHash('sha256');
for (const f of list) hash.update(f).update(fs.readFileSync(path.join(out, f)));
const version = hash.digest('hex').slice(0, 12);
const sw = path.join(out, 'sw.js');
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8')
  .replace('__VERSION__', version)
  .replace('__FILES__', JSON.stringify(['./', ...list])));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`dist ready: ${list.length} files, version ${version}`);
