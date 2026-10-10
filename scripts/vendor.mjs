// Copies jsPDF and the IBM Plex fonts into web/vendor so the app works fully offline
// (Mac app, and the installed iPhone/iPad app without network).
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = p => join(root, 'node_modules', p);
const out = join(root, 'web/vendor');
mkdirSync(join(out, 'fonts'), { recursive: true });

const copy = (src, dst) => {
  if (!existsSync(src)) throw new Error('missing ' + src + ' – run npm install');
  copyFileSync(src, dst);
};
copy(nm('jspdf/dist/jspdf.umd.min.js'), join(out, 'jspdf.umd.min.js'));
const fonts = [
  ['ibm-plex-sans', [400, 500, 600]],
  ['ibm-plex-sans-condensed', [400, 500, 600]],
  ['ibm-plex-mono', [400, 500]],
];
for (const [fam, weights] of fonts)
  for (const w of weights)
    for (const sub of ['latin', 'latin-ext']) {
      const f = `${fam}-${sub}-${w}-normal.woff2`;
      copy(nm(`@fontsource/${fam}/files/${f}`), join(out, 'fonts', f));
    }
console.log('vendored jsPDF + fonts ->', out);
